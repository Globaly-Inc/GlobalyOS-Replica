

# Add Edit Icon on Hover After Auto Sync Tag

## Overview

Add an edit (pencil) icon that appears on hover next to the "Auto Sync" tag in the chat header. When clicked by a space admin, it opens the Space Settings Dialog allowing them to edit access settings.

## Current State

The "Auto Sync" tag is displayed as a badge at lines 762-767 in `ChatHeader.tsx`:
```tsx
{space?.auto_sync_members && (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
    <RefreshCw className="h-2.5 w-2.5" />
    Auto Sync
  </span>
)}
```

## Implementation

### File: `src/components/chat/ChatHeader.tsx`

| Change | Location | Description |
|--------|----------|-------------|
| Import SpaceSettingsDialog | Line ~37 | Add import statement |
| Add state variable | Line ~89 | `showSettingsDialog` state |
| Wrap badge in hover group | Lines 762-767 | Add hover interaction |
| Add edit icon | Inside badge | Pencil icon with opacity transition |
| Add SpaceSettingsDialog | End of return | Render the dialog |

### Detailed Changes

**1. Add import (after line 37):**
```tsx
import SpaceSettingsDialog from "./SpaceSettingsDialog";
```

**2. Add state (after line 89):**
```tsx
const [showSettingsDialog, setShowSettingsDialog] = useState(false);
```

**3. Replace Auto Sync badge (lines 762-767):**

Before:
```tsx
{space?.auto_sync_members && (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
    <RefreshCw className="h-2.5 w-2.5" />
    Auto Sync
  </span>
)}
```

After:
```tsx
{space?.auto_sync_members && (
  <span 
    className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium group/sync",
      isSpaceAdmin && "cursor-pointer hover:bg-muted/80 transition-colors"
    )}
    onClick={isSpaceAdmin ? () => setShowSettingsDialog(true) : undefined}
  >
    <RefreshCw className="h-2.5 w-2.5" />
    Auto Sync
    {isSpaceAdmin && (
      <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/sync:opacity-100 transition-opacity" />
    )}
  </span>
)}
```

**4. Add SpaceSettingsDialog at end of component (before closing fragment):**
```tsx
{spaceId && (
  <SpaceSettingsDialog
    open={showSettingsDialog}
    onOpenChange={setShowSettingsDialog}
    spaceId={spaceId}
  />
)}
```

## UX Details

- **Hover effect**: The pencil icon fades in when hovering over the Auto Sync tag
- **Admin only**: Non-admins see the tag without the edit icon and without hover effects
- **Click action**: Opens the full Space Settings Dialog where admins can modify access scope, auto-sync settings, and other space configuration
- **Visual consistency**: Uses the same `Pencil` icon and opacity transition pattern already used for the space name edit feature

## Result

| User Type | Behavior |
|-----------|----------|
| Space Admin | Sees pencil icon on hover, can click to edit settings |
| Member | Sees tag without edit capability |
| Non-member | Does not see the space |

