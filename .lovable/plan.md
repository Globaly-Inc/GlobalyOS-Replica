
# Push Notification Not Appearing in Browser: Root Cause & Fix

## Executive Summary

The backend is working correctly (logs show "2 sent, 0 failed" with FCM returning 201 success). The issue is in the **Service Worker's push event handler** - it lacks proper error handling and notification permission verification, causing silent failures when displaying notifications.

---

## Root Cause Analysis

### Finding 1: Missing Error Handling in Push Event Handler

The current `src/sw.ts` push handler has two problems:

```typescript
// Current code - Line 108-110
event.waitUntil(
  self.registration.showNotification(data.title, options)  // ❌ No error handling!
);
```

**Issues:**
1. If `showNotification()` fails (permission issue, invalid options), the error is swallowed
2. No logging of the actual notification data received - impossible to debug
3. No verification that Notification permission is still "granted" before showing

### Finding 2: Missing Debug Logging

When the push arrives, there's no visibility into:
- What payload was received from FCM
- Whether the JSON parsing succeeded
- Whether `showNotification` was actually called

### Finding 3: Chrome OS-Level Settings

Even with website permission granted, Chrome respects OS-level notification settings:
- macOS: System Preferences → Notifications → Chrome must be enabled
- Windows: Settings → System → Notifications → Chrome must be enabled
- Chrome must also have notification permissions in `chrome://settings/content/notifications`

---

## Solution: Enhanced Service Worker with Debug Logging

### Changes to `src/sw.ts`

```typescript
// Push notification handlers
self.addEventListener('push', (event) => {
  console.log('[SW Push] Event received');
  
  // Verify notification permission first
  if (Notification.permission !== 'granted') {
    console.warn('[SW Push] Notification permission not granted:', Notification.permission);
    return;
  }

  let data: {
    title: string;
    body: string;
    icon: string;
    badge: string;
    url: string;
    tag: string;
    data?: Record<string, unknown>;
    requireInteraction?: boolean;
  } = {
    title: 'GlobalyOS Notification',
    body: 'You have a new notification',
    icon: '/favicon.png',
    badge: '/favicon.png',
    url: '/',
    tag: 'default',
  };

  // Parse push data
  if (event.data) {
    try {
      const payload = event.data.json();
      console.log('[SW Push] Payload received:', JSON.stringify(payload));
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW Push] Error parsing push data:', e);
      // Try text fallback
      try {
        const text = event.data.text();
        console.log('[SW Push] Raw text:', text);
        data.body = text;
      } catch (textError) {
        console.error('[SW Push] Error getting text:', textError);
      }
    }
  } else {
    console.warn('[SW Push] No data in push event');
  }

  // Build notification options
  const isIncomingCall = data.data?.type === 'incoming_call';
  const isChatMessage = data.data?.type === 'chat_message';

  const options: NotificationOptions & { 
    vibrate?: number[]; 
    renotify?: boolean; 
    actions?: Array<{ action: string; title: string }> 
  } = {
    body: data.body,
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    vibrate: isIncomingCall ? [300, 100, 300, 100, 300, 100, 300] : [100, 50, 100],
    data: {
      ...data.data,
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    tag: data.tag || 'default',
    renotify: true,
    silent: false,
    requireInteraction: isIncomingCall || data.requireInteraction,
  };

  // Add action buttons for specific types
  if (isIncomingCall) {
    options.actions = [
      { action: 'answer', title: 'Answer' },
      { action: 'decline', title: 'Decline' },
    ];
  } else if (isChatMessage) {
    options.actions = [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  }

  console.log('[SW Push] Showing notification:', data.title, options);

  // Show notification with error handling
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('[SW Push] Notification shown successfully');
      })
      .catch((error) => {
        console.error('[SW Push] Failed to show notification:', error);
      })
  );
});
```

---

## Additional UI Improvement: Browser Settings Helper

Add a helper in the Push Notification section to help users verify their settings:

```typescript
// In Notifications.tsx - Add below the permission denied message
{isSubscribed && (
  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-2">
    💡 <strong>Not seeing notifications?</strong> Check that:
    <ul className="list-disc ml-4 mt-1 space-y-0.5">
      <li>Chrome notifications are enabled in your OS settings</li>
      <li>GlobalyOS isn't muted in Chrome's notification settings</li>
      <li>Do Not Disturb mode is off</li>
    </ul>
  </p>
)}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/sw.ts` | Add comprehensive logging, permission check, and error handling |
| `src/pages/Notifications.tsx` | Add troubleshooting helper text for subscribed users |

---

## Verification Steps After Fix

1. Open Chrome DevTools → Application → Service Workers
2. Click "Update" to reload the service worker
3. Open Console tab (or enable "Preserve log")
4. Click "Send Test Notification"
5. Look for `[SW Push]` logs - they will show:
   - Whether the push event was received
   - What payload was parsed
   - Whether `showNotification` succeeded or failed

---

## Troubleshooting Matrix

If logs show the event was received but notification still doesn't appear:

| Log Output | Issue | Solution |
|-----------|-------|----------|
| "Notification permission not granted" | Browser permission revoked | Re-enable via toggle |
| "Payload received: ..." but no notification | OS-level blocking | Check macOS/Windows notification settings for Chrome |
| "Failed to show notification: ..." | Invalid options | Check error message for details |
| No "[SW Push]" logs at all | Service worker not receiving push | Clear site data, re-subscribe |

---

## Why This Will Work

The enhanced logging will immediately reveal:
1. Whether pushes are arriving at the Service Worker
2. What data FCM is delivering
3. Whether Chrome is successfully displaying the notification

Currently, the backend logs show success ("2 sent, 0 failed") but we have zero visibility into what happens after FCM delivers the push to Chrome. This fix adds that visibility.
