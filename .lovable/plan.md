

# Critical Security Fix: Employee Sensitive Data Exposure

## Executive Summary

A critical security vulnerability allows ANY logged-in user to view sensitive personal and financial information of other team members through browser DevTools network inspection, even when the UI properly hides this data. This occurs because the frontend directly queries the `employees` table with sensitive fields, and the RLS policies allow org members to read all columns.

## Vulnerability Analysis

### Evidence from Screenshot
The network response shows exposed sensitive data for another team member:
- `id_number`: "GH0031"
- `tax_number`: "146282173"
- `remuneration`: 540000.00
- `remuneration_currency`: "NPR"
- `emergency_contact_name`: "Mukunda Neupane"
- `emergency_contact_phone`: "977 9746507924"
- `emergency_contact_relationship`: "Brother"

### Root Cause

1. **Direct Table Query in `TeamMemberProfile.tsx`** (lines 364-409):
   ```typescript
   const { data } = await supabase.from("employees").select(`
       id, user_id, status, position, department,
       salary,                    // SENSITIVE - EXPOSED
       id_number,                 // SENSITIVE - EXPOSED
       tax_number,                // SENSITIVE - EXPOSED
       remuneration,              // SENSITIVE - EXPOSED
       bank_details,              // SENSITIVE - EXPOSED
       emergency_contact_name,    // SENSITIVE - EXPOSED
       emergency_contact_phone,   // SENSITIVE - EXPOSED
       ...
   `).eq("id", id).single();
   ```

2. **RLS Policy Gap**: While restrictive policies exist for HR/Admin/Managers/Self, the generic "Require authentication for employees" policy combined with user-specific SELECT policies allows data to be returned if *any* SELECT policy matches. The "Managers can view direct reports" and "Users can view own employee record" policies correctly restrict row access, but once a row is accessible (e.g., to HR/Admin), ALL columns are returned.

3. **Secure RPC Function Exists But Not Used**: The `get_employee_for_viewer` function already implements proper field-level security:
   - Financial data (salary, tax, bank, ID number): Only self, HR, Admin
   - Personal data (phone, address, emergency contacts): Self, HR, Admin, Manager
   - But `TeamMemberProfile.tsx` bypasses this function entirely

### Impact Assessment

| Data Type | Current Access | Required Access |
|-----------|---------------|-----------------|
| Salary, Remuneration | All org members via network | Self, HR, Admin only |
| Tax Number, ID Number | All org members via network | Self, HR, Admin only |
| Bank Details | All org members via network | Self, HR, Admin only |
| Emergency Contacts | All org members via network | Self, HR, Admin, Manager |
| Personal Email, Address | All org members via network | Self, HR, Admin, Manager |

## System-Wide Audit Results

### Affected Components

| File | Issue | Severity |
|------|-------|----------|
| `src/pages/TeamMemberProfile.tsx` | Direct query with ALL sensitive fields | CRITICAL |
| `src/pages/TeamMemberProfile.tsx` | `position_history` query includes salary | HIGH |

### Already Secure Components

| File | Why Secure |
|------|------------|
| `src/services/useEmployees.ts` | Uses `get_employee_for_viewer` RPC |
| `src/pages/Home.tsx` | Only queries `id, date_of_birth, join_date, profiles` |
| `src/components/dialogs/InviteTeamMemberDialog.tsx` | Only queries `department`, `id, profiles` |
| Payroll tables | RLS policies restrict to HR/Admin/Owner only |
| Performance reviews | RLS policies restrict appropriately |

## Solution

### Phase 1: Fix TeamMemberProfile.tsx (Frontend)

Replace the vulnerable `loadEmployee()` function to use the secure RPC:

```typescript
const loadEmployee = async () => {
  if (!id) return;
  
  // Use secure RPC that enforces field-level access control
  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_employee_for_viewer', { target_employee_id: id });
    
  if (rpcError || !rpcData?.[0]) {
    setLoading(false);
    return;
  }
  
  const emp = rpcData[0];
  
  // Fetch related data (profile, office, manager) separately
  // These queries only fetch non-sensitive fields
  const { data: relatedData } = await supabase
    .from('employees')
    .select(`
      profiles!inner(full_name, email, avatar_url),
      offices(name, city, country)
    `)
    .eq('id', id)
    .single();

  // Map RPC response - sensitive fields will be NULL if unauthorized
  setEmployee({
    id: emp.emp_id,
    user_id: emp.emp_user_id,
    organization_id: emp.emp_organization_id,
    position: emp.emp_position,
    department: emp.emp_department,
    status: emp.emp_status,
    // ... basic fields
    // Sensitive fields - RPC returns NULL if viewer lacks permission
    salary: emp.emp_salary,
    tax_number: emp.emp_tax_number,
    id_number: emp.emp_id_number,
    remuneration: emp.emp_remuneration,
    remuneration_currency: emp.emp_remuneration_currency,
    bank_details: emp.emp_bank_details,
    emergency_contact_name: emp.emp_emergency_contact_name,
    emergency_contact_phone: emp.emp_emergency_contact_phone,
    emergency_contact_relationship: emp.emp_emergency_contact_relationship,
    phone: emp.emp_phone,
    personal_email: emp.emp_personal_email,
    // ... address fields
    profiles: relatedData?.profiles,
    offices: relatedData?.offices,
  });
  
  // Continue with manager/office count loading...
};
```

### Phase 2: Fix Position History Query

Create a secure RPC for position history that hides salary for unauthorized viewers:

```sql
CREATE OR REPLACE FUNCTION get_position_history_for_viewer(target_employee_id uuid)
RETURNS TABLE (
  ph_id uuid,
  ph_position text,
  ph_department text,
  ph_salary numeric,
  ph_manager_id uuid,
  ph_effective_date date,
  ph_end_date date,
  ph_change_type text,
  ph_notes text,
  ph_employment_type text,
  ph_is_current boolean,
  ph_manager_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_id uuid := auth.uid();
  is_self boolean;
  is_hr_or_admin boolean;
  can_view_salary boolean;
BEGIN
  -- Determine viewer permissions
  is_self := (SELECT e.user_id FROM employees e WHERE e.id = target_employee_id) = viewer_id;
  is_hr_or_admin := has_role(viewer_id, 'hr'::app_role) OR has_role(viewer_id, 'admin'::app_role);
  can_view_salary := is_self OR is_hr_or_admin;
  
  RETURN QUERY
  SELECT
    ph.id,
    ph.position,
    ph.department,
    CASE WHEN can_view_salary THEN ph.salary ELSE NULL END,
    ph.manager_id,
    ph.effective_date,
    ph.end_date,
    ph.change_type,
    ph.notes,
    ph.employment_type,
    ph.is_current,
    p.full_name
  FROM position_history ph
  LEFT JOIN employees m ON m.id = ph.manager_id
  LEFT JOIN profiles p ON p.id = m.user_id
  WHERE ph.employee_id = target_employee_id
  ORDER BY ph.effective_date DESC;
END;
$$;
```

Then update `loadPositionHistory()` in TeamMemberProfile.tsx to use this RPC.

### Phase 3: Database Hardening (Optional but Recommended)

Add a comment documenting the security model:

```sql
COMMENT ON TABLE employees IS 
'Employee records with sensitive PII. 
SECURITY: Always use get_employee_for_viewer() RPC for profile views.
Direct table queries should only select non-sensitive columns.';
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/TeamMemberProfile.tsx` | Refactor `loadEmployee()` to use `get_employee_for_viewer` RPC |
| `src/pages/TeamMemberProfile.tsx` | Refactor `loadPositionHistory()` to use secure RPC or hide salary client-side |
| Database migration | Create `get_position_history_for_viewer` RPC function |

## Validation Steps

After implementation:
1. Login as a regular member (not HR/Admin/Owner)
2. Navigate to another team member's profile
3. Open browser DevTools and go to Network tab
4. Verify the RPC response shows `null` for:
   - `emp_salary`
   - `emp_tax_number`
   - `emp_id_number`
   - `emp_remuneration`
   - `emp_remuneration_currency`
   - `emp_bank_details`
5. Verify UI displays "—" or hides these sections appropriately
6. Test as HR/Admin to confirm they CAN see all data
7. Test as the employee themselves to confirm self-access works

## Security Considerations

- This is a data breach scenario - sensitive PII is currently exposed
- The fix should be deployed immediately
- The existing `get_employee_for_viewer` RPC provides the correct security model
- No RLS policy changes needed - the issue is frontend code bypassing the secure RPC
- Position history also exposes salary which needs fixing

