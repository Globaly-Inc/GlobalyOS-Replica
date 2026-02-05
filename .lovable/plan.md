

# Fix Leave Request Deletion - Missing Column Error

## Problem Summary
When trying to delete Tula Bahadur Gurung's leave record, the operation fails with "Failed to delete leave record". The database logs show:

```
ERROR: record "old" has no field "leave_type_id"
```

## Root Cause
The `handle_leave_request_delete` database trigger function is using legacy column names that were removed during the office-centric leave migration:

| What the function references | Current state |
|------------------------------|---------------|
| `OLD.leave_type_id` | Column was dropped from `leave_requests` |
| `leave_types` table | Table was dropped |
| `leave_type_balances.leave_type_id` | Column was dropped |
| `leave_balance_logs.leave_type_id` | Column was dropped |

The system now uses `office_leave_type_id` exclusively with the `office_leave_types` table.

## Solution

### Database Migration
Create a new migration that rewrites the `handle_leave_request_delete()` function to use the office-centric architecture:

**Key changes:**
1. Use `OLD.office_leave_type_id` instead of `OLD.leave_type_id`
2. Look up balances from `leave_type_balances` using `office_leave_type_id`
3. Insert log entries with `office_leave_type_id` instead of `leave_type_id`
4. Keep the same refund logic (restore balance when approved leave is deleted)

**Updated function logic:**
```text
1. Check if the leave being deleted was approved (skip if pending/rejected)
2. Get the office_leave_type_id from the leave request being deleted
3. If no office_leave_type_id, skip the balance refund (graceful handling)
4. Calculate the year from the leave start date
5. Get current balance from leave_type_balances using office_leave_type_id
6. Insert a refund log entry with office_leave_type_id (sync trigger will update the actual balance)
7. Allow the delete to proceed
```

## Technical Details

| Aspect | Before (Broken) | After (Fixed) |
|--------|-----------------|---------------|
| Leave type lookup | `OLD.leave_type_id` + fallback to `leave_types` table | `OLD.office_leave_type_id` directly |
| Balance lookup | `WHERE leave_type_id = v_leave_type_id` | `WHERE office_leave_type_id = v_office_leave_type_id` |
| Log insertion | Inserts `leave_type_id` column | Inserts `office_leave_type_id` column |

The existing `sync_balance_from_log` trigger will automatically update the `leave_type_balances` table when the refund log is inserted.

## Expected Outcome
After this fix:
- Deleting any leave request (pending, approved, rejected) will work correctly
- For approved leaves, the balance will be automatically refunded
- A log entry will be created showing the deletion and refund

## Files to Create
| File | Description |
|------|-------------|
| `supabase/migrations/[timestamp]_fix_handle_leave_request_delete_office_centric.sql` | Update the delete trigger to use office_leave_type_id |

