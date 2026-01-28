

# Enable Browser Push Notifications for Chat & System Notifications

## Overview

This plan implements fully functional browser push notifications for both:
1. **Chat notifications** - New DMs, space messages, mentions, reactions
2. **System notifications** - Leave approvals, kudos, reviews, check-in reminders

The existing infrastructure has VAPID keys configured and a subscription mechanism, but the actual push sending is incomplete. We need to upgrade the edge function to properly send Web Push messages using the `@negrel/webpush` Deno library.

---

## Current State Analysis

### What Already Works
- VAPID keys are configured (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY secrets exist)
- `usePushNotifications` hook handles browser subscription/unsubscription
- `push_subscriptions` table stores user endpoints, p256dh, and auth keys
- Service worker (`sw.ts`) has push event handlers for displaying notifications
- UI toggles exist in ChatSettingsDialog and Notifications page
- System notifications already call `send-push-notification` from Layout.tsx

### What's Missing
- **The edge function doesn't actually send push notifications** - it just logs and returns
- **Chat messages don't trigger push notifications** - only in-app sounds are played
- Need to implement proper Web Push encryption using `@negrel/webpush` library

---

## Implementation Plan

### Part 1: Upgrade send-push-notification Edge Function

**File:** `supabase/functions/send-push-notification/index.ts`

Replace the placeholder implementation with actual Web Push sending using the Deno-compatible `@negrel/webpush` library:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { 
  ApplicationServer, 
  importVapidKeys 
} from "https://raw.githubusercontent.com/negrel/webpush/master/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id, title, body, url, tag, data }: PushPayload = await req.json();

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subError || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize VAPID application server
    const vapidKeys = await importVapidKeys({
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    });
    
    const appServer = new ApplicationServer(
      { contactInformation: "mailto:support@globalyhub.com" },
      vapidKeys
    );

    const payload = JSON.stringify({
      title,
      body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      url: url || "/",
      tag: tag || "notification",
      data,
    });

    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const subscriber = appServer.subscribe({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        });

        await subscriber.pushTextMessage(payload, {});
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to endpoint ${sub.id}:`, err);
        failedEndpoints.push(sub.id);
        
        // Remove invalid subscriptions (410 Gone or 404 Not Found)
        if (err.message?.includes("410") || err.message?.includes("404")) {
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedEndpoints.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

### Part 2: Create send-chat-push-notification Edge Function

**File:** `supabase/functions/send-chat-push-notification/index.ts`

Create a dedicated function for chat push notifications that handles different message types:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatPushPayload {
  message_id: string;
  sender_employee_id: string;
  conversation_id?: string;
  space_id?: string;
  content: string;
  content_type: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { 
      message_id, 
      sender_employee_id, 
      conversation_id, 
      space_id, 
      content,
      content_type 
    }: ChatPushPayload = await req.json();

    // Get sender info
    const { data: sender } = await supabase
      .from("employees")
      .select("id, user_id, profiles:user_id(full_name, avatar_url)")
      .eq("id", sender_employee_id)
      .single();

    const senderName = sender?.profiles?.full_name || "Someone";

    // Determine recipients based on conversation or space
    let recipientUserIds: string[] = [];
    let chatName = "";
    let chatUrl = "";

    if (conversation_id) {
      // Get other participants in the conversation
      const { data: participants } = await supabase
        .from("chat_participants")
        .select("employees:employee_id(user_id)")
        .eq("conversation_id", conversation_id)
        .neq("employee_id", sender_employee_id);

      recipientUserIds = participants
        ?.map(p => p.employees?.user_id)
        .filter(Boolean) || [];

      // Check if muted for each recipient
      const { data: mutedData } = await supabase
        .from("chat_participants")
        .select("employee_id, is_muted, employees:employee_id(user_id)")
        .eq("conversation_id", conversation_id)
        .eq("is_muted", true);

      const mutedUserIds = new Set(
        mutedData?.map(m => m.employees?.user_id).filter(Boolean) || []
      );
      
      recipientUserIds = recipientUserIds.filter(id => !mutedUserIds.has(id));
      chatName = senderName;
      chatUrl = `/chat?conversation=${conversation_id}`;
    } else if (space_id) {
      // Get space members (excluding sender)
      const { data: space } = await supabase
        .from("chat_spaces")
        .select("name")
        .eq("id", space_id)
        .single();

      const { data: members } = await supabase
        .from("chat_space_members")
        .select("employee_id, notification_setting, employees:employee_id(user_id)")
        .eq("space_id", space_id)
        .neq("employee_id", sender_employee_id)
        .neq("notification_setting", "mute");

      recipientUserIds = members
        ?.map(m => m.employees?.user_id)
        .filter(Boolean) || [];

      chatName = space?.name || "Space";
      chatUrl = `/chat?space=${space_id}`;
    }

    if (recipientUserIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No recipients", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare notification content
    const title = conversation_id ? senderName : `${senderName} in ${chatName}`;
    let body = content;
    if (content_type === "file") {
      body = "Sent an attachment";
    } else if (content_type === "voice") {
      body = "Sent a voice message";
    } else if (content.length > 100) {
      body = content.substring(0, 97) + "...";
    }

    // Send push to each recipient
    let sentCount = 0;
    for (const userId of recipientUserIds) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: userId,
            title,
            body,
            url: chatUrl,
            tag: `chat-${conversation_id || space_id}`,
            data: {
              type: "chat_message",
              message_id,
              conversation_id,
              space_id,
            },
          },
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send push to user ${userId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-chat-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

### Part 3: Create Database Trigger for Chat Messages

Create a PostgreSQL trigger that calls the chat push notification function when new messages are inserted:

```sql
-- Function to call edge function for chat push
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  -- Build payload
  payload := jsonb_build_object(
    'message_id', NEW.id,
    'sender_employee_id', NEW.sender_id,
    'conversation_id', NEW.conversation_id,
    'space_id', NEW.space_id,
    'content', NEW.content,
    'content_type', NEW.content_type
  );

  -- Call edge function asynchronously via pg_net
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-chat-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_chat_message_insert ON chat_messages;
CREATE TRIGGER on_chat_message_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_chat_message();
```

**Note:** If `pg_net` extension is not enabled, we'll use an alternative approach with Supabase Realtime webhooks or call the function from the client side.

---

### Part 4: Alternative - Client-Side Chat Push Trigger

If database triggers with HTTP calls aren't available, add push notification calls from the message send flow:

**File:** `src/services/useChat.ts`

Update `useSendMessage` to trigger push notifications after sending:

```typescript
// After successful message insert
if (message) {
  // Trigger push notification (fire and forget)
  supabase.functions.invoke("send-chat-push-notification", {
    body: {
      message_id: message.id,
      sender_employee_id: currentEmployee.id,
      conversation_id: conversationId || undefined,
      space_id: spaceId || undefined,
      content: content,
      content_type: contentType,
    },
  }).catch(err => console.error("Push notification error:", err));
}
```

---

### Part 5: Update Service Worker for Better Chat Notifications

**File:** `src/sw.ts`

Enhance push handler to support chat-specific notification handling:

```typescript
self.addEventListener('push', (event) => {
  let data = {
    title: 'GlobalyOS Notification',
    body: 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    url: '/',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }

  const isChatMessage = data.data?.type === 'chat_message';
  const isIncomingCall = data.data?.type === 'incoming_call';

  const options: NotificationOptions = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: isIncomingCall ? [300, 100, 300, 100, 300] : [100, 50, 100],
    data: {
      ...data.data,
      url: data.url,
      dateOfArrival: Date.now(),
    },
    tag: data.tag,
    renotify: true,
    silent: false,
    requireInteraction: isIncomingCall,
  };

  // Add reply action for chat messages (if supported)
  if (isChatMessage && 'actions' in Notification.prototype) {
    options.actions = [
      { action: 'reply', title: 'Reply' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  }

  if (isIncomingCall) {
    options.actions = [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});
```

---

### Part 6: Update supabase/config.toml

Add the new edge function configuration:

```toml
[functions.send-chat-push-notification]
verify_jwt = false
```

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `supabase/functions/send-push-notification/index.ts` | Modify | Implement actual Web Push sending with @negrel/webpush |
| `supabase/functions/send-chat-push-notification/index.ts` | Create | New function for chat-specific push notifications |
| `supabase/config.toml` | Modify | Add config for new edge function |
| `src/services/useChat.ts` | Modify | Add push notification trigger after sending messages |
| `src/sw.ts` | Modify | Enhance push handler for chat message actions |

---

## Technical Notes

- **Library Choice**: Using `@negrel/webpush` as it's Deno-native and handles RFC 8291/8292 encryption
- **Mute Handling**: Push notifications respect both conversation mute (`is_muted`) and space notification settings (`notification_setting`)
- **Subscription Cleanup**: Invalid/expired endpoints are automatically removed from `push_subscriptions`
- **Security**: Edge functions use service role key; no user data exposed in client
- **Backward Compatible**: Existing in-app notification sounds continue to work alongside push

