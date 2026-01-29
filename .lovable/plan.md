

# Push Notification Banner Not Appearing - Root Cause & Fix

## Problem Identified

Based on your screenshots, I can confirm:
- The push notification IS being received by the Service Worker (logs show `[SW Push] Payload received`)
- The notification IS being created successfully (logs show `[SW Push] Notification shown successfully`)
- The notification DOES appear in macOS Notification Center (your screenshot shows it in the list)

**BUT** - No pop-up banner appears on screen.

---

## Root Cause: Static Notification Tags

The issue is that we're using a **static tag** (`test-notification`) combined with `renotify: true`. On macOS + Chrome:

1. When a notification with the same `tag` already exists in Notification Center
2. And a new notification arrives with the same `tag`
3. macOS **silently replaces** the existing notification instead of showing a new banner

This is why:
- First-ever notification might show a banner
- Subsequent notifications (same tag) silently update in Notification Center
- No new banner appears

---

## Solution

### Change 1: Use Unique Tags for Test Notifications

**File: `src/pages/Notifications.tsx`**

Update `sendTestNotification` to use a unique timestamp-based tag:

```typescript
// Current (line 57):
tag: "test-notification",

// Change to:
tag: `test-${Date.now()}`,
```

### Change 2: Add Diagnostic Logging After showNotification

**File: `src/sw.ts`**

After `showNotification` succeeds, query the active notifications to confirm creation:

```typescript
// After line 133, add:
.then(async () => {
  console.log('[SW Push] Notification shown successfully');
  // Diagnostic: count active notifications
  const activeNotifications = await self.registration.getNotifications();
  console.log(`[SW Push] Active notifications: ${activeNotifications.length}`, 
    activeNotifications.map(n => ({ tag: n.tag, title: n.title })));
})
```

### Change 3: Add Local Test Button (Bypasses Push Pipeline)

**File: `src/pages/Notifications.tsx`**

Add a "Show Local Test" button that calls `showNotification` directly without going through the push pipeline. This isolates whether the issue is push delivery vs. OS display:

```typescript
const showLocalTestNotification = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('Local Test', {
      body: 'This notification bypasses the push pipeline',
      icon: '/favicon.png',
      tag: `local-${Date.now()}`,
      requireInteraction: true,
    });
    toast.success("Local notification shown!");
  } catch (error) {
    console.error("Local notification error:", error);
    toast.error("Failed to show local notification");
  }
};
```

### Change 4: Remove Aggressive `renotify` for Non-Call Notifications

**File: `src/sw.ts`**

Only use `renotify: true` for calls (which need persistent alerting):

```typescript
// Current (line 109):
renotify: true,

// Change to:
renotify: isIncomingCall, // Only renotify for calls
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Notifications.tsx` | Unique tags + local test button |
| `src/sw.ts` | Diagnostic logging + fix renotify logic |

---

## Why This Will Work

1. **Unique tags** ensure each notification is treated as NEW by the OS
2. **`renotify: false`** prevents silent replacement behavior
3. **Diagnostic logging** will confirm how many notifications exist after creation
4. **Local test button** isolates push delivery from display issues

---

## Expected Results After Fix

1. Click "Send Test Notification" → Banner appears on screen
2. Console shows: `[SW Push] Active notifications: 1, [{tag: "test-1738...", title: "Test Notification"}]`
3. Click again → Another banner appears (different tag)
4. Notification Center shows multiple entries (not just one replaced one)

---

## If Banners Still Don't Appear After Fix

If the `getNotifications()` diagnostic confirms notifications are being created but banners never appear:

1. Check **macOS System Settings → Notifications → Chrome** 
2. Ensure alert style is set to **"Banners"** or **"Alerts"** (not "None")
3. Ensure "Allow notifications" is ON
4. Ensure "Show previews" is set to "Always" or "When Unlocked"

The diagnostic logging will give us definitive proof of what's happening.

