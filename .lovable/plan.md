

## Remove "HISTORY IS ON" and Add Space Feature Suggestions

### What's Being Changed

The empty state for Spaces currently shows a confusing "HISTORY IS ON" message (which doesn't correspond to any actual feature). This will be replaced with helpful suggestions showing what users can do in their new Space.

---

### Current vs New Design

**Before:**
- Generic "Welcome to your new space!" message
- "HISTORY IS ON" badge with History icon
- "Messages sent with history on are saved" text

**After:**
- Welcoming header with space name
- Grid of 4 feature suggestions with icons:
  1. **Send a message** - Start the conversation with your team
  2. **Share files** - Attach documents, images, and more
  3. **Mention teammates** - Use @name to notify specific people  
  4. **Start a thread** - Reply to messages to keep discussions organized

---

### Technical Implementation

#### File: `src/components/chat/ConversationView.tsx`

**1. Add new icon imports:**
```typescript
import {
  // ... existing imports
  MessageSquare,
  Paperclip,
  AtSign,
  MessagesSquare,
} from "lucide-react";
```

**2. Replace lines 756-773** (the Space empty state section):

Remove:
```tsx
<div className="flex items-center gap-1 mt-4 text-sm text-muted-foreground">
  <History className="h-4 w-4" />
  <span>HISTORY IS ON</span>
</div>
<p className="text-xs text-muted-foreground mt-1">
  Messages sent with history on are saved
</p>
```

Replace with a feature suggestions grid (same pattern as `ChatEmptyState.tsx`):
```tsx
{/* Space feature suggestions */}
<div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-sm">
  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 text-sm">
    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
    <span className="text-muted-foreground">Send a message</span>
  </div>
  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-sm">
    <Paperclip className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
    <span className="text-muted-foreground">Share files</span>
  </div>
  <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-500/10 text-sm">
    <AtSign className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
    <span className="text-muted-foreground">Mention teammates</span>
  </div>
  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-sm">
    <MessagesSquare className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
    <span className="text-muted-foreground">Start a thread</span>
  </div>
</div>
```

---

### Visual Result

The empty Space view will now show:

```text
        ┌─────────┐
        │    G    │  ← Space icon/initial
        └─────────┘
      General Space
Welcome to your new space!
   Start the conversation.

┌──────────────────┬──────────────────┐
│ 💬 Send a        │ 📎 Share files   │
│    message       │                  │
├──────────────────┼──────────────────┤
│ @ Mention        │ 💬 Start a       │
│   teammates      │    thread        │
└──────────────────┴──────────────────┘
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/chat/ConversationView.tsx` | Add 4 new icon imports; replace lines 767-773 with feature suggestion grid |

---

### Notes

- The same visual style (colored backgrounds, icon + text) is used as in `ChatEmptyState.tsx` for consistency
- The 2x2 grid works well on both mobile and desktop
- No interactive elements needed - these are informational hints, not action buttons
- The `History` icon import can be removed since it's no longer used (cleanup)

