
# Convert Chat Search from Command Palette to Inline Dropdown

## Overview

Transform the search from a modal/command palette pattern back to an inline dropdown that appears directly below the search input. This provides a more immediate, contextual search experience without covering the main content.

## Key Changes

### 1. Remove Keyboard Shortcut
- Remove the `Cmd/Ctrl + K` global keyboard shortcut listener
- Remove the keyboard hint (`⌘K`) from the search trigger

### 2. Convert to Inline Dropdown Pattern
- Replace `CommandDialog` (modal) with inline `Command` component wrapped in a `Popover`
- Search input becomes a real input field (not just a trigger button)
- Results dropdown appears directly below the input using Popover portal
- Click outside or Escape closes the dropdown

### 3. Reorder Results
New order (as requested):
1. **Members** - Start DM with team members (online status visible)
2. **Groups** - Group conversations and DMs
3. **Spaces** - Team spaces/channels  
4. **Messages** - Search through message content

### 4. UI/UX Improvements

**Missing Features to Add:**
- **Highlight matching text** in search results for better scanability
- **Recent searches** section when dropdown opens (before typing)
- **Quick actions hint** at top of dropdown ("Start typing to search...")
- **Clear search button** (X) when query exists
- **Result count indicator** per category
- **Escape to close** dropdown
- **Focus management** - Auto-focus input when dropdown opens

**Design Improvements:**
- Compact result items for dropdown context
- Sticky category headers as you scroll
- Subtle hover states with keyboard navigation support
- Loading skeleton for better perceived performance

---

## Technical Implementation

### File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/chat/GlobalChatSearch.tsx` | Modify | Complete rewrite to dropdown pattern |

### New Component Structure

```text
+------------------------------------------+
| [🔍] Search messages, people, spaces...  |
+------------------------------------------+
         ↓ (Popover dropdown)
+------------------------------------------+
|  MEMBERS (3)                             |
|  +--------------------------------------+|
|  | [Avatar🟢] Sarah Smith               ||
|  |            Product Manager           ||
|  +--------------------------------------+|
|  | [Avatar] John Doe                    ||
|  |          Engineer                    ||
|  +--------------------------------------+|
|                                          |
|  GROUPS (2)                              |
|  +--------------------------------------+|
|  | [👥] Marketing Team                  ||
|  |      5 members                       ||
|  +--------------------------------------+|
|                                          |
|  SPACES (1)                              |
|  +--------------------------------------+|
|  | [#] All GlobalyOS                    ||
|  |     Company-wide                     ||
|  +--------------------------------------+|
|                                          |
|  MESSAGES (4)                            |
|  +--------------------------------------+|
|  | [💬] "...meeting tomorrow at 3pm..." ||
|  |      Sarah · Jan 15                  ||
|  +--------------------------------------+|
+------------------------------------------+
| ↑↓ Navigate · ↵ Select · Esc Close       |
+------------------------------------------+
```

### Key Technical Details

1. **Popover for Dropdown**: Uses Radix Popover to render dropdown via portal, avoiding overflow clipping issues

2. **cmdk for Keyboard Nav**: Keep using `Command` component (not `CommandDialog`) for built-in arrow key navigation

3. **Focus Trap**: Ensure focus stays in dropdown when open, returns to input on close

4. **Debounced Search**: Keep existing 300ms debounce for search queries

5. **Result Ordering**: Display in order: member → conversation → space → message

---

## Empty States

**Before Typing:**
```text
+------------------------------------------+
| Start typing to search members, groups,  |
| spaces, and messages...                  |
+------------------------------------------+
```

**No Results:**
```text
+------------------------------------------+
| [🔍]                                     |
| No results for "xyz"                     |
| Try a different search term              |
+------------------------------------------+
```

---

## Interaction Flow

1. User clicks search input → Dropdown opens with initial state
2. User types → Results filter in real-time (debounced)
3. Arrow keys navigate results → Enter selects highlighted item
4. Click result OR Enter → Navigate to that chat/start DM
5. Click outside OR Escape → Close dropdown, clear search
6. Clear button (X) → Clear query, keep dropdown open

---

## Benefits Over Modal Pattern

- **Less disruptive** - Content remains visible behind dropdown
- **Faster access** - No modal animation, immediate results
- **More contextual** - Feels integrated with sidebar
- **Mobile-friendly** - Dropdown patterns work better on touch devices
