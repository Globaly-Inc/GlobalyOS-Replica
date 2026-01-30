
# Remove Page-Level Keyboard Shortcuts

## Summary
Remove keyboard shortcuts used for page-level actions (navigation, quick actions) while preserving shortcuts that are appropriate for:
- Rich text editors (Cmd+B, Cmd+I, etc.)
- Modal/lightbox navigation (arrow keys when modal is open)
- Autocomplete/dropdown navigation (part of input flow)
- Standard Tab navigation between fields

---

## Files to Modify

### 1. Remove Leave Approvals Keyboard Navigation
**File**: `src/components/PendingLeaveApprovals.tsx`

**Current behavior**: j/k for up/down, A/Enter for approve, R for reject, Escape to clear focus

**Changes**:
- Remove the `handleKeyDown` function (lines 104-131)
- Remove the `useEffect` that registers the keyboard listener (lines 133-137)
- Remove the `useEffect` for focusing cards (lines 139-144)
- Remove `focusedIndex` state and `cardRefs` ref
- Update card rendering to remove focus styling based on `focusedIndex`

---

### 2. Remove Notifications Keyboard Navigation
**File**: `src/pages/Notifications.tsx`

**Current behavior**: j/k for up/down, Enter to click, M to mark as read, Escape to clear focus

**Changes**:
- Remove the `handleKeyDown` function (lines 291-317)
- Remove the `useEffect` that registers the keyboard listener (lines 319-325)
- Remove the `useEffect` for scrolling focused notification into view (lines 327-333)
- Remove `focusedIndex` state and `notificationRefs` ref
- Remove keyboard icon import (`Keyboard`)
- Update notification card rendering to remove focus styling

---

### 3. Remove Chat Keyboard Shortcuts Hook
**File**: `src/hooks/useChatKeyboardShortcuts.ts`

**Current behavior**: 
- Cmd+K: Quick Switcher
- Cmd+Shift+K: Search  
- Cmd+N: New Message
- Cmd+Shift+M: Mentions

**Changes**:
- Delete the entire file (no longer needed)

**Also update**:
- `src/pages/Chat.tsx`: Remove import and usage of `useChatKeyboardShortcuts`

---

### 4. Remove Wiki Keyboard Shortcuts Hook
**File**: `src/hooks/useWikiKeyboardShortcuts.tsx`

**Current behavior**:
- Cmd+S: Save page
- Cmd+N: New page
- Escape: Close/cancel

**Changes**:
- Delete the entire file

**Also update**:
- Search for any components using this hook and remove the import/usage

---

### 5. Remove Global Search Shortcut from Layout
**File**: `src/components/Layout.tsx`

**Current behavior**: Cmd+K opens global search

**Changes**:
- Remove the `useEffect` block (lines 54-65) that listens for Cmd+K

---

### 6. Remove Sidebar Toggle Shortcut
**File**: `src/components/ui/sidebar.tsx`

**Current behavior**: Cmd+B toggles sidebar

**Changes**:
- Remove the `useEffect` block (lines 78-89) that listens for Cmd+B
- Remove the `SIDEBAR_KEYBOARD_SHORTCUT` constant if it exists

---

## Files to KEEP Unchanged

These keyboard shortcuts are acceptable per user requirements:

| File | Shortcut | Reason |
|------|----------|--------|
| `WikiRichEditor.tsx` | Cmd+B/I/U, Tab in code blocks, etc. | Rich text editor - expected behavior |
| `BlogRichEditor.tsx` | Cmd+B/I/U, etc. | Rich text editor - expected behavior |
| `ImageLightbox.tsx` | Arrow keys, Escape | Modal navigation when open |
| `WikiFilePreview.tsx` | Arrow keys, Escape | Modal navigation when open |
| `MentionAutocomplete.tsx` | Arrow keys, Enter, Tab | Part of input field flow (autocomplete) |
| `QuickSwitcher.tsx` | Arrow keys, Enter | Part of search dropdown navigation |
| `EditableField.tsx` | Enter to save | Input field behavior |
| `ChatHeader.tsx` | Enter to save, Escape to cancel | Inline editing behavior |
| All input `onKeyDown` handlers | Enter, Escape, Tab | Standard input field behavior |

---

## Implementation Order

1. Remove `useChatKeyboardShortcuts.ts` hook and update `Chat.tsx`
2. Remove `useWikiKeyboardShortcuts.tsx` hook and search for usages
3. Remove keyboard navigation from `PendingLeaveApprovals.tsx`
4. Remove keyboard navigation from `Notifications.tsx`
5. Remove Cmd+K from `Layout.tsx`
6. Remove Cmd+B from `sidebar.tsx`

---

## Technical Details

### PendingLeaveApprovals.tsx Changes

```text
Remove:
- Line 99: const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
- Lines 104-137: handleKeyDown and listener useEffect
- Lines 139-144: Focus card useEffect
- focusedIndex state variable
- Any JSX referencing focusedIndex for styling/focus

Keep:
- All dialog handling
- All approval/reject/cancel logic
- Real-time subscription
```

### Notifications.tsx Changes

```text
Remove:
- Line 14: Keyboard icon import
- Line 45-46: focusedIndex state and notificationRefs
- Lines 290-333: handleKeyDown, listener effect, scroll effect

Keep:
- All notification fetching
- All tab handling
- All pagination
- Push notification toggle
```

### Layout.tsx Changes

```text
Remove lines 54-65:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setGlobalSearchOpen(true);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### sidebar.tsx Changes

```text
Remove lines 78-89:
React.useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      toggleSidebar();
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [toggleSidebar]);

Also remove SIDEBAR_KEYBOARD_SHORTCUT constant if present.
```

---

## Expected Outcome

After implementation:
- No page-level keyboard shortcuts for actions
- Tab navigation between form fields continues to work (browser default)
- Rich text editors retain their formatting shortcuts (Cmd+B, Cmd+I, etc.)
- Modal/lightbox navigation with arrow keys remains functional
- Autocomplete dropdown navigation with arrow keys remains functional
- Input field Enter/Escape handlers remain functional

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Remove keyboard hooks | Low | Hooks are standalone, easy to remove |
| Remove PendingLeaveApprovals shortcuts | Low | Core functionality unchanged |
| Remove Notifications shortcuts | Low | Core functionality unchanged |
| Remove Layout Cmd+K | Low | Search still accessible via button |
| Remove sidebar Cmd+B | Low | Sidebar toggle still works via button |
