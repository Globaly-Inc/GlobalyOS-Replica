
# Plan: Add Header to Team Chat Right Panel

## Overview
Add a header section to the Team Chat right side panel (`ChatRightPanelEnhanced.tsx`) that matches the Ask AI right panel design, with icons that adapt based on the chat type.

---

## Design Reference (Ask AI Right Panel)

```tsx
<div className="flex items-center gap-2 p-4 border-b">
  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
    <Sparkles className="h-4 w-4 text-primary" />
  </div>
  <div>
    <h3 className="font-semibold text-sm">Conversation Info</h3>
    <p className="text-xs text-muted-foreground">Details & pinned items</p>
  </div>
</div>
```

---

## Icon Mapping by Chat Type

| Chat Type | Icon | Gradient Color |
|-----------|------|----------------|
| Direct Message (1:1) | `MessageSquare` | `from-blue-500/20 to-blue-500/5` |
| Group Conversation | `Users` | `from-purple-500/20 to-purple-500/5` |
| Space | `Hash` (or custom space icon) | `from-primary/20 to-primary/5` |

---

## Implementation

### File: `src/components/chat/ChatRightPanelEnhanced.tsx`

**Add a new header section** after the mobile close button and before the MessageSearch panel (around line 536).

**New header JSX:**

```tsx
{/* Header - Matching Ask AI pattern */}
{!isMobileOverlay && (
  <div className="flex items-center gap-2 p-4 border-b flex-shrink-0">
    <div className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center",
      activeChat.type === 'space' 
        ? "bg-gradient-to-br from-primary/20 to-primary/5"
        : activeChat.isGroup
          ? "bg-gradient-to-br from-purple-500/20 to-purple-500/5"
          : "bg-gradient-to-br from-blue-500/20 to-blue-500/5"
    )}>
      {activeChat.type === 'space' ? (
        spaceIconUrl ? (
          <img src={spaceIconUrl} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <Hash className="h-4 w-4 text-primary" />
        )
      ) : activeChat.isGroup ? (
        <Users className="h-4 w-4 text-purple-600" />
      ) : (
        <MessageSquare className="h-4 w-4 text-blue-600" />
      )}
    </div>
    <div>
      <h3 className="font-semibold text-sm">Conversation Info</h3>
      <p className="text-xs text-muted-foreground">Details & pinned items</p>
    </div>
  </div>
)}
```

---

## Changes Summary

| File | Change |
|------|--------|
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Add `Hash` import from lucide-react, add header section matching Ask AI design with dynamic icon based on chat type |

---

## Visual Result

```text
┌────────────────────────────────────┐
│ [🔵] Conversation Info             │  ← DM: Blue gradient + MessageSquare
│      Details & pinned items        │
├────────────────────────────────────┤
│ ▼ About                            │
│   ...                              │
```

```text
┌────────────────────────────────────┐
│ [🟣] Conversation Info             │  ← Group: Purple gradient + Users
│      Details & pinned items        │
├────────────────────────────────────┤
```

```text
┌────────────────────────────────────┐
│ [#] Conversation Info              │  ← Space: Primary gradient + Hash (or icon)
│      Details & pinned items        │
├────────────────────────────────────┤
```

