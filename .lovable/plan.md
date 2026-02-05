

# Fix: Owner Cannot Create Employee Record During Onboarding

## Root Cause

Kavita (user `deebf648-23ad-495b-98d2-7891fc4ead09`) is the owner of "Kavita Demo" org (`51dcdc4b-5cfb-475e-b950-68b534df8046`). She has the role `owner` in `user_roles`.

The `employees` table INSERT policy only permits `hr` or `admin` roles:

```sql
-- Current policy: "HR and admins can create employees"
WITH CHECK (has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'admin'))
```

Since `owner` is not included, the insert is silently rejected by RLS, resulting in "Failed to save your profile: Unknown error."

## Fix

Update the INSERT RLS policy on `employees` to also allow:
1. **Owners** to insert employee records (they need to create their own record during onboarding)
2. **Users inserting their own record** (`user_id = auth.uid()`) -- this is the safest approach since it covers all onboarding scenarios without over-granting permissions

## Database Migration

```sql
-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "HR and admins can create employees" ON public.employees;

-- Create updated INSERT policy that also allows owners and self-insert during onboarding
CREATE POLICY "HR admins owners can create employees"
  ON public.employees
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'hr'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
    OR (user_id = auth.uid() AND is_org_member(auth.uid(), organization_id))
  );
```

The last condition (`user_id = auth.uid() AND is_org_member(auth.uid(), organization_id)`) allows any authenticated org member to create their own employee record -- essential for the onboarding flow. The `is_org_member` check ensures they can only do this within their own organization.

## No Frontend Changes Required

The `OwnerProfileStep.tsx` code is correct -- the insert/update logic works fine once RLS permits it.

## Files to Modify

| Type | Change |
|------|--------|
| Database migration | Update INSERT policy on `employees` table |

