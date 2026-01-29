

# Add Access Settings to Space Settings Dialog

## Overview

Add the "Access settings" section to the `SpaceSettingsDialog` to match the `CreateSpaceDialog` UI. This will allow space admins to view and modify access scope settings (company-wide, group access, or manual members) directly from the settings dialog.

## Current State

| Dialog | Has Access Settings | UI Style |
|--------|---------------------|----------|
| CreateSpaceDialog | ✅ Yes | Space icon picker, name, description, space type (radio cards), access settings |
| SpaceSettingsDialog | ❌ No | Name, description, space type (list-style radios), auto-sync toggle, danger zone |

The `SpaceSettingsDialog` is missing the `AccessScopeSelector` component and uses a different UI layout for space type selection.

## Implementation Plan

### 1. Update SpaceSettingsDialog to Import AccessScopeSelector

**File**: `src/components/chat/SpaceSettingsDialog.tsx`

Add imports and state variables for access settings:
- Import `AccessScopeSelector` and `SpaceImagePicker` components
- Add state for `accessScope`, `officeIds`, `departmentIds`, `projectIds`, `memberIds`, and their toggle flags
- Initialize these from the `space` data when loaded

### 2. Add Access Settings UI Section

Add the `AccessScopeSelector` component between the Space Type section and the Danger Zone section, matching the visual style in `CreateSpaceDialog`.

### 3. Update Space Type UI to Match Create Dialog

Change the space type selection from list-style to grid-style (2 columns) to match `CreateSpaceDialog`:
- Use compact card layout with icons
- Add `cn()` for active state styling

### 4. Add Space Icon Picker

Add the `SpaceImagePicker` component next to the space name input, matching the create dialog layout.

### 5. Update useUpdateSpace Hook

**File**: `src/services/useChat.ts`

Extend the mutation to handle:
- `accessScope` changes
- Office, department, and project association updates
- Member additions for manual scope
- Auto-sync settings based on scope

### 6. Handle Access Scope Changes

When access scope changes:
- Update `chat_spaces.access_scope` column
- Clear and re-insert records in `chat_space_offices`, `chat_space_departments`, `chat_space_projects`
- Optionally sync members based on new criteria

## Detailed Changes

### File: `src/components/chat/SpaceSettingsDialog.tsx`

#### New Imports
```tsx
import AccessScopeSelector, { type AccessScope } from "./AccessScopeSelector";
import SpaceImagePicker from "./SpaceImagePicker";
import { MessageSquare } from "lucide-react"; // Add to existing lucide imports
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
```

#### New State Variables (after existing state)
```tsx
const [iconUrl, setIconUrl] = useState<string | null>(null);
const [accessScope, setAccessScope] = useState<AccessScope>("company");
const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
const [officesEnabled, setOfficesEnabled] = useState(false);
const [departmentsEnabled, setDepartmentsEnabled] = useState(false);
const [projectsEnabled, setProjectsEnabled] = useState(false);
const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
const [inviteAdditionalMembers, setInviteAdditionalMembers] = useState(false);
```

#### Update useEffect to Initialize Access Settings
```tsx
useEffect(() => {
  if (space) {
    setName(space.name);
    setDescription(space.description || "");
    setSpaceType(space.space_type);
    setIconUrl(space.icon_url || null);
    setAutoSyncMembers(space.auto_sync_members || false);
    
    // Initialize access scope
    const scope = space.access_scope as AccessScope;
    setAccessScope(scope === 'offices' || scope === 'projects' ? 'custom' : scope);
    
    // Initialize office/department/project selections
    if (space.offices?.length) {
      setOfficesEnabled(true);
      setSelectedOfficeIds(space.offices.map(o => o.id));
    }
    if (space.departments?.length) {
      setDepartmentsEnabled(true);
      setSelectedDepartmentIds(space.departments.map(d => d.id));
    }
    if (space.projects?.length) {
      setProjectsEnabled(true);
      setSelectedProjectIds(space.projects.map(p => p.id));
    }
  }
}, [space]);
```

#### Update Space Name Input Layout (add icon picker)
```tsx
<div className="space-y-2">
  <Label>Space name</Label>
  <div className="flex items-center gap-3">
    <SpaceImagePicker value={iconUrl} onChange={setIconUrl} />
    <Input
      value={name}
      onChange={(e) => setName(e.target.value)}
      maxLength={128}
      className="flex-1"
    />
  </div>
  <p className="text-xs text-muted-foreground text-right">
    {name.length}/128
  </p>
</div>
```

#### Update Space Type UI to Grid Layout (matching CreateSpaceDialog)
```tsx
<div className="space-y-3">
  <Label className="text-base font-semibold">Space type</Label>
  <RadioGroup
    value={spaceType}
    onValueChange={(v) => setSpaceType(v as 'collaboration' | 'announcements')}
    className="grid grid-cols-2 gap-3"
  >
    <div 
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
        spaceType === 'collaboration' 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:bg-muted/50'
      )}
      onClick={() => setSpaceType('collaboration')}
    >
      <RadioGroupItem value="collaboration" id="settings-collaboration" />
      <MessageSquare className={cn("h-4 w-4", spaceType === 'collaboration' ? 'text-primary' : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <Label htmlFor="settings-collaboration" className="font-medium cursor-pointer text-sm">
          Collaboration
        </Label>
        <p className="text-xs text-muted-foreground truncate">Everyone can post</p>
      </div>
    </div>
    
    <div 
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
        spaceType === 'announcements' 
          ? 'border-primary bg-primary/5' 
          : 'border-border hover:bg-muted/50'
      )}
      onClick={() => setSpaceType('announcements')}
    >
      <RadioGroupItem value="announcements" id="settings-announcements" />
      <Megaphone className={cn("h-4 w-4", spaceType === 'announcements' ? 'text-primary' : 'text-muted-foreground')} />
      <div className="flex-1 min-w-0">
        <Label htmlFor="settings-announcements" className="font-medium cursor-pointer text-sm">
          Announcement
        </Label>
        <p className="text-xs text-muted-foreground truncate">Only admins can post</p>
      </div>
    </div>
  </RadioGroup>
</div>
```

#### Add AccessScopeSelector (after Space Type, before Danger Zone)
```tsx
{/* Access Settings */}
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
  inviteAdditionalMembers={inviteAdditionalMembers}
  onInviteAdditionalMembersChange={setInviteAdditionalMembers}
/>
```

#### Remove Standalone Auto-Sync Section
The auto-sync toggle is now built into the `AccessScopeSelector` component, so the standalone auto-sync section (lines 365-401) can be removed.

### File: `src/services/useChat.ts` - Update useUpdateSpace

#### Extend Mutation Parameters
```tsx
mutationFn: async ({
  spaceId,
  name,
  description,
  spaceType,
  iconUrl,
  autoSyncMembers,
  accessScope,
  officeIds,
  departmentIds,
  projectIds,
  oldName,
  oldIconUrl,
}: {
  spaceId: string;
  name?: string;
  description?: string | null;
  spaceType?: 'collaboration' | 'announcements';
  iconUrl?: string | null;
  autoSyncMembers?: boolean;
  accessScope?: 'company' | 'custom' | 'members';
  officeIds?: string[];
  departmentIds?: string[];
  projectIds?: string[];
  oldName?: string;
  oldIconUrl?: string | null;
}) => {
```

#### Add Access Scope Update Logic
After the main space update:
```tsx
// Handle access scope changes
if (accessScope !== undefined) {
  updateData.access_scope = accessScope;
  updateData.access_type = accessScope === 'company' ? 'public' : 'private';
  
  // Clear existing associations
  await supabase.from('chat_space_offices').delete().eq('space_id', spaceId);
  await supabase.from('chat_space_departments').delete().eq('space_id', spaceId);
  await supabase.from('chat_space_projects').delete().eq('space_id', spaceId);
  
  // Add new associations based on scope
  if (accessScope === 'custom') {
    if (officeIds?.length) {
      await supabase.from('chat_space_offices').insert(
        officeIds.map(id => ({ space_id: spaceId, office_id: id, organization_id: currentOrg.id }))
      );
    }
    if (departmentIds?.length) {
      await supabase.from('chat_space_departments').insert(
        departmentIds.map(id => ({ space_id: spaceId, department_id: id, organization_id: currentOrg.id }))
      );
    }
    if (projectIds?.length) {
      await supabase.from('chat_space_projects').insert(
        projectIds.map(id => ({ space_id: spaceId, project_id: id, organization_id: currentOrg.id }))
      );
    }
  }
}
```

## Summary

| File | Changes |
|------|---------|
| `SpaceSettingsDialog.tsx` | Add imports, state, icon picker, grid-style space type, access settings UI |
| `useChat.ts` | Extend `useUpdateSpace` to handle access scope and associations |

## Result

After implementation:
- Space settings dialog will match the visual style of the create dialog
- Admins can modify access scope (company-wide, group access, manual members)
- Changes to office/department/project criteria are persisted
- Auto-sync is managed through the access scope selection

