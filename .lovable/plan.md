
# Remove Exempt Status and Implement New Membership Rules

## Summary

This plan will:
1. **Remove the "Exempt" concept** entirely from the codebase
2. **Implement new membership rules** based on how members were added:
   - Members added via auto-sync or meeting group access settings → Cannot leave or be removed
   - Members added manually (invited) → Can leave the group
3. **Enable the + button** to always work for admins (even with auto-sync on) to add additional members

---

## Current State

- **Exempt system**: Owners/Admins/HR are treated as "exempt" and can always be removed even with auto-sync enabled
- **+ button**: Currently disabled when auto-sync is enabled
- **Member source tracking**: The `chat_space_member_logs` table already tracks `source` ('manual', 'auto_sync', 'space_creation')

## New Rules

| Member Type | How Added | Can Leave? | Admin Can Remove? |
|------------|-----------|------------|-------------------|
| Auto-sync member | Via database trigger | No | No |
| Access-scope member | Matches space criteria | No | No |
| Invited member | Via + button (manual) | Yes | Yes |

---

## Implementation

### Part 1: Database - Track Member Source on `chat_space_members`

Add a `source` column to `chat_space_members` to track how each member was added:

```sql
-- Add source column to track how member was added
ALTER TABLE public.chat_space_members 
  ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' 
  CHECK (source IN ('manual', 'auto_sync', 'space_creation'));

-- Update existing members: assume they are from auto-sync if space has auto_sync_members enabled
UPDATE public.chat_space_members csm
SET source = 'auto_sync'
FROM public.chat_spaces cs
WHERE csm.space_id = cs.id 
  AND cs.auto_sync_members = true;

-- Update database triggers to set source = 'auto_sync' when adding via trigger
```

Update the `sync_company_space_members` and `sync_office_space_members` triggers to set `source = 'auto_sync'` on INSERT.

---

### Part 2: Remove `useExemptRoles.ts` Hook

Delete the file `src/hooks/useExemptRoles.ts` entirely as it will no longer be needed.

---

### Part 3: Update `ChatRightPanelEnhanced.tsx`

**Remove:**
- Import of `useExemptEmployeeIds`, `isExemptFromAutoSync`
- All references to `exemptIds`, `isMemberExempt`
- The "Exempt" badge display

**Update logic for:**
- **+ button**: Always enabled for admins (remove `disabled={autoSyncEnabled}` condition)
- **Remove member**: Check if `member.source === 'manual'` instead of exempt status
- **Leave group**: Only allow if `member.source === 'manual'`

**New removal logic:**
```typescript
// Member can be removed if they were manually added (invited)
const canRemoveThisMember = member.source === 'manual';

// Member can leave if they were manually added
const canLeaveSpace = isSelf && member.source === 'manual';
```

---

### Part 4: Update `SpaceMembersDialog.tsx`

**Remove:**
- Import of `useExemptEmployeeIds`
- All `exemptIds`, `isMemberExempt`, `isExempt` references
- "Exempt" badge display

**Update:**
- `canRemoveMember` logic: Check `member.source === 'manual'`
- Remove tooltip about exempt members

---

### Part 5: Update `SpaceSettingsDialog.tsx`

**Remove:**
- Import of `useExemptEmployeeIds`, `isExemptFromAutoSync`
- `exemptIds`, `roleMap` usage
- `exemptMembers` calculation and display

**Update:**
- Remove filtering of members to remove based on exempt status
- Simplify sync preview to not show exempt members section

---

### Part 6: Update `AutoSyncPreviewDialog.tsx`

**Remove:**
- `exemptMembers` prop and its display section
- All references to "exempt" in the UI

**Simplify to:**
- Only show members to add and members to remove

---

### Part 7: Update `AddSpaceMembersDialog.tsx`

**Remove:**
- Import of `useEmployeeSystemRoles`, `isExemptFromAutoSync`
- Role-based filtering when auto-sync is enabled
- Exempt member badge display
- "Only Owner, Admin, and HR members can be added" message

**Update:**
- Show ALL available employees (not existing members) regardless of auto-sync state
- When adding members, always set `source = 'manual'` in the database

---

### Part 8: Update `useAddSpaceMembers` Mutation

Ensure when adding members via the dialog, the `source` is set to `'manual'`:

```typescript
// In useAddSpaceMembers mutation
const insertData = employeeIds.map(empId => ({
  space_id: spaceId,
  employee_id: empId,
  organization_id: currentOrg.id,
  role: 'member',
  source: 'manual', // Explicitly set as manually invited
}));
```

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| Database migration | Add | Add `source` column to `chat_space_members` |
| Database migration | Update | Modify sync triggers to set `source = 'auto_sync'` |
| `src/hooks/useExemptRoles.ts` | Delete | Remove entire file |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Modify | Remove exempt logic, update removal/leave permissions |
| `src/components/chat/SpaceMembersDialog.tsx` | Modify | Remove exempt logic, use source-based permissions |
| `src/components/chat/SpaceSettingsDialog.tsx` | Modify | Remove exempt calculations from sync preview |
| `src/components/chat/AutoSyncPreviewDialog.tsx` | Modify | Remove exemptMembers prop and UI |
| `src/components/chat/AddSpaceMembersDialog.tsx` | Modify | Show all available employees, remove role filtering |
| `src/services/useChat.ts` | Modify | Update `useAddSpaceMembers` to set `source = 'manual'` |

---

## UI Changes

### Members List (Before → After)
- **Before**: Shows "Exempt" badge for Owner/Admin/HR members
- **After**: No exempt badges; shows "Invited" tag for manually added members (optional for clarity)

### + Button (Before → After)
- **Before**: Disabled when auto-sync is enabled
- **After**: Always enabled for space admins

### Member Actions (Before → After)
- **Before**: Can remove exempt members even with auto-sync
- **After**: Can only remove manually invited members

### Leave Space (Before → After)
- **Before**: Available based on exempt status
- **After**: Only available if member was manually invited

---

## Edge Cases Handled

1. **Existing members**: Migration sets `source = 'auto_sync'` for members in auto-sync-enabled spaces
2. **Space creation**: Members added during space creation get `source = 'space_creation'` (treated same as auto_sync for removal rules)
3. **Admin adds member while auto-sync on**: New member gets `source = 'manual'` and can be removed later
