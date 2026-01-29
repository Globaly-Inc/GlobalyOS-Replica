

# Push Notification Investigation: Root Cause Analysis & Resolution

## Summary

After thorough investigation as a senior software engineer, I've identified **two distinct issues** and their root causes.

---

## Issue 1: Push Notification Section Not Visible in Lovable Preview

### Root Cause: Service Worker Disabled in Development Mode

The PWA configuration in `vite.config.ts` has the service worker explicitly disabled for development:

```typescript
// Line 64-66 of vite.config.ts
devOptions: {
  enabled: false,  // SERVICE WORKER DISABLED IN DEV MODE
},
```

**Impact Chain:**
1. In Lovable preview (dev mode), no service worker registers
2. `navigator.serviceWorker.ready` never resolves
3. `usePushNotifications` hook sets `isSupported: false`
4. The conditional render `{isSupported && (...)}` at line 352 hides the Push Notification section entirely

**Why Sarah and Amit see it:** They are using the **production published URL** (https://globalyos.lovable.app) where the PWA is fully enabled.

### Solution

Enable the service worker in development mode:

```typescript
devOptions: {
  enabled: true,  // Enable for dev testing
},
```

---

## Issue 2: Test Notification Not Delivered

### Finding: Backend is Working Correctly

I tested the edge function directly and confirmed:

- **VAPID keys:** Properly configured in secrets
- **get-vapid-public-key:** Returns valid key
- **send-push-notification:** Successfully sends to FCM/APNs
- **Edge function logs:** "Successfully sent push to subscription..."
- **Response:** `{"sent": 4, "failed": 0, "success": true}`

### Why Notifications May Not Appear

| Reason | Explanation |
|--------|-------------|
| **Dev mode SW disabled** | Push events can only be received by an active service worker |
| **Browser tab focused** | Some browsers suppress notifications when app is in foreground |
| **Stale subscriptions** | Subscriptions in DB are from Dec 2025, may have expired |
| **Browser notification blocked** | User may have denied permission at browser level |

---

## Technical Architecture (Currently Correct)

```text
┌─────────────────┐     ┌──────────────────────────┐     ┌─────────────────┐
│  Notifications  │ --> │  usePushNotifications    │ --> │  Service Worker │
│  Page UI        │     │  Hook                    │     │  (sw.ts)        │
└─────────────────┘     └──────────────────────────┘     └─────────────────┘
         │                        │                              │
         │                        v                              │
         │              ┌──────────────────────┐                 │
         │              │ get-vapid-public-key │                 │
         │              │ Edge Function        │                 │
         │              └──────────────────────┘                 │
         │                                                       │
         v                                                       v
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│ send-push-notification          │ --> │ FCM / APNs Push Services        │
│ Edge Function                   │     │ (Google/Apple)                  │
└─────────────────────────────────┘     └─────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Enable Service Worker in Development

Update `vite.config.ts` to enable the service worker in dev mode:

```typescript
devOptions: {
  enabled: true,
  type: 'module',
  navigateFallback: 'index.html',
},
```

### Step 2: Add Subscription Cleanup

The database has stale subscriptions from December 2025. When push notifications fail with 410 (Gone) or 404 (Not Found), they should be cleaned up (this logic already exists in the edge function).

### Step 3: Add Debug Logging (Optional)

For troubleshooting, add console logs to the usePushNotifications hook to help diagnose future issues:

```typescript
const isSupported = () => {
  const supported = "serviceWorker" in navigator && "PushManager" in window;
  console.log('[Push] isSupported:', supported);
  return supported;
};
```

---

## Verification After Fix

1. **In Lovable Preview:**
   - Push Notification section should be visible
   - Toggle should enable/disable notifications
   - Test notification should trigger browser notification

2. **Test Procedure:**
   - Enable push notifications in preview
   - Click "Send Test Notification"
   - Notification should appear in browser (may need to unfocus the app window)

---

## Important Notes

### No Missing Integrations

All required integrations are properly configured:

- VAPID keys (public + private)
- Edge functions (get-vapid-public-key, send-push-notification)
- Service worker with push handlers (sw.ts)
- Database table with RLS (push_subscriptions)
- Frontend hook (usePushNotifications)

### Why Production Works

The production build at https://globalyos.lovable.app has the service worker properly bundled and registered, which is why push notifications work for Sarah and Amit when they access the published version.

