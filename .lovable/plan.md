# Plan: Chat Layout Restructure - Header Spans Full Width

## Status: ✅ COMPLETED

## Overview
Restructured the desktop chat layout so the header (top bar) spans across both the conversation panel and the right side panel.

---

## Layout Achieved

```text
┌─────────┬─────────────────────────────────────────────┐
│         │            Top Bar (ChatHeader)             │
│  Left   ├────────────────────────────────┬────────────┤
│  Side   │                                │   Right    │
│  Panel  │   Conversation Panel           │   Side     │
│         │   (messages area)              │   Panel    │
│         ├────────────────────────────────┤            │
│         │   Composer                     │            │
└─────────┴────────────────────────────────┴────────────┘
```

---

## Changes Made

### 1. Created `src/components/chat/ChatHeader.tsx`
New standalone header component that renders at Chat.tsx level for desktop, containing:
- Avatar + Name + Status (DM, Group, or Space)
- Action buttons: Mute, Favorite, Search
- MessageSearch integration
- EditGroupChatDialog for group chats

### 2. Modified `src/pages/Chat.tsx`
- Removed `isFullWidth` state (no longer needed)
- Added ChatHeader import
- Restructured desktop layout:
  - Main content column with ChatHeader at top
  - Content row below with ConversationView + Right Panel side by side

### 3. Modified `src/components/chat/ConversationView.tsx`
- Removed `isFullWidth` and `onToggleFullWidth` props
- Removed `PanelRight`, `PanelRightClose`, `Star` imports
- Removed `useChatFavorites`, `useToggleFavorite` hooks (moved to ChatHeader)
- Removed `Tooltip` imports (no longer used)
- Header now only renders on mobile (`isMobile` conditional)
- MessageSearch only renders on mobile

---

## Benefits
- Cleaner separation of concerns
- Header spans full width above conversation + right panel
- Simpler codebase with less state management
- Mobile header behavior preserved
