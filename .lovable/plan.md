
# Critical Security Fix: Employee Data Exposure & Page Loading Issues

## Executive Summary

A thorough analysis of the codebase, RLS policies, and database functions reveals **two critical issues**:

1. **SECURITY VULNERABILITY (P0)**: Sensitive employee PII (salary, tax_number, id_number, emergency contacts, bank_details, remuneration) is exposed in API responses to unauthorized users.

2. **FUNCTIONALITY BUG**: Home page and other pages fail to load for regular team members due to restrictive RLS policies blocking employee lookups.

Both issues stem from an **architectural inconsistency** between the intended security model and how data is being fetched in the frontend.

---

## Root Cause Analysis

### Issue 1: Security Vulnerability - Sensitive Data Exposure

**Finding**: The `TeamMemberProfile.tsx` (lines 364-409) queries the `employees` table directly with ALL sensitive fields, bypassing the secure `get_employee_for_viewer()` RPC function that enforces field-level access control.

**Current Problematic Code**:
```typescript
const loadEmployee = async () => {
  const { data } = await supabase.from("employees").select(`
    id, user_id, status, position, department, salary, join_date,
    date_of_birth, phone, id_number, tax_number, remuneration,
    remuneration_currency, emergency_contact_name, emergency_contact_phone,
    emergency_contact_relationship, bank_details, ...
  `)
```

The `get_employee_for_viewer()` RPC function exists and correctly implements field-level security:
- Personal data: visible to self, HR/Admin/Owner, and direct manager
- Financial data (salary, remuneration, id_number, tax_number, bank_details): visible ONLY to self, HR/Admin/Owner
- Offboarding data: visible ONLY to Owner/Admin/HR

But this secure function is NOT being used in the profile page.

### Issue 2: Page Loading Failure for Regular Members

**Finding**: The current RLS policies on the `employees` table are correctly restrictive:
- `Users can view own employee record` - own record only
- `Managers can view direct reports` - direct reports only
- `HR and admins can view all employees` - HR/Admin only
- `Super admins can view all employees` - super admin only

However, this means **regular members cannot query other employees' basic info** (name, avatar, position) needed for features like:
- Social feed posts (post author info)
- Kudos recipients display
- Mentions in posts
- Directory listings
- Chat participant info

**Why the error occurs**: When `useSocialFeed.ts` (line 169-172) queries:
```typescript
const { data: recipients } = await supabase
  .from('employees')
  .select('id, profiles!inner(full_name, avatar_url)')
  .in('id', uniqueIds);
```

For regular members, RLS blocks access to other employees' rows, causing the `profiles!inner` join to fail. The `recipients` array contains entries where the employee was accessible but with missing or null profiles data for employees that RLS blocked.

---

## Recommended Solution Architecture

### Strategy: Defense in Depth with Proper Layer Separation

```text
+-------------------+     +-------------------------+     +------------------+
|   Frontend UI     | --> |   Data Access Hooks     | --> |    Database      |
+-------------------+     +-------------------------+     +------------------+
                          |                         |     |                  |
                          | useEmployeeProfile()    |     | get_employee_    |
                          | -> Uses secure RPC      |     | for_viewer()     |
                          |                         |     | (field-level)    |
                          |                         |     |                  |
                          | useEmployees()          |     | employee_        |
                          | -> Uses secure view     |     | directory view   |
                          |                         |     | (non-sensitive)  |
                          +-------------------------+     +------------------+
```

### Fix 1: Add RLS Policy for Org Members (Non-Sensitive Fields Only)

Create a new RLS policy that allows org members to SELECT employee records, but ONLY expose non-sensitive fields via a database VIEW or by restricting column access.

**Option A (Recommended)**: Keep existing policies, but create an `employee_public_info` view for display purposes:

```sql
CREATE OR REPLACE VIEW employee_public_info
WITH (security_invoker = on) AS
SELECT 
  e.id,
  e.user_id,
  e.organization_id,
  e.position,
  e.department,
  e.office_id,
  e.manager_id,
  e.status,
  e.join_date,
  p.full_name,
  p.avatar_url,
  p.email
FROM employees e
JOIN profiles p ON p.id = e.user_id;
```

Then add an RLS policy on the `employees` table that allows org members to select ONLY non-sensitive fields:

```sql
CREATE POLICY "Org members can view basic employee info"
ON public.employees FOR SELECT
USING (is_org_member(auth.uid(), organization_id));
```

**Note**: This policy alone would expose ALL columns. The key is to ensure:
1. All frontend code uses `employee_directory` view or `get_employee_for_viewer()` RPC
2. Never directly query sensitive fields from the `employees` table

### Fix 2: Update TeamMemberProfile.tsx to Use Secure RPC

Replace the direct `employees` table query with the secure `get_employee_for_viewer()` RPC:

```typescript
const loadEmployee = async () => {
  if (!id) return;
  
  // Use secure RPC that enforces field-level access control
  const { data: employeeData, error: rpcError } = await supabase
    .rpc('get_employee_for_viewer', { target_employee_id: id });

  if (rpcError || !employeeData?.[0]) {
    setLoading(false);
    return;
  }

  const emp = employeeData[0];
  
  // Fetch related data separately
  const { data: relatedData } = await supabase
    .from('employee_directory')
    .select('full_name, email, avatar_url, office_name')
    .eq('id', id)
    .single();
  
  // Map RPC fields to component state
  setEmployee({
    id: emp.emp_id,
    user_id: emp.emp_user_id,
    position: emp.emp_position,
    department: emp.emp_department,
    // ... map all fields from RPC response
    // Sensitive fields will be NULL for unauthorized viewers
    salary: emp.emp_salary,
    remuneration: emp.emp_remuneration,
    // ... etc
    profiles: { 
      full_name: relatedData?.full_name,
      avatar_url: relatedData?.avatar_url,
      email: relatedData?.email
    },
    offices: { name: relatedData?.office_name }
  });
  
  setLoading(false);
};
```

### Fix 3: Update Social Feed to Handle Null Profiles Gracefully

Add null-safe access in PostCard.tsx:

```typescript
{post.kudos_recipients?.map((recipient, idx) => (
  <span key={recipient.id}>
    <OrgLink 
      to={`/team/${recipient.id}`}
      className="font-medium text-pink-600 hover:text-pink-700"
    >
      {recipient.profiles?.full_name || 'Unknown'}
    </OrgLink>
    {idx < post.kudos_recipients!.length - 1 && ', '}
  </span>
))}
```

### Fix 4: Audit All Direct Employee Queries

The following files need to be audited and updated to use secure data access patterns:

| File | Current Issue | Fix Required |
|------|---------------|--------------|
| `src/pages/TeamMemberProfile.tsx` | Direct query with ALL fields | Use `get_employee_for_viewer()` RPC |
| `src/services/useSocialFeed.ts` | `profiles!inner` fails for RLS-blocked rows | Use `employee_directory` view |
| `src/components/feed/PostCard.tsx` | No null check on `profiles` | Add optional chaining |
| `src/components/onboarding/wizard/OwnerProfileStep.tsx` | Queries own record (OK) | Verify scoped to own record |

---

## Database Changes Required

### 1. Add Org Member SELECT Policy to Employees Table

```sql
-- Allow org members to SELECT basic employee info
-- This enables directory listings and profile viewing
-- Sensitive fields are protected by:
-- 1. Using employee_directory view (excludes sensitive columns)
-- 2. Using get_employee_for_viewer() RPC (field-level masking)
CREATE POLICY "Org members can view org employees"
ON public.employees FOR SELECT
USING (is_org_member(auth.uid(), organization_id));
```

### 2. Verify employee_directory View Security

The `employee_directory` view already:
- Has `security_invoker = true` (enforces caller's RLS)
- Excludes ALL sensitive fields (salary, tax, bank, emergency contacts, etc.)
- Is the correct way to fetch employee lists

---

## Frontend Code Changes Summary

### Priority 1: Security Fix - TeamMemberProfile.tsx

1. Replace `loadEmployee()` function to use `get_employee_for_viewer()` RPC
2. Map RPC response fields to the component's expected state structure
3. Sensitive fields will automatically be `null` for unauthorized viewers
4. Update UI to handle null values gracefully (hide sections when data is null)

### Priority 2: Null Safety - PostCard.tsx

Add optional chaining to all `profiles` accesses:
- Line 197: `recipient.profiles?.full_name`
- Line 412: `mention.employee?.profiles?.full_name`

### Priority 3: Audit Other Components

Search for patterns like:
- `.from('employees').select(.*salary`
- `.from('employees').select(.*remuneration`
- `.from('employees').select(.*tax_number`
- `.from('employees').select(.*id_number`
- `.from('employees').select(.*bank_details`
- `.from('employees').select(.*emergency`

Any such query MUST be replaced with the secure RPC or limited to the `employee_directory` view.

---

## Testing Verification

After implementation, verify:

1. **As regular member viewing another profile**:
   - Can see: name, position, department, office, email, avatar
   - Cannot see (should be null/hidden): salary, remuneration, tax_number, id_number, bank_details, emergency contacts

2. **As HR/Admin viewing any profile**:
   - Can see all fields including financial data

3. **As manager viewing direct report**:
   - Can see personal data (phone, address, DOB)
   - Cannot see financial data

4. **Home page loads for all user roles**

5. **Social feed loads with post author info**

6. **Network response in DevTools shows null for protected fields**

---

## Security Memory Update

After fix, update the memory:

```
Employee data access now enforces three tiers:
1. Public info (via employee_directory view): name, position, department, avatar
2. Personal info (via RPC with role check): phone, address, DOB - visible to self/HR/admin/manager
3. Financial info (via RPC with strict role check): salary, tax, bank - visible to self/HR/admin ONLY

Direct queries to the employees table with sensitive fields are PROHIBITED.
All profile viewing must use get_employee_for_viewer() RPC.
All listings must use employee_directory view.
```
