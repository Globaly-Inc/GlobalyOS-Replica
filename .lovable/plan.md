
## Plan: Apply Ask AI UI Pattern to Team Chat (Items 1, 4, 5)

### Overview

This plan implements the Ask AI visual style for three specific components in Team Chat:
1. **ConversationView Header** - Simplified header with right-aligned action icons
4. **ChatRightPanelEnhanced** - Already has collapsible sections, needs minor styling updates
5. **ChatEmptyState** - Personalized greeting with suggestion cards

---

### Item 1: ConversationView Header Redesign

**File:** `src/components/chat/ConversationView.tsx`

**Current State (Lines 607-739):**
- Complex header with avatar, name, position, status indicator
- Multiple conditional layouts for DM/Group/Space
- Mobile: Info button and More menu button
- Desktop: Empty action area (search was removed)

**New Design:**
```text
Desktop:
+------------------------------------------------------------------+
| [Avatar] # Chat Name                      [🔔] [⭐] [🔍]         |
|          (subtitle)                                               |
+------------------------------------------------------------------+

Mobile:
+------------------------------------------------------------------+
| [←] [Avatar] Chat Name              [ℹ️] [⋮]                     |
+------------------------------------------------------------------+
```

**Changes Required:**

1. **Add New Imports** (around line 27):
   - Import `Star` from lucide-react
   - Import `useChatFavorites`, `useToggleFavorite` from `@/hooks/useChatFavorites`

2. **Add Favorites Hook** (around line 155):
   ```typescript
   const { data: favorites = [] } = useChatFavorites();
   const toggleFavorite = useToggleFavorite();
   ```

3. **Add Computed isFavorited** (around line 210):
   ```typescript
   const isFavorited = favorites.some(f => 
     (conversationId && f.conversation_id === conversationId) || 
     (spaceId && f.space_id === spaceId)
   );
   ```

4. **Replace Desktop Action Area** (lines 736-738):
   Add three action buttons with tooltips:
   - **Mute Button**: Bell/BellOff based on mute state
   - **Favorite Button**: Star with orange fill when favorited
   - **Search Button**: Toggle showSearch state with accent background when active

**Desktop Action Buttons:**
```typescript
{!isMobile && (
  <div className="flex items-center gap-0.5">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
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

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => toggleFavorite.mutate({
            conversationId: conversationId || undefined,
            spaceId: spaceId || undefined,
          })}
        >
          <Star className={cn("h-4 w-4", isFavorited && "fill-orange-500 text-orange-500")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      </TooltipContent>
    </Tooltip>

    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9", showSearch && "bg-accent")}
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Search messages</TooltipContent>
    </Tooltip>
  </div>
)}
```

---

### Item 4: ChatRightPanelEnhanced - Minor Styling Updates

**File:** `src/components/chat/ChatRightPanelEnhanced.tsx`

**Current State:**
- Already has collapsible sections (About, Members, Pinned, Files)
- Header already updated with Mute, Favorite, Search actions
- Already uses Chevron icons for collapse/expand

**Changes Required (Match Ask AI Right Panel Style):**

1. **Update Header Style** (lines 523-617):
   - Add subtle header styling with icon and description
   - Update to match Ask AI "Conversation Info / Details & members" pattern

**New Header Structure:**
```typescript
{/* Header */}
<div className="flex items-center gap-2 p-4 border-b">
  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
    <MessageSquare className="h-4 w-4 text-primary" />
  </div>
  <div>
    <h3 className="font-semibold text-sm">{activeChat.name}</h3>
    <p className="text-xs text-muted-foreground">
      {activeChat.type === 'space' 
        ? `${memberCount} members` 
        : activeChat.isGroup 
        ? 'Group chat' 
        : 'Direct message'}
    </p>
  </div>
</div>

{/* Action buttons row - below header */}
<div className="flex items-center justify-end gap-0.5 px-4 py-2 border-b">
  {/* Mute, Favorite, Search buttons */}
</div>
```

2. **Update Section Triggers** (lines 640-708, 712-824, 827-874, 876-950):
   - Use `ChevronUp`/`ChevronDown` toggle pattern like Ask AI
   - Ensure consistent border styling between sections

3. **Add ChevronUp Import**:
   ```typescript
   import { ChevronUp } from "lucide-react";
   ```

4. **Update CollapsibleTrigger Pattern**:
   ```typescript
   <CollapsibleTrigger asChild>
     <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
       <h4 className="text-sm font-medium flex items-center gap-2">
         <Icon className="h-4 w-4 text-muted-foreground" />
         Section Name
         {count > 0 && (
           <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
             {count}
           </Badge>
         )}
       </h4>
       {isOpen ? (
         <ChevronUp className="h-4 w-4 text-muted-foreground" />
       ) : (
         <ChevronDown className="h-4 w-4 text-muted-foreground" />
       )}
     </button>
   </CollapsibleTrigger>
   ```

5. **Add Border Separators Between Sections**:
   - Add `<div className="border-t" />` between each Collapsible section

---

### Item 5: ChatEmptyState Redesign

**File:** `src/components/chat/ChatEmptyState.tsx`

**Current State:**
- Simple centered layout with MessageSquare icon
- "Welcome to Team Chat" heading
- Two action buttons (Start a chat, Create a space)
- Three feature cards below

**New Design (Ask AI Style):**
```text
+------------------------------------------------------------------+
|                                                                  |
|                    [Org Logo with overlay]                       |
|                    💬                                            |
|                                                                  |
|              Hi [FirstName]! Welcome to Team Chat                |
|       Connect with your team in real-time...                     |
|                                                                  |
|   +----------------+  +----------------+  +----------------+     |
|   | [👤] Start a   |  | [#] Create a  |  | [💬] Send a    |     |
|   | direct message |  | new space     |  | group message  |     |
|   +----------------+  +----------------+  +----------------+     |
|                                                                  |
|   +----------------+  +----------------+  +----------------+     |
|   | [📢] Post      |  | [📎] Share    |  | [🔍] Search    |     |
|   | announcement   |  | a file        |  | messages       |     |
|   +----------------+  +----------------+  +----------------+     |
|                                                                  |
|   [DMs] [Groups] [Spaces] [Mentions] [Files] [Threads]          |
|                                                                  |
|   Connect with your team members through messages and spaces.    |
+------------------------------------------------------------------+
```

**New Implementation:**

```typescript
import { useMemo } from "react";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useOrganization } from "@/hooks/useOrganization";
import {
  MessageSquare,
  Users,
  Hash,
  Sparkles,
  Building2,
  AtSign,
  FileText,
  MessagesSquare,
  Megaphone,
  Paperclip,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatEmptyStateProps {
  onNewChat: () => void;
  onNewSpace: () => void;
}

const suggestions = [
  {
    icon: Users,
    text: "Start a direct message",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    action: "chat",
  },
  {
    icon: Hash,
    text: "Create a new space",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    action: "space",
  },
  {
    icon: MessagesSquare,
    text: "Send a group message",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    action: "chat",
  },
  {
    icon: Megaphone,
    text: "Post an announcement",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-500/10",
    action: "space",
  },
  {
    icon: Paperclip,
    text: "Share a file",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    action: "chat",
  },
  {
    icon: Search,
    text: "Search messages",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
    action: "chat",
  },
];

const ChatEmptyState = ({ onNewChat, onNewSpace }: ChatEmptyStateProps) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const firstName = currentEmployee?.profiles?.full_name?.split(' ')[0] || '';

  const handleSuggestionClick = (action: string) => {
    if (action === 'space') {
      onNewSpace();
    } else {
      onNewChat();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      {/* Logo with overlay */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg">
          {currentOrg?.logo_url ? (
            <img 
              src={currentOrg.logo_url} 
              alt={currentOrg.name} 
              className="w-12 h-12 rounded-lg object-contain" 
            />
          ) : (
            <Building2 className="w-10 h-10 text-primary" />
          )}
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
      </div>

      {/* Personalized greeting */}
      <h1 className="text-2xl font-bold text-center mb-2">
        Hi{firstName ? ` ${firstName}` : ''}! Welcome to Team Chat
      </h1>
      <p className="text-muted-foreground text-center mb-1">
        Connect with your team in real-time
      </p>
      {currentOrg && (
        <p className="text-xs text-muted-foreground mb-8">
          Part of {currentOrg.name}
        </p>
      )}

      {/* Suggestion cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={index}
              variant="outline"
              onClick={() => handleSuggestionClick(suggestion.action)}
              className="h-auto p-4 flex items-start gap-3 text-left justify-start hover:border-primary/30 hover:bg-primary/5 transition-all group"
            >
              <div className={`shrink-0 w-8 h-8 rounded-lg ${suggestion.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-4 h-4 ${suggestion.color}`} />
              </div>
              <span className="text-sm font-normal leading-snug">
                {suggestion.text}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Capability badges */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {["DMs", "Groups", "Spaces", "Mentions", "Files", "Threads"].map((cap) => (
          <span 
            key={cap} 
            className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground"
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-4 text-center max-w-md">
        Connect with your team members through direct messages, group chats, and topic-based spaces.
      </p>
    </div>
  );
};

export default ChatEmptyState;
```

---

### Summary of Changes

| File | Changes |
|------|---------|
| `ConversationView.tsx` | Add Star import, useChatFavorites hook, isFavorited computed value, add 3 desktop action buttons (Mute, Favorite, Search) with tooltips |
| `ChatRightPanelEnhanced.tsx` | Update header with icon/description pattern, add ChevronUp import, update section triggers to use up/down chevron toggle, add border separators between sections |
| `ChatEmptyState.tsx` | Complete rewrite with org logo, personalized greeting, 6 suggestion cards in grid, capability badges, and help text |

---

### Dependencies

No new packages required. All components use existing:
- `@/hooks/useChatFavorites`
- `@/services/useCurrentEmployee`
- `@/hooks/useOrganization`
- Radix UI Collapsible, Tooltip
- lucide-react icons

---

### Visual Consistency

Following Ask AI patterns:
- Gradient icon containers
- Orange fill for favorites
- Hover transitions on cards
- Rounded-2xl containers
- Muted capability badges
- Personalized greetings with user's first name
- Organization branding integration
