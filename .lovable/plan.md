
# Leave Management & Attendance System - Audit Report & Improvement Plan

## Audit Summary

I conducted a thorough review of the Leave Management and Attendance system covering:
- **Leave.tsx** - Personal leave page with balance display and request submission
- **OrgLeaveHistory.tsx** (2,220 lines) - Admin/HR leave history with analytics, records, pending tabs
- **OrgAttendanceHistory.tsx** (2,039 lines) - Admin/HR attendance history with analytics
- **PendingLeaveApprovals.tsx** (848 lines) - Leave approval workflow with optimistic UI
- **Edge functions** - notify-leave-request, notify-leave-decision for email notifications
- **Services** - useLeave.ts, useAttendance.ts, useLeaveRealtime.ts
- **RLS Policies** - Verified proper tenant isolation and role-based access

---

## What's Working Well

| Feature | Status | Notes |
|---------|--------|-------|
| Office-centric leave types | Working | Migrated from legacy leave_types to office_leave_types |
| Leave balance tracking | Working | Real-time updates via useLeaveBalanceRealtime |
| Leave request workflow | Working | Submit, approve, reject with notifications |
| Attendance QR check-in | Working | Validates QR code and location |
| Manager/HR backup approvals | Working | HR can approve when manager is on leave |
| Multi-tenant isolation | Working | RLS policies use is_own_employee, is_manager_of_employee |
| Email notifications | Working | Resend integration with rate limiting |
| Optimistic UI updates | Working | Instant feedback on approval actions |

---

## Issues Found

### Critical Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **No unit tests for leave services** | No test coverage for useLeave.ts mutations | Missing test file |
| **RLS policies flagged as "Always True"** | 5 policies use overly permissive expressions | Database security linter |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **Large file sizes** | OrgLeaveHistory (2,220 lines), OrgAttendanceHistory (2,039 lines) hard to maintain | Multiple files |
| **No loading skeleton in Leave page** | Only shows spinner, no content placeholders | Leave.tsx |
| **Missing confirmation for bulk leave delete** | Users may accidentally delete multiple records | OrgLeaveHistory.tsx |
| **No offline support for leave requests** | Leave requests fail silently if offline | AddLeaveRequestDialog.tsx |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No empty state animation for pending approvals | Less engaging UX | PendingLeaveApprovals.tsx |
| Missing keyboard shortcuts for approval actions | Slower workflow for power users | PendingLeaveApprovals.tsx |
| Half-day leave UI could be clearer | Users may not understand first/second half | AddLeaveRequestDialog.tsx |

---

## Implementation Plan

### Phase 1: Add Unit Tests for Leave Services

Create test file: `src/test/services/useLeave.test.ts`

Tests to cover:
- useOfficeLeaveTypesQuery fetches correct office leave types
- useLeaveBalances returns properly mapped balance data
- useCreateLeaveRequest validates min_days_advance
- useUpdateLeaveStatus updates status and invalidates queries
- useCancelLeaveRequest restores balance for approved requests

### Phase 2: Improve Loading States

In `src/pages/Leave.tsx`:
- Replace spinner with skeleton UI showing balance cards and request list placeholders
- Add proper empty state with illustration when no balances exist
- Add subtle animation when balance updates in real-time

### Phase 3: Add Keyboard Shortcuts for Approvals

In `src/components/PendingLeaveApprovals.tsx`:
- Add keyboard navigation (arrow keys to move between requests)
- Add A key for approve, R key for reject when focused
- Add visual indicator for keyboard focus

### Phase 4: Extract Shared Components

For maintainability, extract from large files:
- `LeaveAnalyticsFilters.tsx` - Date range, employee, type filters
- `AttendanceRecordRow.tsx` - Individual attendance record display
- `LeaveStatsCards.tsx` - Statistics summary cards

---

## Files to Modify/Create

| File | Action | Priority | Changes |
|------|--------|----------|---------|
| `src/test/services/useLeave.test.ts` | Create | High | Add unit tests for leave mutations |
| `src/pages/Leave.tsx` | Modify | Medium | Add skeleton loading states |
| `src/components/PendingLeaveApprovals.tsx` | Modify | Low | Add keyboard shortcuts |
| `src/components/leave/LeaveStatsCards.tsx` | Create | Low | Extract from OrgLeaveHistory |

---

## Security Observations

The database linter flagged 5 RLS policies as "Always True" but these appear to be on non-leave/attendance tables. The leave and attendance RLS policies correctly use:
- `is_own_employee(employee_id)` for user access
- `is_manager_of_employee(employee_id)` for manager access  
- Role checks via `user_roles` table for HR/Admin access

The current implementation properly:
1. Scopes all queries by organization_id
2. Uses SECURITY DEFINER functions to prevent recursive RLS issues
3. Validates user authentication in edge functions
4. Implements rate limiting for notification endpoints

---

## Expected Outcome

After implementing these improvements:
1. Leave service hooks have comprehensive unit test coverage
2. Better UX with skeleton loading states during data fetching
3. Power users can approve/reject leave faster with keyboard shortcuts
4. Codebase is more maintainable with extracted shared components
5. Consistent patterns across Leave and Attendance modules
