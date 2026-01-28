

## Add "Add All Members" Option and Auto-Sync Feature to CreateSpaceDialog

### Feature Overview

When creating a space, users should be able to:
1. **Add all team members at once** via a checkbox in the footer (between Cancel and Create buttons)
2. **Enable auto-sync** to automatically add/remove members when employees join or leave the team/company

---

### Implementation Summary

#### 1. Database Changes (New Column)

Add an `auto_sync_members` boolean column to `chat_spaces` table:

```sql
ALTER TABLE chat_spaces 
ADD COLUMN auto_sync_members boolean DEFAULT false;

COMMENT ON COLUMN chat_spaces.auto_sync_members IS 
  'When true, space membership automatically syncs with access scope changes (company employees, office transfers, project assignments)';
```

This column will track whether the space should auto-sync its members based on the access_scope (company/offices/projects).

---

#### 2. Database Trigger for Auto-Sync

Create triggers to handle automatic member additions/removals:

**For company-wide spaces (`access_scope = 'company'`):**
- When a new employee becomes active → add to all auto-sync company spaces
- When an employee becomes inactive/leaves → remove from all auto-sync company spaces

**For office-wise spaces (`access_scope = 'offices'`):**
- When an employee's `office_id` changes → add/remove from relevant office spaces

**For project-wise spaces (`access_scope = 'projects'`):**
- When an employee is added/removed from a project → add/remove from relevant project spaces

```sql
-- Function: Handle employee status changes for company-wide auto-sync spaces
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Employee became active: add to all company-wide auto-sync spaces
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
    SELECT cs.id, NEW.id, cs.organization_id, 'member'
    FROM chat_spaces cs
    WHERE cs.organization_id = NEW.organization_id
      AND cs.access_scope = 'company'
      AND cs.auto_sync_members = true
      AND cs.archived_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM chat_space_members csm 
        WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
      );
  END IF;

  -- Employee became inactive: remove from all auto-sync spaces
  IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
    DELETE FROM chat_space_members
    WHERE employee_id = NEW.id
      AND space_id IN (
        SELECT id FROM chat_spaces 
        WHERE organization_id = NEW.organization_id
          AND auto_sync_members = true
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Similar triggers for office changes and project membership changes
```

---

#### 3. Frontend Changes

##### A. CreateSpaceDialog.tsx

Add two new state variables and UI elements:

**State:**
```typescript
const [addAllMembers, setAddAllMembers] = useState(false);
const [autoSync, setAutoSync] = useState(false);
```

**UI (in footer, left side before Cancel):**
```tsx
<div className="flex justify-between items-center gap-2 pt-4 border-t">
  {/* Left side: Options */}
  <div className="flex items-center gap-4">
    {/* Add all members checkbox */}
    <div className="flex items-center gap-2">
      <Checkbox 
        id="addAll"
        checked={addAllMembers}
        onCheckedChange={(checked) => setAddAllMembers(!!checked)}
        disabled={accessScope === 'members'} // Only for non-manual scopes
      />
      <Label htmlFor="addAll" className="text-sm font-normal cursor-pointer">
        Add all members
      </Label>
    </div>
    
    {/* Auto-sync toggle */}
    <div className="flex items-center gap-2">
      <Switch
        id="autoSync"
        checked={autoSync}
        onCheckedChange={setAutoSync}
        disabled={accessScope === 'members'}
      />
      <Label htmlFor="autoSync" className="text-sm font-normal cursor-pointer">
        Auto-sync
      </Label>
      <Tooltip>
        <TooltipTrigger>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          Automatically add/remove members when team members join or leave
        </TooltipContent>
      </Tooltip>
    </div>
  </div>

  {/* Right side: Actions */}
  <div className="flex gap-2">
    <Button variant="outline" onClick={handleClose}>Cancel</Button>
    <Button onClick={handleCreate}>Create</Button>
  </div>
</div>
```

**Logic Changes:**
- When `addAllMembers` is true at creation time, fetch all employees matching the access scope and include them in the `memberIds` array
- Pass `autoSync` value to the `createSpace` mutation

##### B. useCreateSpace Hook (src/services/useChat.ts)

Update the mutation to:
1. Accept `addAllMembers` and `autoSync` parameters
2. If `addAllMembers` is true, fetch and add all matching employees
3. Save `auto_sync_members` flag to the space record

```typescript
mutationFn: async ({ 
  name, 
  description,
  iconUrl,
  spaceType = 'collaboration',
  accessScope = 'company',
  officeIds,
  projectIds,
  memberIds,
  addAllMembers = false,  // NEW
  autoSync = false,       // NEW
}: { ... }) => {
  // ...existing code...

  // Create space with auto_sync_members flag
  const { data: space, error: spaceError } = await supabase
    .from('chat_spaces')
    .insert({
      // ...existing fields...
      auto_sync_members: autoSync && accessScope !== 'members',
    })
    .select()
    .single();

  // If addAllMembers is true, fetch and add all matching employees
  if (addAllMembers && accessScope !== 'members') {
    let employeesToAdd: string[] = [];
    
    if (accessScope === 'company') {
      // Add all active employees
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');
      employeesToAdd = data?.map(e => e.id) || [];
    } else if (accessScope === 'offices' && officeIds?.length) {
      // Add employees from selected offices
      const { data } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active')
        .in('office_id', officeIds);
      employeesToAdd = data?.map(e => e.id) || [];
    } else if (accessScope === 'projects' && projectIds?.length) {
      // Add employees from selected projects
      // (Requires joining with project_members table)
    }
    
    // Insert all as members (excluding creator who's auto-added)
    if (employeesToAdd.length > 0) {
      const membersToInsert = employeesToAdd
        .filter(id => id !== employeeId)
        .map(empId => ({
          space_id: space.id,
          employee_id: empId,
          organization_id: currentOrg.id,
          role: 'member'
        }));
      
      if (membersToInsert.length > 0) {
        await supabase.from('chat_space_members').insert(membersToInsert);
      }
    }
  }
}
```

---

### Files to Change

| File | Changes |
|------|---------|
| **Database Migration** | Add `auto_sync_members` column to `chat_spaces` |
| **Database Trigger** | Create trigger functions for auto-sync on employee status/office/project changes |
| `src/components/chat/CreateSpaceDialog.tsx` | Add checkbox for "Add all members", Switch for "Auto-sync", update form state and handleCreate |
| `src/services/useChat.ts` | Update `useCreateSpace` mutation to accept and handle new parameters |
| `src/types/chat.ts` | Update `ChatSpace` interface to include `auto_sync_members?: boolean` |

---

### UX Behavior

1. **"Add all members" checkbox:**
   - Visible when access scope is Company-wide, Office-wise, or Project-wise
   - Hidden/disabled when access scope is "Members" (manual selection)
   - When checked, all matching employees are added to the space on creation

2. **"Auto-sync" toggle:**
   - Visible when access scope is Company-wide, Office-wise, or Project-wise
   - Hidden/disabled when access scope is "Members"
   - Shows tooltip explaining the behavior
   - When enabled, members are automatically added/removed based on employment status changes

3. **Reset on scope change:**
   - If user switches to "Members" scope, both options are automatically unchecked

---

### Technical Details

**Access Scope Behavior Matrix:**

| Access Scope | Add All Members | Auto-Sync Trigger |
|--------------|-----------------|-------------------|
| Company | All active employees | Employee status changes (active ↔ inactive) |
| Offices | Employees in selected offices | Employee office_id changes |
| Projects | Employees in selected projects | Project membership changes |
| Members | N/A (disabled) | N/A (disabled) |

**Security Considerations:**
- Triggers use `SECURITY DEFINER` but validate organization_id
- Only active employees are added
- Creator is already added via existing trigger, so they're excluded from bulk insert

