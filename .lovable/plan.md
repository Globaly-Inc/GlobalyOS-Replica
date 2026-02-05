# Office-Centric Leave Migration - COMPLETED

## Status: ✅ Complete

All legacy `leave_type_id` references have been migrated to use `office_leave_type_id`.

### Database Functions Fixed
- `handle_leave_request_delete` - Uses office_leave_type_id for balance refunds
- `handle_leave_request_approval` - Uses office_leave_type_id for balance deductions
- `handle_leave_proration_on_offboarding` - Joins office_leave_types, uses office_leave_type_id
- `handle_leave_request_cancellation` - Uses office_leave_type_id for balance restoration

### Frontend Updates
- `src/types/leave.ts` - LeaveTypeBalance now uses office_leave_type_id
- `src/pages/BulkLeaveImport.tsx` - Resolves office_leave_type_id by employee office + leave type name
- `src/test/flows/leave-request.test.ts` - Mock data updated to use office_leave_type_id

