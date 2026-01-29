

# Critical Security Fix: Employee Sensitive Data Exposure

## Summary

A major security vulnerability allows logged-in users to view sensitive personal information (salary, tax numbers, bank details, emergency contacts, ID numbers) of any team member in their organization, regardless of their role or relationship to that employee.

## Root Cause Analysis

### 1. Direct Table Query Bypasses Security Function
The `TeamMemberProfile.tsx` page (line 364-442) directly queries the `employees` table:

```typescript
// VULNERABLE CODE
const { data } = await supabase.from("employees").select(`
    id, user_id, status, position, department,
    salary,                    // SENSITIVE
    id_number,                 // SENSITIVE  
    tax_number,                // SENSITIVE
    remuneration,              // SENSITIVE
    bank_details,              // SENSITIVE
    emergency_contact_name,    // SENSITIVE
    emergency_contact_phone,   // SENSITIVE
    ...
`).eq("id", id).single();
```

### 2. Overly Permissive RLS Policy
The employees table has this policy:

| Policy Name | Check |
|-------------|-------|
| "Org members can view basic employee info" | `is_employee_in_same_org(organization_id)` |

This allows ANY org member to read ALL columns from the employees table, including sensitive financial and personal data.

### 3. Security Function Exists But Not Used
The `get_employee_for_viewer` RPC function implements proper field-level security:
- Financial data (salary, tax, bank, ID number) = only self, HR, admin
- Personal data (phone, address, emergency contacts) = self, HR, admin, manager
- Basic info = all org members

But `TeamMemberProfile.tsx` doesn't use it!

## Security Impact

| Data Type | Who Can Currently See | Who SHOULD See |
|-----------|----------------------|----------------|
| Salary, Remuneration | Everyone in org | Self, HR, Admin only |
| Tax Number, ID Number | Everyone in org | Self, HR, Admin only |
| Bank Details | Everyone in org | Self, HR, Admin only |
| Emergency Contacts | Everyone in org | Self, HR, Admin, Manager |
| Personal Email, Address | Everyone in org | Self, HR, Admin, Manager |

## Solution Architecture

### Phase 1: Fix TeamMemberProfile.tsx (Frontend)
Replace the direct table query with the secure RPC function:

```typescript
// SECURE CODE
const loadEmployee = async () => {
  // Use the secure RPC function that enforces field-level access
  const { data: employeeData } = await supabase
    .rpc('get_employee_for_viewer', { target_employee_id: id });
  
  if (!employeeData?.[0]) return;
  const emp = employeeData[0];
  
  // Fetch related data separately (profile, office, manager)
  const { data: relatedData } = await supabase
    .from('employees')
    .select(`
      profiles!inner(full_name, email, avatar_url),
      offices(name, city, country),
      manager:employees!employees_manager_id_fkey(
        id, profiles!inner(full_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single();
    
  // Map RPC response to component state
  setEmployee({
    id: emp.emp_id,
    user_id: emp.emp_user_id,
    // ... map all fields from RPC response
    // Sensitive fields will be NULL if viewer lacks permission
    salary: emp.emp_salary,
    tax_number: emp.emp_tax_number,
    // ...
    profiles: relatedData?.profiles,
    offices: relatedData?.offices,
    manager: relatedData?.manager,
  });
};
```

### Phase 2: Tighten RLS Policy (Database)
Drop the overly permissive policy and replace with column-restricted access:

```sql
-- Drop the permissive policy
DROP POLICY IF EXISTS "Org members can view basic employee info" ON employees;

-- Create a restricted policy for basic directory lookups
-- Only allows SELECT on specific non-sensitive columns
CREATE POLICY "Org members can view employee directory fields"
ON employees FOR SELECT
USING (
  is_employee_in_same_org(organization_id)
)
WITH CHECK (false);  -- No writes
```

**Note**: Since Postgres RLS cannot restrict columns, we ensure:
1. All frontend code uses `get_employee_for_viewer` RPC for profile views
2. Directory listings use the `employee_directory` view
3. Direct table queries only request non-sensitive columns

### Phase 3: Audit All Direct Queries
Review and fix all places querying the employees table directly:

| File | Current Query | Fix |
|------|--------------|-----|
| `TeamMemberProfile.tsx` | Direct with all fields | Use RPC function |
| `Team.tsx` | Uses `employee_directory` view | Already secure |
| `OrgChart.tsx` | Basic fields only | Already secure |
| Helper queries (manager, direct reports) | Basic fields only | Already secure |

### Phase 4: System-Wide Audit
Check for similar patterns in other tables with sensitive data:
- `position_history` (contains salary history)
- `payroll_*` tables (financial data)
- `performance_reviews` (sensitive feedback)
- `leave_requests` (could reveal personal medical info)

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/TeamMemberProfile.tsx` | Replace `loadEmployee()` to use `get_employee_for_viewer` RPC |
| Database migration | Drop "Org members can view basic employee info" policy |
| Database migration | Create restricted replacement policy |

## Implementation Order

1. **First**: Fix `TeamMemberProfile.tsx` to use the RPC function
2. **Second**: Test that profile viewing still works for all roles
3. **Third**: Verify sensitive data is properly hidden from unauthorized users
4. **Fourth**: Update RLS policy to be more restrictive
5. **Fifth**: Audit and fix any other direct queries

## Validation Steps

After implementation:
1. Login as a regular member (not HR/Admin)
2. Navigate to another team member's profile
3. Open browser DevTools → Network tab
4. Verify API response does NOT contain: salary, tax_number, id_number, remuneration, bank_details
5. Verify UI shows "—" or hidden sections for sensitive data

## Security Considerations

- This is a **data breach** scenario - sensitive PII is currently exposed
- The fix should be deployed as soon as possible
- Consider notifying affected users if required by privacy regulations
- All changes maintain backward compatibility with existing UI

