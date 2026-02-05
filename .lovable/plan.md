
# Fix "column p.user_id does not exist" Error When Changing Office

## Problem Summary
When you try to change Kavita's office from Australia to USA and click "Save", the error "column p.user_id does not exist" appears. This prevents any office changes from being saved.

## Root Cause
There are **4 database trigger functions** that run when employee records are updated. These functions contain an incorrect SQL join condition:

```text
Current (WRONG):
LEFT JOIN profiles p ON p.user_id = e.user_id

Should be:
LEFT JOIN profiles p ON p.id = e.user_id
```

The `profiles` table uses `id` as the user identifier (matching the auth system), not `user_id`. When you update an employee's office, the `sync_office_space_members` trigger fires and fails because it tries to use a column that doesn't exist.

## Affected Functions
| Function Name | Purpose |
|--------------|---------|
| `sync_office_space_members` | Updates chat space memberships when an employee's office changes |
| `sync_department_space_members` | Updates chat space memberships when an employee's department changes |
| `sync_company_space_members` | Updates chat space memberships when an employee's status changes |
| `sync_project_space_members` | Updates chat space memberships when an employee is added/removed from projects |

## Solution

### Database Migration
Create a new migration that fixes all 4 functions by changing the join from `p.user_id` to `p.id`:

```text
Fix the profiles join in:
1. sync_office_space_members() - Fix the join condition
2. sync_department_space_members() - Fix the join condition
3. sync_company_space_members() - Fix the join condition
4. sync_project_space_members() - Fix both INSERT and DELETE handling joins
```

Each function will be recreated with `CREATE OR REPLACE FUNCTION` using the corrected join:
```sql
LEFT JOIN profiles p ON p.id = e.user_id
```

## Technical Details

The migration will:
1. Create or replace all 4 functions with the corrected join condition
2. Keep all existing logic and functionality intact
3. Maintain `SECURITY DEFINER` and `SET search_path = public` for security
4. No triggers need to be modified (they already point to the correct functions)

## Expected Outcome
After this fix:
- Changing an employee's office will work correctly
- Changing an employee's department will work correctly
- Employee status changes will work correctly
- Project assignments will work correctly
- Chat space auto-sync will properly resolve employee names

## Files to Create
| File | Description |
|------|-------------|
| `supabase/migrations/[timestamp]_fix_profiles_join_in_sync_functions.sql` | Fix all 4 sync functions |
