

# Create Space Dialog Enhancement - Revised Comprehensive Plan

## Overview

This plan modifies the Create Space dialog based on the provided wireframe to:
1. Add Space Type selector (Collaboration/Announcement)
2. Add "Auto Sync" tag next to "Company-wide" option
3. Rename "Custom access" to "Group Access" with "Auto Sync" tag
4. Allow "Also invite specific members" within Group Access (filtering out group members)
5. Update "Membership options" section to show for both Company-wide AND Group Access
6. Remove the separate auto-sync toggle (group members are always auto-synced by default)

---

## Visual Design (Based on Reference)

```text
+-----------------------------------------------------------+
| Create a space                                            |
+-----------------------------------------------------------+
| [Icon] [Space name input.........................]        |
|                                               0/128       |
|                                                           |
| Description (optional)                                    |
| [......................................................]  |
|                                               0/500       |
|                                                           |
| Space type                                                |
| +-------------------------------------------------------+ |
| | (*) [chat] Collaboration                              | |
| |     Everyone can post messages                        | |
| +-------------------------------------------------------+ |
| | ( ) [megaphone] Announcement                          | |
| |     Only admins can post, members can view            | |
| +-------------------------------------------------------+ |
|                                                           |
| Access settings                                           |
| +-------------------------------------------------------+ |
| | (*) [building] Company-wide          [Auto Sync]      | |
| |     Anyone in Org can find, view, and join            | |
| +-------------------------------------------------------+ |
| | ( ) [settings] Group Access          [Auto Sync]      | |
| |     Only employees matching criteria can access       | |
| |                                                       | |
| |   (If selected, show criteria selectors)              | |
| |   [ ] Office   [ ] Department   [ ] Project           | |
| |   [Select offices...]   [badges]                      | |
| |                                                       | |
| |   [ ] Also invite specific members                    | |
| |   [Select members not in group...]                    | |
| +-------------------------------------------------------+ |
| | ( ) [users] Invite members manually                   | |
| |     Only invited members can access                   | |
| |     [Select team members...]                          | |
| +-------------------------------------------------------+ |
|                                                           |
| Membership options (for Company-wide & Group)             |
| ---------------------------------------------------------+|
| [ ] Add all matching members now                          |
|     Add all employees who meet the access criteria        |
|                                                           |
+-----------------------------------------------------------+
|                              [Cancel]  [Create]           |
+-----------------------------------------------------------+
```

---

## Implementation Plan

### Part 1: Add Space Type State and UI

**File:** `src/components/chat/CreateSpaceDialog.tsx`

Add new state and imports:

```tsx
import { MessageSquare, Megaphone } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// Add state
const [spaceType, setSpaceType] = useState<'collaboration' | 'announcements'>('collaboration');
```

Add Space Type UI section between Description and Access settings:

```tsx
{/* Space Type */}
<div className="space-y-3">
  <Label className="text-base font-semibold">Space type</Label>
  <RadioGroup
    value={spaceType}
    onValueChange={(v) => setSpaceType(v as 'collaboration' | 'announcements')}
    className="space-y-2"
  >
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        spaceType === 'collaboration' 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:bg-muted/50'
      )}
      onClick={() => setSpaceType('collaboration')}
    >
      <RadioGroupItem value="collaboration" id="collaboration" className="mt-1" />
      <MessageSquare className={cn("h-5 w-5 mt-0.5", spaceType === 'collaboration' ? 'text-primary' : 'text-muted-foreground')} />
      <div className="flex-1">
        <Label htmlFor="collaboration" className="font-medium cursor-pointer">
          Collaboration
        </Label>
        <p className="text-sm text-muted-foreground">Everyone can post messages</p>
      </div>
    </div>
    
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        spaceType === 'announcements' 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:bg-muted/50'
      )}
      onClick={() => setSpaceType('announcements')}
    >
      <RadioGroupItem value="announcements" id="announcements" className="mt-1" />
      <Megaphone className={cn("h-5 w-5 mt-0.5", spaceType === 'announcements' ? 'text-primary' : 'text-muted-foreground')} />
      <div className="flex-1">
        <Label htmlFor="announcements" className="font-medium cursor-pointer">
          Announcement
        </Label>
        <p className="text-sm text-muted-foreground">Only admins can post, members can view</p>
      </div>
    </div>
  </RadioGroup>
</div>
```

---

### Part 2: Update AccessScopeSelector Props

**File:** `src/components/chat/AccessScopeSelector.tsx`

Add new props for "Also invite specific members" functionality:

```tsx
interface AccessScopeSelectorProps {
  // ... existing props ...
  
  // NEW: For inviting additional members alongside Group Access
  inviteAdditionalMembers: boolean;
  onInviteAdditionalMembersChange: (enabled: boolean) => void;
}
```

---

### Part 3: Rename "Custom access" to "Group Access" and Add Auto Sync Tags

**File:** `src/components/chat/AccessScopeSelector.tsx`

Update scope options with new label and add auto-sync flag:

```tsx
import { RefreshCw } from "lucide-react";

const scopeOptions = [
  {
    value: 'company' as AccessScope,
    label: 'Company-wide',
    description: `Anyone in ${currentOrg?.name || 'organization'} can find, view, and join`,
    icon: Building2,
    showAutoSync: true,  // NEW
  },
  {
    value: 'custom' as AccessScope,
    label: 'Group Access',  // RENAMED from 'Custom access'
    description: 'Only employees matching criteria can access',
    icon: Settings2,
    showAutoSync: true,  // NEW
  },
  {
    value: 'members' as AccessScope,
    label: 'Invite members manually',
    description: 'Only invited members can access',
    icon: Users,
    showAutoSync: false,  // No auto-sync for manual
  },
];
```

Update the label rendering to include Auto Sync tag:

```tsx
<div className="flex-1">
  <div className="flex items-center gap-2">
    <Label htmlFor={option.value} className="font-medium cursor-pointer">
      {option.label}
    </Label>
    {option.showAutoSync && (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-medium">
        <RefreshCw className="h-2.5 w-2.5" />
        Auto Sync
      </span>
    )}
  </div>
  <p className="text-sm text-muted-foreground">{option.description}</p>
</div>
```

---

### Part 4: Add "Also Invite Specific Members" Section in Group Access

**File:** `src/components/chat/AccessScopeSelector.tsx`

After the criteria selectors (Office, Department, Project) within the 'custom' scope section, add:

```tsx
{/* Also invite specific members - for Group Access */}
{isSelected && option.value === 'custom' && (
  <div className="mt-4 pt-4 border-t border-border/50">
    <div className="flex items-center gap-2 mb-3">
      <Checkbox
        id="invite-additional"
        checked={inviteAdditionalMembers}
        onCheckedChange={(checked) => onInviteAdditionalMembersChange(!!checked)}
      />
      <Label htmlFor="invite-additional" className="cursor-pointer text-sm">
        Also invite specific members
      </Label>
    </div>
    
    {inviteAdditionalMembers && (
      <div className="ml-6 space-y-2">
        <p className="text-xs text-muted-foreground mb-2">
          Select additional members who aren't covered by the group criteria
        </p>
        <Select onValueChange={handleAddMember}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select members not in group..." />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="max-h-[200px]">
              {selectableEmployees
                .filter(emp => 
                  !selectedMemberIds.includes(emp.id) && 
                  !groupMemberIds.includes(emp.id)
                )
                .map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={emp.profiles?.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {emp.profiles?.full_name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {emp.profiles?.full_name}
                    </div>
                  </SelectItem>
                ))}
            </ScrollArea>
          </SelectContent>
        </Select>
        
        {/* Show selected additional members as badges */}
        {selectedMemberIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedMemberIds.map(id => {
              const emp = selectableEmployees.find(e => e.id === id);
              return emp ? (
                <Badge key={id} variant="secondary" className="gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={emp.profiles?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {emp.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {emp.profiles?.full_name?.split(' ')[0]}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleRemoveMember(id)} 
                  />
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>
    )}
  </div>
)}
```

---

### Part 5: Calculate Group Member IDs for Filtering

**File:** `src/components/chat/AccessScopeSelector.tsx`

Add a computed value to determine which employees match the current group criteria, so we can filter them out from the manual member selector:

```tsx
import { useMemo } from "react";

// Fetch employees with office, department, and project info for filtering
const { data: employeesWithDetails = [] } = useQuery({
  queryKey: ['employees-with-details-for-filtering', currentOrg?.id],
  queryFn: async () => {
    if (!currentOrg?.id) return [];
    const { data, error } = await supabase
      .from('employees')
      .select(`
        id, 
        office_id, 
        department_id,
        profiles!inner(full_name, avatar_url, email),
        employee_projects(project_id)
      `)
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active');
    if (error) throw error;
    return data || [];
  },
  enabled: !!currentOrg?.id,
});

// Calculate which employees match the group criteria
const groupMemberIds = useMemo(() => {
  if (value !== 'custom') return [];
  
  let candidates = [...employeesWithDetails];
  
  // Filter by offices if enabled
  if (officesEnabled && selectedOfficeIds.length > 0) {
    candidates = candidates.filter(e => selectedOfficeIds.includes(e.office_id || ''));
  }
  
  // Filter by departments if enabled
  if (departmentsEnabled && selectedDepartmentIds.length > 0) {
    candidates = candidates.filter(e => selectedDepartmentIds.includes(e.department_id || ''));
  }
  
  // Filter by projects if enabled
  if (projectsEnabled && selectedProjectIds.length > 0) {
    candidates = candidates.filter(e => 
      e.employee_projects?.some(p => selectedProjectIds.includes(p.project_id))
    );
  }
  
  return candidates.map(e => e.id);
}, [value, employeesWithDetails, officesEnabled, selectedOfficeIds, departmentsEnabled, selectedDepartmentIds, projectsEnabled, selectedProjectIds]);
```

---

### Part 6: Update CreateSpaceDialog State and Props

**File:** `src/components/chat/CreateSpaceDialog.tsx`

Add new state and remove obsolete state:

```tsx
// NEW: Space type selection
const [spaceType, setSpaceType] = useState<'collaboration' | 'announcements'>('collaboration');

// NEW: Enable manual member invites alongside Group Access
const [inviteAdditionalMembers, setInviteAdditionalMembers] = useState(false);

// REMOVE: autoSync state (no longer needed as separate toggle)
// const [autoSync, setAutoSync] = useState(false);  <- DELETE THIS
```

Update AccessScopeSelector props:

```tsx
<AccessScopeSelector
  value={accessScope}
  onChange={setAccessScope}
  selectedOfficeIds={selectedOfficeIds}
  onOfficeIdsChange={setSelectedOfficeIds}
  selectedDepartmentIds={selectedDepartmentIds}
  onDepartmentIdsChange={setSelectedDepartmentIds}
  selectedProjectIds={selectedProjectIds}
  onProjectIdsChange={setSelectedProjectIds}
  officesEnabled={officesEnabled}
  onOfficesEnabledChange={setOfficesEnabled}
  departmentsEnabled={departmentsEnabled}
  onDepartmentsEnabledChange={setDepartmentsEnabled}
  projectsEnabled={projectsEnabled}
  onProjectsEnabledChange={setProjectsEnabled}
  selectedMemberIds={selectedMemberIds}
  onMemberIdsChange={setSelectedMemberIds}
  currentEmployeeId={currentEmployee?.id}
  // NEW props:
  inviteAdditionalMembers={inviteAdditionalMembers}
  onInviteAdditionalMembersChange={setInviteAdditionalMembers}
/>
```

---

### Part 7: Update Membership Options Section

**File:** `src/components/chat/CreateSpaceDialog.tsx`

Show membership options for both Company-wide AND Group Access scopes, with updated label. Remove the auto-sync toggle entirely:

```tsx
{/* Membership options (for Company-wide & Group) */}
{(accessScope === 'company' || accessScope === 'custom') && (
  <>
    <Separator />
    <div className="space-y-4">
      <Label className="text-base font-semibold">
        Membership options
        <span className="text-xs font-normal text-muted-foreground ml-2">
          (for Company-wide & Group)
        </span>
      </Label>
      
      {/* Add all matching members checkbox */}
      <div className="flex items-start gap-3">
        <Checkbox 
          id="addAll"
          checked={addAllMembers}
          onCheckedChange={(checked) => setAddAllMembers(!!checked)}
          className="mt-0.5"
        />
        <div className="space-y-0.5">
          <Label htmlFor="addAll" className="text-sm font-medium cursor-pointer">
            Add all matching members now
          </Label>
          <p className="text-xs text-muted-foreground">
            Add all employees who meet the access criteria
          </p>
        </div>
      </div>
      
      {/* REMOVED: Auto-sync toggle - no longer needed as separate option */}
    </div>
  </>
)}
```

---

### Part 8: Update handleCreate Function

**File:** `src/components/chat/CreateSpaceDialog.tsx`

Update the create logic to include space type and handle additional members:

```tsx
const handleCreate = async () => {
  const error = validateForm();
  if (error) {
    toast.error(error);
    return;
  }

  try {
    const space = await createSpace.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      iconUrl: iconUrl || undefined,
      spaceType,  // NEW: Pass space type
      accessScope,
      officeIds: accessScope === 'custom' && officesEnabled ? selectedOfficeIds : undefined,
      departmentIds: accessScope === 'custom' && departmentsEnabled ? selectedDepartmentIds : undefined,
      projectIds: accessScope === 'custom' && projectsEnabled ? selectedProjectIds : undefined,
      // For 'members' scope: pass selected members
      // For 'custom' scope with inviteAdditionalMembers: also pass selected members
      memberIds: accessScope === 'members' 
        ? selectedMemberIds 
        : (accessScope === 'custom' && inviteAdditionalMembers ? selectedMemberIds : undefined),
      addAllMembers: (accessScope === 'company' || accessScope === 'custom') ? addAllMembers : false,
      autoSync: accessScope !== 'members',  // Always true for company/group
    });

    // ... rest of success handling
  } catch (error) {
    // ... error handling
  }
};
```

---

### Part 9: Update Reset Form

**File:** `src/components/chat/CreateSpaceDialog.tsx`

Update reset function to include new state and remove obsolete state:

```tsx
const resetForm = () => {
  setName("");
  setIconUrl(null);
  setDescription("");
  setSpaceType("collaboration");  // NEW
  setAccessScope("company");
  setSelectedOfficeIds([]);
  setSelectedDepartmentIds([]);
  setSelectedProjectIds([]);
  setOfficesEnabled(false);
  setDepartmentsEnabled(false);
  setProjectsEnabled(false);
  setSelectedMemberIds([]);
  setAddAllMembers(false);
  setInviteAdditionalMembers(false);  // NEW
  // REMOVED: setAutoSync(false);
};
```

---

### Part 10: Update useEffect for Scope Changes

**File:** `src/components/chat/CreateSpaceDialog.tsx`

Clear related state when switching scopes:

```tsx
useEffect(() => {
  if (accessScope === 'members') {
    setAddAllMembers(false);
    setInviteAdditionalMembers(false);
  }
  if (accessScope !== 'custom') {
    setInviteAdditionalMembers(false);
    // Clear additional members when not in custom scope
    if (accessScope !== 'members') {
      setSelectedMemberIds([]);
    }
  }
}, [accessScope]);
```

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/components/chat/CreateSpaceDialog.tsx` | Modify | Add spaceType selector, update membership options, remove auto-sync toggle, update create logic |
| `src/components/chat/AccessScopeSelector.tsx` | Modify | Rename to "Group Access", add Auto Sync tags, add "Also invite specific members" with filtering |

---

## Technical Notes

- **Space Type**: Already supported in database (`chat_space_type` enum with `collaboration` | `announcements`)
- **Auto-Sync**: Always enabled for company-wide and group access scopes (set automatically in create call)
- **Group Member Filtering**: When "Also invite specific members" is enabled, the member selector filters out employees who already match the group criteria using AND logic
- **Backward Compatible**: No database changes needed; all changes are UI-level
- **Validation**: Updated to accept Group Access with additional members or pure group-only access

