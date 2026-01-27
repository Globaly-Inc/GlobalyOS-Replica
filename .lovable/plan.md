

# Plan: Make Conversation View Full Width (Hide Right Panel)

## Overview
Add a toggle to expand the conversation view to full width by hiding the right side panel. Users can switch between expanded and normal view.

---

## Changes Required

### 1. Add State in `Chat.tsx`
- Add a new state variable `isFullWidth` to control whether the right panel is visible
- This state will be toggled by a button in the ConversationView header

### 2. Update ConversationView Props
- Pass a new prop `isFullWidth` and `onToggleFullWidth` to ConversationView
- This allows the conversation view to display a toggle button and know its current state

### 3. Add Toggle Button in ConversationView Header
- Add an "Expand/Collapse" button in the header actions (desktop only)
- Use icons like `Maximize2`/`Minimize2` or `PanelRightClose`/`PanelRight` from lucide-react
- Tooltip: "Expand view" / "Show details panel"

### 4. Conditionally Hide Right Panel
- Modify the `showRightPanelCondition` in `Chat.tsx` to also check `!isFullWidth`
- When `isFullWidth` is true, the right panel (ChatRightPanelEnhanced or ThreadView) won't render
- The ConversationView with `flex-1` will automatically take the full remaining width

---

## Visual Layout

**Normal Mode:**
```text
┌──────────┬──────────────────────────┬────────┐
│ Sidebar  │   ConversationView       │ Right  │
│  (w-72)  │      (flex-1)            │ Panel  │
│          │                          │ (w-80) │
└──────────┴──────────────────────────┴────────┘
```

**Full Width Mode:**
```text
┌──────────┬───────────────────────────────────┐
│ Sidebar  │   ConversationView                │
│  (w-72)  │      (flex-1 = full remaining)    │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Chat.tsx` | Add `isFullWidth` state, update right panel condition, pass props to ConversationView |
| `src/components/chat/ConversationView.tsx` | Add optional `isFullWidth` and `onToggleFullWidth` props, add toggle button in header |

---

## Technical Details

### Chat.tsx Changes
- Add state: `const [isFullWidth, setIsFullWidth] = useState(false);`
- Update condition: `const showRightPanelCondition = activeChat && activeChat.type !== 'mentions' && activeChat.type !== 'starred' && !isMobile && !isFullWidth;`
- Pass to ConversationView: `isFullWidth={isFullWidth} onToggleFullWidth={() => setIsFullWidth(prev => !prev)}`

### ConversationView.tsx Changes
- Add to props interface: `isFullWidth?: boolean; onToggleFullWidth?: () => void;`
- Add button in desktop header actions area (around line 750+):
```tsx
{onToggleFullWidth && (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon" onClick={onToggleFullWidth}>
        {isFullWidth ? <PanelRight className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      {isFullWidth ? "Show details panel" : "Expand view"}
    </TooltipContent>
  </Tooltip>
)}
```

---

## User Experience
- Click the expand button → right panel hides, conversation takes full width
- Click again → right panel reappears
- State resets when switching chats (optional, can keep preference)
- Mobile is unaffected (already full width without right panel inline)

