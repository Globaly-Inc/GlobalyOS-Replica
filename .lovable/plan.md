

# Push Notification Settings on Notifications Page

## Overview

Enhance the existing Push Notification section on the Notifications page with a dedicated settings card that provides better visibility, user guidance, and a test notification feature after enabling push notifications.

## Current State

The Notifications page already has a basic Push Notification toggle card (lines 326-352) that:
- Shows when push notifications are supported
- Allows enabling/disabling push notifications via a Switch
- Displays status (enabled/disabled)

However, it lacks:
- Visual distinction as a settings section
- "Send Test Notification" functionality
- Better explanation of what happens when enabled

## Solution

Enhance the existing Push Notification card to:
1. Add a "Send Test Notification" button that appears after push is enabled
2. Include clearer messaging about browser permission prompts
3. Send a sample push notification so users can see how it looks

## Technical Approach

### 1. Add Test Notification Function

**File: `src/pages/Notifications.tsx`**

Add a function to send a test push notification via the existing edge function:

```typescript
const sendTestNotification = async () => {
  if (!user) return;
  
  try {
    setTestingSend(true);
    const { error } = await supabase.functions.invoke("send-push-notification", {
      body: {
        user_id: user.id,
        title: "Test Notification",
        body: "This is how push notifications look in your browser. You're all set!",
        url: "/notifications",
        tag: "test-notification",
      },
    });
    
    if (error) throw error;
    toast.success("Test notification sent! Check your browser.");
  } catch (error) {
    console.error("Error sending test notification:", error);
    toast.error("Failed to send test notification");
  } finally {
    setTestingSend(false);
  }
};
```

### 2. Update Push Notification Card UI

Transform the existing card to be more informative with a "Send Test" button:

```text
+----------------------------------------------------------+
|  [BellRing]  Push Notifications                          |
|                                                          |
|  Receive real-time notifications even when the app is   |
|  closed. You'll be prompted to allow notifications.      |
|                                                          |
|  [=====ON=====]                                          |
|                                                          |
|  [Send Test Notification]                                |
|  See how notifications appear in your browser            |
+----------------------------------------------------------+
```

### 3. Enhanced States

| State | Display |
|-------|---------|
| Not Supported | Show message: "Push notifications not supported in this browser" |
| Not Subscribed | Show toggle OFF with hint about browser prompt |
| Subscribed | Show toggle ON + "Send Test Notification" button |
| Loading | Show loading spinner on toggle/button |
| Sending Test | Show loading on test button |

## Implementation Details

### State Additions

```typescript
const [testingSend, setTestingSend] = useState(false);
```

### Updated Card Structure

1. **Header**: Icon + Title ("Push Notifications")
2. **Description**: Explain what happens when enabled
3. **Toggle**: Enable/disable with loading state
4. **Test Button**: Only visible when subscribed, sends sample notification
5. **Status Badge**: Shows current permission status

### Browser Prompt Handling

When user clicks to enable:
1. `usePushNotifications.subscribe()` is called
2. Browser shows native permission prompt
3. If granted: subscription saved, toggle shows ON, test button appears
4. If denied: show error toast, toggle stays OFF

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Notifications.tsx` | Enhance Push Notification card with test functionality |

## User Experience Flow

1. User visits Notifications page
2. Sees "Push Notifications" settings card at the top
3. Toggle is OFF - user clicks to enable
4. Browser shows permission prompt: "Allow notifications from GlobalyOS?"
5. User clicks "Allow"
6. Toggle shows ON, "Send Test Notification" button appears
7. User clicks "Send Test Notification"
8. A push notification appears in their browser:
   - Title: "Test Notification"
   - Body: "This is how push notifications look in your browser. You're all set!"
9. User now knows push is working correctly

## Security Considerations

- Test notification only sends to the current authenticated user
- Uses existing `send-push-notification` edge function
- No sensitive data in test notification content

