

# Fix: Gender Value Mismatch Causing "Failed to save your profile"

## Root Cause

The `employees` table has a CHECK constraint on the `gender` column that only allows these values:
- `male`
- `female`
- `other`
- `prefer_not_to_say` (with underscores)

However, the `OwnerProfileStep.tsx` form sends these values:
- `male` (OK)
- `female` (OK)
- `non-binary` (REJECTED -- not in constraint)
- `prefer-not-to-say` (REJECTED -- uses hyphens instead of underscores)

This CHECK constraint violation causes the INSERT/UPDATE to fail silently with an "Unknown error" toast.

## Fix

Two changes are needed:

### 1. Database Migration: Update the CHECK constraint

Update the `employees_gender_check` constraint to accept both `non-binary` and the corrected `prefer-not-to-say` value, aligning with the frontend options.

```sql
ALTER TABLE public.employees DROP CONSTRAINT employees_gender_check;
ALTER TABLE public.employees ADD CONSTRAINT employees_gender_check 
  CHECK (gender IN ('male', 'female', 'other', 'non-binary', 'prefer_not_to_say', 'prefer-not-to-say') OR gender IS NULL);
```

### 2. Frontend: Align gender option values to database convention

Update `GENDER_OPTIONS` in `OwnerProfileStep.tsx` to use underscores (matching the DB convention used across the system):

| Current Value | New Value |
|---|---|
| `non-binary` | `non-binary` (keep, now allowed in DB) |
| `prefer-not-to-say` | `prefer_not_to_say` (align with DB convention) |

Alternatively, standardize everything with hyphens (simpler for the user) and update the constraint accordingly. The plan above supports both formats in the constraint for backwards compatibility.

## Files to Modify

| Type | Change |
|------|--------|
| Database migration | Update `employees_gender_check` constraint to include `non-binary` and accept both `prefer_not_to_say` and `prefer-not-to-say` |
| `src/components/onboarding/wizard/OwnerProfileStep.tsx` | Update `GENDER_OPTIONS` value for "Prefer not to say" to `prefer_not_to_say` |

