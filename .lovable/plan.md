
# Layout Update for Unread, Mentions, and Starred Pages

## Current State Analysis

The wireframes show a consistent layout pattern for these special views:
- **Header Row**: A dedicated top bar spanning the main content area with title + subtitle (matching ChatHeader style)
- **Content Area**: The scrollable message list below

Currently, each view (UnreadView, MentionsView, StarredView) has its header embedded inside the component. The proposed layout shows the header should be separate and positioned at the same level as ChatHeader for regular conversations.

---

## Proposed Changes

### Approach: Create a Unified Special View Header

Create a new `SpecialViewHeader` component that renders the appropriate header for Unread, Mentions, and Starred views, matching the ChatHeader styling (semi-transparent, backdrop blur, border).

---

## Implementation Steps

### 1. Create SpecialViewHeader Component
**File:** `src/components/chat/SpecialViewHeader.tsx` (new)

A simple header component that displays:
- Icon (MessageCircle for Unread, AtSign for Mentions, Bookmark for Starred)
- Title (bold)
- Subtitle

Styled to match ChatHeader: `px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-md`

```text
+----------------------------------------------------------+
|  [Icon]  **Title**                                        |
|          Subtitle text                                    |
+----------------------------------------------------------+
```

### 2. Update Chat.tsx Desktop Layout

Modify the desktop view to render `SpecialViewHeader` for these special views:

```typescript
{/* Top Bar - Spans full width above conversation + right panel */}
{activeChat && activeChat.type !== 'mentions' && activeChat.type !== 'starred' && activeChat.type !== 'unread' && (
  <ChatHeader activeChat={activeChat} />
)}
{activeChat && (activeChat.type === 'mentions' || activeChat.type === 'starred' || activeChat.type === 'unread') && (
  <SpecialViewHeader type={activeChat.type} />
)}
```

### 3. Update UnreadView, MentionsView, StarredView

Remove the embedded header from each component (keeping only the scrollable content area). The header will now come from `SpecialViewHeader` at the Chat.tsx level.

**For each view:**
- Remove the header div (lines containing icon, title, subtitle)
- Keep only the ScrollArea with content
- Mobile: Keep the back button in the component for mobile navigation

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/chat/SpecialViewHeader.tsx` | Create | New header component for special views |
| `src/pages/Chat.tsx` | Modify | Add SpecialViewHeader for mentions/starred/unread |
| `src/components/chat/UnreadView.tsx` | Modify | Remove embedded header (desktop), keep for mobile |
| `src/components/chat/MentionsView.tsx` | Modify | Remove embedded header (desktop), keep for mobile |
| `src/components/chat/StarredView.tsx` | Modify | Remove embedded header (desktop), keep for mobile |

---

## Technical Details

### SpecialViewHeader Component Structure

```typescript
interface SpecialViewHeaderProps {
  type: 'unread' | 'mentions' | 'starred';
}

const SpecialViewHeader = ({ type }: SpecialViewHeaderProps) => {
  const config = {
    unread: {
      icon: MessageCircle,
      title: 'Unread',
      subtitle: 'Messages you haven\'t read yet',
      iconBg: 'bg-destructive/10',
      iconColor: 'text-destructive'
    },
    mentions: {
      icon: AtSign,
      title: 'Mentions',
      subtitle: 'Messages where you were mentioned',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary'
    },
    starred: {
      icon: Bookmark,
      title: 'Starred',
      subtitle: 'Your bookmarked messages',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500'
    }
  };

  const { icon: Icon, title, subtitle, iconBg, iconColor } = config[type];

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-md flex-shrink-0">
      <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg", iconBg, iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold text-foreground text-base">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
};
```

### View Component Updates

Each view will conditionally render the header only on mobile:

```typescript
// In UnreadView, MentionsView, StarredView
return (
  <div className="flex flex-col h-full bg-card">
    {/* Header - only show on mobile */}
    {isMobile && (
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className={cn("flex items-center justify-center h-10 w-10 rounded-lg", iconBg, iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    )}

    {/* Content */}
    <ScrollArea className="flex-1">
      {/* ... message list ... */}
    </ScrollArea>
  </div>
);
```

---

## Visual Result

**Desktop Layout:**
```text
+-------------------+-----------------------------------------------+
| Settings          |  [Icon] **Unread**                            |
| & New Chat        |          Messages you haven't read yet        |
+-------------------+-----------------------------------------------+
|                   |                                               |
|   Left Side       |                                               |
|   Panel           |            Content Area                       |
|   (ChatSidebar)   |         (Scrollable messages)                 |
|                   |                                               |
+-------------------+-----------------------------------------------+
```

**Mobile Layout:** (unchanged - keeps embedded header with back button)

---

## Benefits

1. **Consistent Layout**: Header position matches regular conversation views
2. **Visual Hierarchy**: Clear separation between header and content
3. **Reusable**: Single header component for all special views
4. **Mobile Preserved**: Mobile navigation with back button still works
