

# Security Fix: Position History Salary Exposure in API Response

## Executive Summary

A member-role user can see salary information in the browser Network tab when viewing another team member's profile, despite the UI correctly hiding it. This occurs because the `loadPositionHistory` function directly queries the `position_history` table with the `salary` field included.

A secure RPC function `get_position_history_for_viewer` already exists and implements proper field-level security - it masks salary for unauthorized viewers. The fix is to use this existing function instead of the direct table query.

## Root Cause

### Current Vulnerable Code (`src/pages/TeamMemberProfile.tsx` lines 340-362)

```typescript
const loadPositionHistory = async () => {
  const { data } = await supabase.from("position_history").select(`
    id, position, department,
    salary,                    // <-- EXPOSED TO ALL ORG MEMBERS
    manager_id, effective_date, end_date, change_type, notes,
    employment_type, is_current,
    manager:employees!position_history_manager_id_fkey(
      profiles!inner(full_name)
    )
  `).eq("employee_id", id)...
};
```

### Why Salary Is Exposed

1. The RLS policy "Organization members can view position history" allows all org members to SELECT all columns
2. The frontend code queries the table directly, including the `salary` field
3. While the UI hides salary via `showSalary={canViewSalary}` prop, the API response still contains salary data visible in DevTools

### Existing Secure Solution

The `get_position_history_for_viewer` RPC function already exists and correctly implements field-level security:

```sql
-- Function logic (already in database):
can_view_salary := is_self OR is_hr_or_admin OR is_owner;

RETURN QUERY
SELECT
  ph.id, ph.position, ph.department,
  CASE WHEN can_view_salary THEN ph.salary ELSE NULL END,  -- Masked!
  ph.manager_id, ph.effective_date, ...
```

## Solution

### Change Required: `src/pages/TeamMemberProfile.tsx`

Replace the direct table query in `loadPositionHistory` with the secure RPC function:

```typescript
const loadPositionHistory = async () => {
  if (!id) return;
  
  // Use secure RPC that masks salary for unauthorized viewers
  const { data, error } = await supabase
    .rpc('get_position_history_for_viewer', { target_employee_id: id });

  if (error) {
    console.error('Error loading position history:', error);
    return;
  }

  // Map RPC response fields to the component's expected structure
  const mappedData = (data || []).map((entry: any) => ({
    id: entry.ph_id,
    position: entry.ph_position,
    department: entry.ph_department,
    salary: entry.ph_salary,  // Will be NULL for unauthorized viewers
    manager_id: entry.ph_manager_id,
    effective_date: entry.ph_effective_date,
    end_date: entry.ph_end_date,
    change_type: entry.ph_change_type,
    notes: entry.ph_notes,
    employment_type: entry.ph_employment_type,
    is_current: entry.ph_is_current,
    manager: entry.ph_manager_name ? { 
      profiles: { full_name: entry.ph_manager_name } 
    } : null,
  }));

  setPositionHistory(mappedData);
};
```

## Security Verification

After this fix:

| User Role | API Response (`salary` field) | UI Display |
|-----------|------------------------------|------------|
| Member viewing another profile | `null` | Hidden |
| Member viewing own profile | Actual value | Shown |
| HR/Admin/Owner viewing any profile | Actual value | Shown |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/TeamMemberProfile.tsx` | Replace direct query with `get_position_history_for_viewer` RPC |

## Impact Assessment

- No database changes required (RPC already exists)
- No UI changes required (already respects `showSalary` prop)
- The fix is isolated to one function in one file
- All existing functionality preserved - only the data access method changes

## Audit Confirmation

All other frontend queries to `position_history` were verified:
- `ProfileTimelineSheet.tsx`: Only selects non-sensitive fields (no salary)
- `PositionDialog.tsx`: Write operations only (INSERT/UPDATE), admin-restricted
- `DepartmentsSettings.tsx` & `FieldsSettings.tsx`: Write operations only, admin-restricted
- Edge functions: Server-side with service role, properly restricted

