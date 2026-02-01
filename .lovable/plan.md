

# Shared Profile Stack Component

## Summary
Create a reusable `ProfileStack` component in `src/components/ui/` that consolidates the stacked avatar pattern currently duplicated across 6 different files. This component will handle avatar stacking, overflow counting, popover with full list, and optional profile linking.

---

## Current State (Code Duplication)

| Location | Use Case | Avatar Size | Max Visible | Has Popover |
|----------|----------|-------------|-------------|-------------|
| `PostReactions.tsx` | Reaction users | h-5 w-5 | 6 | Yes |
| `PostCardCompact.tsx` | Tagged members | h-5 w-5 | 5 | Yes |
| `CommentReactions.tsx` | Reaction users | h-4 w-4 | 4 | Yes |
| `MessageReactions.tsx` | Reaction users | h-4 w-4 | 5 | Yes |
| `KpiOwnersDisplay.tsx` | KPI owners | h-8 w-8 | 3 | No |
| `TeamMemberProfile.tsx` | Direct reports | h-6 w-6 | 5 | Yes |

Each implementation has ~50-80 lines of nearly identical code for avatars, spacing, overflow indicators, and popovers.

---

## Proposed Solution

### New Component: `ProfileStack`

**Location:** `src/components/ui/ProfileStack.tsx`

**Features:**
- Configurable avatar sizes: `xs`, `sm`, `md`, `lg`
- Configurable max visible count (default: 5)
- Optional popover with full user list
- Optional profile linking via `OrgLink`
- Mobile-responsive (count-only on mobile, avatars on desktop)
- Highlight current user option
- Custom header for popover

---

## Component Interface

```typescript
interface ProfileStackUser {
  id: string;
  name: string;
  avatar: string | null;
}

interface ProfileStackProps {
  users: ProfileStackUser[];
  
  // Display options
  maxVisible?: number;           // Default: 5
  size?: 'xs' | 'sm' | 'md' | 'lg';  // xs=h-4, sm=h-5, md=h-6, lg=h-8
  
  // Behavior options
  showPopover?: boolean;         // Default: true
  linkToProfile?: boolean;       // Default: false (uses OrgLink)
  highlightUserId?: string;      // Highlight current user with ring
  
  // Popover customization
  popoverHeader?: React.ReactNode;
  popoverTitle?: string;         // e.g., "5 reactions", "3 tagged"
  
  // Mobile behavior
  mobileShowCount?: boolean;     // Default: true (show +N on mobile)
  
  // Styling
  className?: string;
}
```

---

## Visual Structure

```text
Desktop View:
┌───────────────────────────────────────┐
│ [Av1][Av2][Av3][Av4][Av5] +3          │
│  ↑ Stacked with -space-x  ↑ Overflow  │
└───────────────────────────────────────┘

Mobile View:
┌───────────────────────────────────────┐
│ +8                                    │
│  ↑ Count only                         │
└───────────────────────────────────────┘

Popover (on click):
┌─────────────────────────┐
│ 👥 8 members            │
├─────────────────────────┤
│ [Av] John Smith         │
│ [Av] Jane Doe           │
│ [Av] Bob Wilson         │
│ ...scrollable...        │
└─────────────────────────┘
```

---

## Implementation Plan

### Step 1: Create `ProfileStack.tsx` Component

**File:** `src/components/ui/ProfileStack.tsx`

Core functionality:
- Accept array of users with `id`, `name`, `avatar`
- Render stacked avatars with configurable sizing
- Handle overflow with `+N` indicator
- Optional popover showing full list with `ScrollArea`
- Optional `OrgLink` wrapping for profile navigation
- Current user highlighting with ring

### Step 2: Update Existing Components

Replace duplicated code in these files:

| File | Changes |
|------|---------|
| `src/components/feed/PostReactions.tsx` | Replace stacked avatar + popover (~40 lines) |
| `src/components/feed/PostCardCompact.tsx` | Replace tagged members section (~50 lines) |
| `src/components/feed/CommentReactions.tsx` | Replace stacked avatar + popover (~40 lines) |
| `src/components/chat/MessageReactions.tsx` | Replace stacked avatar + popover (~40 lines) |
| `src/components/kpi/KpiOwnersDisplay.tsx` | Replace stacked avatar section (~25 lines) |
| `src/pages/TeamMemberProfile.tsx` | Replace direct reports section (~30 lines) |

### Step 3: Usage Examples

**PostReactions (reactions with current user highlight):**
```tsx
<ProfileStack
  users={users}
  size="sm"
  maxVisible={6}
  highlightUserId={currentEmployee?.id}
  popoverHeader={<span className="text-lg">{emoji}</span>}
  popoverTitle={`${users.length} reaction${users.length !== 1 ? 's' : ''}`}
/>
```

**TeamMemberProfile (direct reports with profile links):**
```tsx
<ProfileStack
  users={directReports.map(r => ({
    id: r.id,
    name: r.profiles.full_name,
    avatar: r.profiles.avatar_url,
  }))}
  size="md"
  maxVisible={5}
  linkToProfile
  popoverTitle={`All Direct Reports (${directReports.length})`}
/>
```

**KpiOwnersDisplay (no popover, larger avatars):**
```tsx
<ProfileStack
  users={owners.map(o => ({
    id: o.employee_id,
    name: o.full_name,
    avatar: o.avatar_url,
  }))}
  size="lg"
  maxVisible={3}
  showPopover={false}
/>
```

---

## Size Mapping

| Size | Avatar Class | Fallback Text | Border |
|------|--------------|---------------|--------|
| `xs` | h-4 w-4 | text-[6px] | border |
| `sm` | h-5 w-5 | text-[8px] | border-2 |
| `md` | h-6 w-6 | text-xs | border-2 |
| `lg` | h-8 w-8 | text-xs | border-2 |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/ProfileStack.tsx` | Create | New shared component |
| `src/components/feed/PostReactions.tsx` | Modify | Use ProfileStack |
| `src/components/feed/PostCardCompact.tsx` | Modify | Use ProfileStack |
| `src/components/feed/CommentReactions.tsx` | Modify | Use ProfileStack |
| `src/components/chat/MessageReactions.tsx` | Modify | Use ProfileStack |
| `src/components/kpi/KpiOwnersDisplay.tsx` | Modify | Use ProfileStack |
| `src/pages/TeamMemberProfile.tsx` | Modify | Use ProfileStack |

---

## Technical Details

### Dependencies Used
- `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
- `Popover`, `PopoverContent`, `PopoverTrigger` from `@/components/ui/popover`
- `ScrollArea` from `@/components/ui/scroll-area`
- `OrgLink` from `@/components/OrgLink`
- `cn` utility from `@/lib/utils`

### Accessibility
- Avatars include `alt` text with user name
- Popover trigger is keyboard accessible
- Overflow count is readable by screen readers

---

## Benefits

1. **Code Reduction**: ~200+ lines of duplicated code consolidated
2. **Consistency**: Same visual pattern across all features
3. **Maintainability**: Single source of truth for avatar stack UI
4. **Flexibility**: Easy to add new sizes or behaviors
5. **Testing**: One component to test instead of 6

---

## Estimated Effort

| Task | Time |
|------|------|
| Create `ProfileStack.tsx` component | 25 min |
| Update 6 existing files | 30 min |
| Testing across all use cases | 15 min |
| **Total** | ~70 min |

