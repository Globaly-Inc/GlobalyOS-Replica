

# UI Cleanup: Streamlined Push Notification Card

## Requested Changes

1. **Put the card header (icon, title, description) in the same row as the controls**
2. **Move "Send Test Notification" button before the toggle switch** (both on the right side)
3. **Remove all content below the toggle row** (local test button, helper text, troubleshooting tips)

---

## Visual Implementation

```text
+-------------------------------------------------------------------------------------------+
| [Bell Icon]  Push Notifications                    [Send Test Notification]  [Toggle ON] |
|              Receive real-time notifications...                                           |
+-------------------------------------------------------------------------------------------+
```

**Single row layout:**
- **Left:** Icon + Title + Description (stacked)
- **Right:** Test button + Toggle switch (inline, with gap)

---

## Technical Changes

**File:** `src/pages/Notifications.tsx` (lines 370-456)

### What Changes:

1. **Restructure the card to one row** - Header and controls all in same flex container
2. **Add test button before the toggle** - Visible only when `isSubscribed`
3. **Remove the entire `{isSubscribed && (...)}` block** (lines 410-454):
   - Local test button
   - "Push Test: Via server..." text
   - Troubleshooting tips box
4. **Keep permission prompts** - Browser blocked/enable messages stay

### Resulting JSX Structure:

```jsx
<Card className="mb-4 sm:mb-6 border-primary/10">
  <CardContent className="p-4 sm:p-5">
    {/* Single row: Header left, Controls right */}
    <div className="flex items-center justify-between gap-3">
      {/* Left: Icon + Text */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-primary/10' : 'bg-muted'}`}>
          {isSubscribed ? (
            <BellRing className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm sm:text-base">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
            {isSubscribed 
              ? "Receive real-time notifications even when the app is closed" 
              : "Get notified instantly, even when you're not using the app"}
          </p>
        </div>
      </div>
      
      {/* Right: Test button (when subscribed) + Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestNotification}
            disabled={testingSend}
          >
            {testingSend ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bell className="h-4 w-4 mr-2" />
            )}
            {testingSend ? "Sending..." : "Send Test"}
          </Button>
        )}
        <Switch
          checked={isSubscribed}
          onCheckedChange={handlePushToggle}
          disabled={pushLoading}
        />
      </div>
    </div>
    
    {/* Permission prompts (kept, shown below) */}
    {!isSubscribed && permission !== 'denied' && (...)}
    {permission === 'denied' && (...)}
  </CardContent>
</Card>
```

---

## Summary of Deletions

| Element | Status |
|---------|--------|
| Local test button | **Remove** |
| "Push Test: Via server..." text | **Remove** |
| Troubleshooting tips box | **Remove** |
| Permission prompts | **Keep** |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Notifications.tsx` | Restructure push card to single-row layout, remove helper content |

