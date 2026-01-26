

# Plan: Replace Project Filter with Office Filter on Team Directory

## Overview

This change replaces the project-based filtering on the Team Directory page with office-based filtering. This aligns better with the office-centric architecture of GlobalyOS and provides a more relevant filter for team discovery.

---

## Current State

**`useTeamFilters.tsx`:**
- Has `projectFilter: string` in the `TeamFilters` interface
- Default value is `"all"`
- Setter: `setProjectFilter`

**`Team.tsx` (lines 594-634):**
- Fetches projects from `projects` table
- Fetches `employee_projects` junction table
- Renders a Project Select dropdown with:
  - "All Projects"
  - "No Project" option
  - Individual project items with member counts
- Filters employees based on `projectFilter` value

**Data already available:**
- Employees already have `office_id` and `offices.name` from `employee_directory` view
- `officeEmployeeCounts` is already computed (line 247-254)

---

## Changes Required

### 1. Update `useTeamFilters.tsx`

**Replace:**
- `projectFilter: string` → `officeFilter: string`
- `setProjectFilter` → `setOfficeFilter`
- Default value remains `"all"`

```typescript
interface TeamFilters {
  statusFilter: StatusFilter;
  onlineFilter: OnlineFilter;
  officeFilter: string;  // Changed from projectFilter
  viewMode: ViewMode;
}

const DEFAULT_FILTERS: TeamFilters = {
  statusFilter: "active",
  onlineFilter: "all",
  officeFilter: "all",  // Changed from projectFilter
  viewMode: "cards",
};
```

---

### 2. Update `Team.tsx`

#### 2.1 Update Imports
- Replace `FolderKanban` icon with `Building2` (already imported)

#### 2.2 Update State & Hooks (lines 93-103)
```typescript
// Replace projectFilter with officeFilter
const {
  statusFilter, setStatusFilter,
  onlineFilter, setOnlineFilter,
  officeFilter, setOfficeFilter,  // Changed
  viewMode, setViewMode,
  clearFilters: clearAllFilters,
} = useTeamFilters();

// Add offices state (for the filter dropdown)
const [offices, setOffices] = useState<Office[]>([]);

// Remove:
// - projects state
// - employeeProjects state
```

#### 2.3 Update Data Fetching (loadEmployees function, lines 169-244)
```typescript
// Add to parallel fetch:
const [employeeResult, officesResult] = await Promise.all([
  supabase
    .from("employee_directory")
    .select("*")
    .eq("organization_id", currentOrg.id)
    .order("created_at", { ascending: false }),
  supabase
    .from("offices")
    .select("id, name")
    .eq("organization_id", currentOrg.id)
    .order("name"),
]);

// Set offices
if (officesResult.data) setOffices(officesResult.data);

// Remove project and employeeProjects fetching
```

#### 2.4 Update Active Filter Count (lines 274-281)
```typescript
const activeFilterCount = useMemo(() => {
  let count = 0;
  if (statusFilter !== 'active') count++;
  if (onlineFilter !== 'all') count++;
  if (officeFilter !== 'all') count++;  // Changed from projectFilter
  return count;
}, [statusFilter, onlineFilter, officeFilter]);
```

#### 2.5 Remove noProjectCount Computation
- Delete lines 285-289 (no longer needed)

#### 2.6 Update filteredEmployees (lines 291-312)
```typescript
const filteredEmployees = useMemo(() => {
  return employees
    .filter((employee) => statusFilter === 'all' || employee.status === statusFilter)
    .filter((employee) => {
      if (onlineFilter === 'all') return true;
      const isOnline = onlineStatuses[employee.id] ?? false;
      return onlineFilter === 'online' ? isOnline : !isOnline;
    })
    .filter((employee) => {
      if (officeFilter === 'all') return true;
      if (officeFilter === 'none') {
        return !employee.office_id;
      }
      return employee.office_id === officeFilter;
    })
    .filter((employee) =>
      employee.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.offices?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
}, [employees, statusFilter, onlineFilter, onlineStatuses, officeFilter, searchQuery]);
```

#### 2.7 Update Reset Page Effect (lines 323-325)
```typescript
useEffect(() => {
  pagination.resetPage();
}, [statusFilter, onlineFilter, officeFilter, searchQuery]);  // Changed
```

#### 2.8 Replace Project Filter UI (lines 594-634)

**New Office Filter:**
```tsx
{/* Office Filter */}
{offices.length > 0 && (
  <Select value={officeFilter} onValueChange={setOfficeFilter}>
    <SelectTrigger className={cn(
      "w-[150px] h-9",
      officeFilter !== 'all' && "border-primary bg-primary/5"
    )}>
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Office" />
      </div>
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Offices</SelectItem>
      <SelectItem value="none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full border border-dashed border-muted-foreground/50" />
          <span>No Office</span>
          <span className="text-muted-foreground">
            ({employees.filter(e => !e.office_id).length})
          </span>
        </div>
      </SelectItem>
      {offices.map((office) => {
        const memberCount = officeEmployeeCounts[office.id] || 0;
        return (
          <SelectItem key={office.id} value={office.id}>
            <div className="flex items-center gap-2">
              <span>{office.name}</span>
              <span className="text-muted-foreground">({memberCount})</span>
            </div>
          </SelectItem>
        );
      })}
    </SelectContent>
  </Select>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useTeamFilters.tsx` | Rename `projectFilter` → `officeFilter` |
| `src/pages/Team.tsx` | Replace project filter with office filter, update data fetching, update filter logic |

---

## Cleanup

The following can be removed from `Team.tsx`:
- `projects` state variable
- `employeeProjects` state variable  
- `noProjectCount` computed value
- Project fetching from `loadEmployees`
- `employee_projects` fetching from `loadEmployees`
- `FolderKanban` icon import (if not used elsewhere)

---

## Data Flow

```text
Offices table              Employees (employee_directory view)
     ↓                              ↓
offices state            employees with office_id
     ↓                              ↓
Office Filter UI    →    filteredEmployees (office_id match)
```

---

## Edge Cases Handled

1. **No offices configured**: Filter dropdown hidden (same as current project behavior)
2. **Employee without office**: "No Office" option filters these
3. **Office counts**: Shows count of active employees per office (reuses existing `officeEmployeeCounts`)

