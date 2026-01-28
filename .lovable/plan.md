
# Fix Database Error: "column p.user_id does not exist"

## Problem Identified

The recent migration (`20260128121722_10ab440d-c02d-409a-86d2-f7294a385391.sql`) introduced a bug in the chat sync trigger functions.

**Root Cause**: The JOIN condition uses `p.user_id` but the `profiles` table doesn't have a `user_id` column. Instead:
- `profiles.id` = the user's auth ID (same as `auth.users.id`)
- `employees.user_id` = references `profiles.id`

**Incorrect code in migration:**
```sql
LEFT JOIN profiles p ON p.user_id = e.user_id  -- WRONG: p.user_id doesn't exist!
```

**Correct code should be:**
```sql
LEFT JOIN profiles p ON p.id = e.user_id  -- CORRECT: profiles.id = employees.user_id
```

This error occurs in all three sync functions:
1. `sync_project_space_members()` - Lines 14, 65
2. `sync_company_space_members()` - Lines 133, 182
3. `sync_office_space_members()` - Lines 241, 292, 340

---

## Solution

Create a new migration to fix all JOIN conditions in the three sync functions.

### Database Migration

```sql
-- Fix sync_project_space_members: p.user_id → p.id
CREATE OR REPLACE FUNCTION sync_project_space_members()
  ...
  LEFT JOIN profiles p ON p.id = e.user_id  -- Fixed
  ...

-- Fix sync_company_space_members: p.user_id → p.id
CREATE OR REPLACE FUNCTION sync_company_space_members()
  ...
  LEFT JOIN profiles p ON p.id = e.user_id  -- Fixed
  ...

-- Fix sync_office_space_members: p.user_id → p.id
CREATE OR REPLACE FUNCTION sync_office_space_members()
  ...
  LEFT JOIN profiles p ON p.id = e.user_id  -- Fixed
  ...
```

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Fix JOIN conditions from `p.user_id` to `p.id` in all 3 sync functions |

---

## After Fix

Assigning projects to team members will work correctly again, and the auto-sync functionality will properly look up employee names from the `profiles` table.
