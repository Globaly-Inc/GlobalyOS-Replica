

# Comprehensive Migration: Legacy leave_type_id to Office-Centric Architecture

## Summary

The leave management system has been partially migrated to the office-centric model, but several database trigger functions and UI components still contain legacy references that cause failures. The legacy `leave_types` table and `leave_type_id` columns have already been dropped from the database, but several functions still reference them and will fail.

## Current State Analysis

### Database Schema (Already Cleaned)
| Component | Status |
|-----------|--------|
| `leave_types` table | Dropped |
| `leave_type_balances.leave_type_id` column | Dropped |
| `leave_balance_logs.leave_type_id` column | Dropped |
| `leave_requests.leave_type_id` column | Dropped |
| `office_leave_types` table | Active (primary) |
| `leave_type_balances.office_leave_type_id` | Active (required) |
| `leave_balance_logs.office_leave_type_id` | Active (nullable) |
| `leave_requests.office_leave_type_id` | Active (nullable) |

### Database Functions with Legacy Code

| Function | Issue | Impact |
|----------|-------|--------|
| `handle_leave_request_approval` | Contains fallback to `leave_types` table (lines 50-109) | Will fail silently if office leave type not found |
| `handle_leave_proration_on_offboarding` | Uses `leave_type_id` column and joins `leave_types` table | Will crash when setting resignation |
| `handle_leave_request_cancellation` | Has legacy fallback block referencing `leave_types` and `leave_type_id` | Will fail on cancellation |

### Frontend Issues

| File | Issue |
|------|-------|
| `src/types/leave.ts` | `LeaveTypeBalance` interface uses `leave_type_id` instead of `office_leave_type_id` |
| `src/pages/BulkLeaveImport.tsx` | Does not set `office_leave_type_id` when inserting balance logs or leave requests |
| `src/test/flows/leave-request.test.ts` | Test references `leave_type_id` in mocks |

## Solution Plan

### Phase 1: Database Function Updates

**Migration 1: Remove Legacy Fallbacks from Trigger Functions**

Update 3 database functions to remove legacy code that references non-existent tables/columns:

1. **`handle_leave_request_approval`**
   - Remove the fallback block (lines 44-110) that tries to look up `leave_types` table
   - Keep only the office-centric logic
   - If no office_leave_type found, raise an informative notice and skip balance operations

2. **`handle_leave_proration_on_offboarding`**
   - Change from joining `leave_types` to joining `office_leave_types`
   - Use `office_leave_type_id` instead of `leave_type_id` in log insertion
   - Update the FOR loop to select from balances with office_leave_type_id

3. **`handle_leave_request_cancellation`**
   - Remove the legacy fallback block that references `leave_types` table
   - Keep only the office-centric restoration logic

### Phase 2: Frontend Code Updates

**1. Update TypeScript Types (`src/types/leave.ts`)**

```text
LeaveTypeBalance interface:
  - Change `leave_type_id: string` to `office_leave_type_id: string`
```

**2. Fix BulkLeaveImport (`src/pages/BulkLeaveImport.tsx`)**

For opening balance imports:
- Look up the employee's office_id first
- Find the matching office_leave_type by name + office_id
- Include `office_leave_type_id` in the leave_balance_logs insert

For leave request imports:
- Look up employee's office_id
- Find matching office_leave_type_id
- Include `office_leave_type_id` in the leave_requests insert

**3. Update Test Mocks (`src/test/flows/leave-request.test.ts`)**

- Change mock data to use `office_leave_type_id` instead of `leave_type_id`
- Update RPC function parameter names if needed

### Phase 3: Verification

After implementation:
1. Test office change for employees (Kavita)
2. Test leave deletion (Tula Bahadur Gurung)
3. Test resignation/offboarding proration
4. Test leave cancellation flow
5. Test bulk leave import with opening balances
6. Test bulk leave import with leave requests

## Technical Details

### handle_leave_proration_on_offboarding - Current vs Fixed

```text
Current (Broken):
FOR v_leave_type IN 
  SELECT ltb.id, ltb.leave_type_id, ltb.balance, lt.default_days, lt.name
  FROM leave_type_balances ltb
  JOIN leave_types lt ON lt.id = ltb.leave_type_id
  WHERE ltb.employee_id = NEW.id ...

Fixed:
FOR v_leave_type IN 
  SELECT ltb.id, ltb.office_leave_type_id, ltb.balance, olt.default_days, olt.name
  FROM leave_type_balances ltb
  JOIN office_leave_types olt ON olt.id = ltb.office_leave_type_id
  WHERE ltb.employee_id = NEW.id ...
```

### BulkLeaveImport - Enhanced Logic

```text
Opening Balance Flow:
1. Get employee by email -> get employee.office_id
2. Find office_leave_type where office_id + name match
3. Insert into leave_balance_logs with office_leave_type_id

Leave Request Flow:
1. Get employee by email -> get employee.office_id  
2. Find office_leave_type where office_id + name match
3. Insert into leave_requests with office_leave_type_id
```

## Files to Create/Modify

| Type | File | Description |
|------|------|-------------|
| Migration | `supabase/migrations/[timestamp]_cleanup_legacy_leave_type_references.sql` | Update 3 trigger functions to remove legacy code |
| Update | `src/types/leave.ts` | Fix interface to use office_leave_type_id |
| Update | `src/pages/BulkLeaveImport.tsx` | Add office_leave_type_id resolution and insertion |
| Update | `src/test/flows/leave-request.test.ts` | Fix test mocks to use new column names |

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Existing approved leaves without office_leave_type_id | Functions already handle NULL gracefully |
| Employee without office assignment | Functions already skip balance operations with notice |
| Bulk import with unknown leave types | Will fail gracefully with clear error message |

