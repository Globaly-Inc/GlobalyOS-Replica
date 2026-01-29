
# Improving Push Notification Latency (3-5 seconds → Sub-second)

## Current Architecture Analysis

Your push notification system has **two parallel paths** that both contribute to the 3-5 second delay:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CURRENT FLOW (Chat Messages)                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. User sends message → DB INSERT → useSendMessage.onSettled                   │
│                             │                                                   │
│                             ▼                                                   │
│  2. Client calls edge function "send-chat-push-notification"                    │
│                             │                                                   │
│                             ▼ (1-2s cold start possible)                        │
│  3. Edge function queries DB for recipients, sender info                        │
│                             │                                                   │
│                             ▼                                                   │
│  4. For EACH recipient: calls "send-push-notification" sequentially             │
│                             │                                                   │
│                             ▼ (1-2s cold start possible)                        │
│  5. send-push-notification: converts VAPID keys, queries subscriptions          │
│                             │                                                   │
│                             ▼                                                   │
│  6. Sends to push service → Browser receives                                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  CURRENT FLOW (System Notifications)                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Notification INSERT → trigger_push_notification() (DB trigger)              │
│                             │                                                   │
│                             ▼                                                   │
│  2. pg_net.http_post → edge function "send-push-notification"                   │
│                             │                                                   │
│                             ▼ (1-2s cold start possible)                        │
│  3. Edge function processes and sends push                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Root Causes of Delay

| Source | Delay | Description |
|--------|-------|-------------|
| **Edge function cold start** | 1-2s | First invocation after idle requires container spin-up |
| **Sequential recipient loop** | 0.5-1s per recipient | Chat function calls send-push serially for each user |
| **VAPID key conversion** | 100-200ms | Cryptographic key conversion on every single request |
| **DB queries per request** | 100-300ms | Fetching sender info, org slug, participants, subscriptions |
| **Realtime to client** | ~100ms | Supabase postgres_changes propagation (already optimized) |

---

## Optimization Strategy

### Phase 1: Eliminate Cold Starts (Biggest Impact)

**Keep edge functions warm** by adding a scheduled ping:

```sql
-- Cron job to ping edge functions every 5 minutes
SELECT cron.schedule(
  'keep-push-functions-warm',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rygowmzkvxgnxagqlyxf.supabase.co/functions/v1/send-push-notification',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"warmup": true}'::jsonb
  );
  $$
);
```

Add early return in edge functions for warmup pings:
```typescript
// In send-push-notification/index.ts
const body = await req.json();
if (body.warmup) {
  return new Response(JSON.stringify({ status: "warm" }), { 
    headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}
```

**Expected improvement: 1-2 seconds saved per notification**

---

### Phase 2: Cache VAPID Keys (Removes 100-200ms per request)

Currently, VAPID keys are converted from base64 to JWK format **on every request**. Cache this:

```typescript
// send-push-notification/index.ts

// Module-level cache (persists across requests in warm container)
let cachedAppServer: webpush.ApplicationServer | null = null;

async function getAppServer() {
  if (cachedAppServer) return cachedAppServer;
  
  const jwkKeys = await convertVapidKeysToJwk(
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!
  );
  const vapidKeys = await webpush.importVapidKeys(jwkKeys, { extractable: false });
  cachedAppServer = await webpush.ApplicationServer.new({
    contactInformation: "mailto:support@globalyhub.com",
    vapidKeys,
  });
  return cachedAppServer;
}
```

---

### Phase 3: Parallelize Recipient Processing (Removes 0.5-1s per recipient)

In `send-chat-push-notification`, change the sequential loop to parallel:

```typescript
// BEFORE: Sequential (slow)
for (const userId of recipientUserIds) {
  await supabase.functions.invoke("send-push-notification", {...});
}

// AFTER: Parallel (fast)
await Promise.allSettled(
  recipientUserIds.map(userId => 
    supabase.functions.invoke("send-push-notification", {
      body: { user_id: userId, title, body, url: chatUrl, ... }
    })
  )
);
```

---

### Phase 4: Combine Into Single Edge Function (Advanced)

For chat notifications, eliminate the nested function call entirely:

```typescript
// send-chat-push-notification/index.ts
// Instead of calling send-push-notification for each user,
// directly call webpush for all recipients in parallel

const appServer = await getAppServer(); // Cached

// Fetch all subscriptions for all recipients in ONE query
const { data: allSubscriptions } = await supabase
  .from("push_subscriptions")
  .select("id, user_id, endpoint, p256dh, auth")
  .in("user_id", recipientUserIds);

// Send all pushes in parallel
await Promise.allSettled(
  allSubscriptions.map(sub => {
    const subscriber = appServer.subscribe({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth }
    });
    return subscriber.pushTextMessage(payload, {});
  })
);
```

---

## Implementation Summary

| File | Changes |
|------|---------|
| **New migration** | Add cron job to keep functions warm |
| `supabase/functions/send-push-notification/index.ts` | Add warmup handler + cache VAPID keys at module level |
| `supabase/functions/send-chat-push-notification/index.ts` | Parallelize recipients OR inline push sending |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Cold start delay | 1-2s | 0s (always warm) |
| VAPID conversion | 100-200ms per call | 0ms (cached) |
| Multi-recipient chat | N × 500ms | 500ms total (parallel) |
| **Total latency** | **3-5 seconds** | **200-500ms** |

---

## Technical Notes

- The realtime subscription in `useChatRealtime.ts` already uses delta updates for instant UI changes - this is well-optimized
- System notifications use a DB trigger with `pg_net.http_post` which is asynchronous and doesn't block the INSERT
- The warmup cron job costs ~$0.01/month in function invocations but eliminates the most frustrating delay source
