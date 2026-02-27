
## Remove Call and Video Buttons from Chat Header

### Change
Remove the Sendbird Calls buttons (audio call and video call icons) from the chat header action bar.

### File
**`src/components/chat/ChatHeader.tsx`** (lines 793-799)

Delete the `CallButtons` block:
```tsx
{/* Call buttons - feature-flagged */}
{isCallsEnabled && (
  <CallButtons
    otherEmployeeId={...}
    isGroup={...}
  />
)}
```

Also remove the unused `CallButtons` import and the `isCallsEnabled` variable if it's no longer used elsewhere in the file.

### What stays
The other action buttons (search, pin, etc.) in the header remain untouched. The `CallButtons` component file itself is kept in case it's used elsewhere.
