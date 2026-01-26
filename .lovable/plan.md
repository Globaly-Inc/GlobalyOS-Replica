

## Plan: Redesign Right Panel Header - Full Width with Mute, Favorite, Search Actions Only

### Overview

This plan redesigns the header of the right chat panel (`ChatRightPanelEnhanced.tsx`). The goal is to create a full-width header containing only the chat name and three primary action icons: **Mute**, **Favorite**, and **Search**. The existing avatar, status indicator, and the "more actions" (3-dot) icon will be removed.

---

### Current State (Lines 509-714)

The current header displays:
- **Avatar** with online status indicator (for DMs) or space icon (for spaces)
- **Chat name** and subtitle (position/member count)
- **Favorite star** button
- **Two separate 3-dot dropdown menus** (one for spaces, one for conversations)
- **Close button** (mobile overlay only)

---

### Proposed New Design

```text
+----------------------------------------------------------+
| [←] (mobile)   # Chat Name        [🔔] [⭐] [🔍] [X](mobile)|
|                (subtitle)                                 |
+----------------------------------------------------------+
| [Search Panel - shown when search is active]             |
+----------------------------------------------------------+
```

The header will be minimal with:
- **Left side**: Mobile back button (if overlay) + Chat name with subtitle
- **Right side**: 3 action buttons only - Mute, Favorite, Search + mobile close button
- **Below header**: MessageSearch panel (conditionally shown)

---

### Implementation Details

**File:** `src/components/chat/ChatRightPanelEnhanced.tsx`

#### 1. Add New Imports

Add to existing imports:
```typescript
import { Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import MessageSearch from "./MessageSearch";
```

#### 2. Add Search State

Add around line 141:
```typescript
const [showSearch, setShowSearch] = useState(false);
```

#### 3. Replace Header Section (Lines 509-714)

**Remove:**
- Avatar and online status indicator (lines 511-563)
- Position subtitle from header (shown in About section instead)
- Both 3-dot dropdown menus (lines 590-706)

**Keep:**
- Chat name display with # prefix for spaces
- Member count/type subtitle
- Mobile back and close buttons

**Add:**
- Mute action button with tooltip
- Favorite action button with tooltip (using orange color per project convention)
- Search action button with tooltip

**New Header Structure:**
```typescript
{/* Header */}
<div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
  {/* Left: Back button (mobile) + Title */}
  <div className="flex items-center gap-2 flex-1 min-w-0">
    {isMobileOverlay && (
      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
    )}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        {activeChat.type === 'space' && <span className="text-muted-foreground">#</span>}
        <h2 className="font-semibold text-foreground truncate text-sm">{activeChat.name}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        {activeChat.type === 'space' 
          ? `${memberCount} members` 
          : activeChat.isGroup 
          ? 'Group' 
          : 'Direct message'}
      </p>
    </div>
  </div>
  
  {/* Right: Action buttons - Mute, Favorite, Search */}
  <div className="flex items-center gap-0.5">
    {/* Mute Button */}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={activeChat.type === 'space' ? handleToggleSpaceMute : handleToggleMute}
        >
          {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted) ? (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted)
          ? 'Unmute notifications'
          : 'Mute notifications'}
      </TooltipContent>
    </Tooltip>

    {/* Favorite Button */}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => toggleFavorite.mutate({
            conversationId: conversationId || undefined,
            spaceId: spaceId || undefined,
          })}
        >
          <Star className={cn(
            "h-4 w-4",
            isFavorited && "fill-orange-500 text-orange-500"
          )} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      </TooltipContent>
    </Tooltip>

    {/* Search Button */}
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", showSearch && "bg-accent")}
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Search messages</TooltipContent>
    </Tooltip>
    
    {/* Close button for mobile only */}
    {isMobileOverlay && (
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
</div>

{/* Message Search Panel */}
<MessageSearch
  conversationId={conversationId}
  spaceId={spaceId}
  isOpen={showSearch}
  onClose={() => setShowSearch(false)}
  onResultClick={(messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary');
      }, 2000);
    }
    setShowSearch(false);
  }}
/>
```

#### 4. Remove Unused Imports

After removing the dropdown menus:
```typescript
// Remove from imports
MoreVertical
```

Note: Keep `DropdownMenu` and related imports as they are still used in the Members section for managing space members.

#### 5. Move Space Icon Functionality

The space icon upload capability (lines 524-554) needs to be preserved but moved:
- Keep the hidden file input for space icon upload
- Move the camera overlay trigger to the About section instead of header avatar

---

### Summary of Changes

| Element | Current State | New State |
|---------|--------------|-----------|
| Avatar with status | Shown in header | **Removed** |
| Chat name | Shown with position | Shown with type subtitle |
| Favorite star | Yellow fill | **Orange fill** (per project convention) |
| Mute action | In dropdown menu | **Primary action button** |
| Search action | Not available | **New primary action button** |
| 3-dot dropdown (spaces) | Full menu with all actions | **Removed** |
| 3-dot dropdown (conversations) | Mute + Leave options | **Removed** |
| MessageSearch panel | Not present | **Added below header** |
| Space icon upload | In header avatar | Moved to About section |

---

### UX Improvements

1. **Cleaner Header**: Only essential info and actions, no redundant profile data
2. **Quick Actions**: Mute, Favorite, Search immediately accessible as icon buttons
3. **Tooltips**: Each action has a tooltip explaining what it does
4. **Visual Feedback**:
   - Mute: Shows `BellOff` when muted with muted-foreground color
   - Favorite: Orange fill when favorited (consistent with project conventions)
   - Search: Background accent color when search is open
5. **Search UX**: Clicking a search result scrolls to message with temporary highlight ring

---

### Important Notes

1. **Leave/Settings actions**: These were only in the dropdown menus. After removal, users can:
   - Leave space/conversation: Already available elsewhere (will need alternative access if required)
   - Space settings: Still accessible via settings dialog trigger in members section

2. **Space icon upload**: Will be moved to the About section where space admins can click to change the icon

3. **ConversationView.tsx**: **NO CHANGES** - stays exactly as is per user requirement

---

### Files to be Modified

| File | Changes |
|------|---------|
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Add Search icon import, Tooltip imports, MessageSearch import, add `showSearch` state, replace header with new simplified design, add MessageSearch panel, remove dropdown menus from header |

