

# Team Profile Timeline / Activity Log - Audit Report

## Executive Summary

The Employee Activity Timeline feature is **partially implemented** but has several functional gaps, UI issues, and missing test coverage. The feature works for basic viewing but has pagination bugs, missing event logging for key actions, and no visibility control on the Timeline button itself.

---

## 1. Plan vs Reality Check

### What the Plan Required vs What Exists

| Requirement | Status | Notes |
|-------------|--------|-------|
| Timeline Sheet UI | **Implemented** | `ProfileTimelineSheet.tsx` renders correctly in a slide-out sheet |
| RPC function aggregating events | **Implemented** | `get_employee_activity_timeline` aggregates from 7+ sources |
| Access control (Owner/Admin/HR) | **Implemented** | RPC enforces `has_role()` checks |
| Access control (Direct Manager) | **Implemented** | RPC checks `manager_id = viewer_employee_id` |
| Access control (Self-view) | **Implemented** | RPC checks `viewer_employee_id = target_employee_id` |
| Filter by event type | **Implemented** | Category dropdown with 8 categories |
| Filter by date range | **Implemented** | Presets + custom date picker |
| Pagination | ✅ **Fixed** | Now uses `useInfiniteEmployeeActivityTimeline` - appends results correctly |
| Leave approved/rejected logging | **Implemented** | `logEmployeeActivity` called in `useUpdateLeaveStatus` |
| Document upload logging | **Implemented** | `logEmployeeActivity` called in `UploadDocumentDialog` |
| Document delete logging | **Implemented** | `logEmployeeActivity` called in `EmployeeDocuments` |
| Attendance check-in logging | **Implemented (via trigger)** | DB trigger logs `attendance_checked_in` |
| Attendance check-out logging | **Missing** | No trigger or service call logs checkout |
| Profile field change logging | **Missing** | No logging when profile fields are updated |
| Performance index creation | **Implemented** | Indexes on `user_activity_logs(user_id, created_at)` |
| Frontend tests | **Missing** | No tests for timeline components |
| Timeline button visibility control | ✅ **Fixed** | Button now hidden for unauthorized users |

### Undocumented Behavior Found

1. **Event types not in plan**: `chat_sent`, `wiki_created`, `update_posted`, `kudos_given` are logged via DB triggers but not documented in the plan
2. ~~**Actor name logic bug**: Line 124 in `ActivityTimelineItem.tsx` has dead code: `event.actor_id !== event.actor_id` is always false~~ ✅ **Fixed**

---

## 2. User Flow Validation

### Flow: HR/Admin Viewing Employee Timeline

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Click "Timeline" button | Opens sheet | Works | **OK** |
| See access level indicator | Shows "HR/Admin" | Works | **OK** |
| See events | Shows chronological list | Works | **OK** |
| Filter by category | Shows filtered events | Works | **OK** |
| Filter by date | Shows date-filtered events | Works | **OK** |
| Click "Load More" | Appends older events | ✅ Works correctly now | **Fixed** |
| See access level badges | Shows on each event | Works | **OK** |

### Flow: Manager Viewing Direct Report

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Click "Timeline" button | Opens sheet | Works | **OK** |
| See events | Shows manager+ and public events | Works | **OK** |
| Cannot see hr_admin events | Should be filtered | Works | **OK** |

### Flow: Regular Member Viewing Peer

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| Should not see Timeline button | Hidden | ✅ Now hidden | **Fixed** |
| Click Timeline (if visible) | Should return empty | Returns empty | **OK** |

### UX Friction Points

1. ~~**Timeline button visible to unauthorized users** - Confusing UX when button exists but returns nothing~~ ✅ **Fixed**
2. **No loading skeleton** - Just a spinner, no progressive loading
3. ~~**Pagination replaces instead of appends** - User loses scroll position and earlier events~~ ✅ **Fixed**
4. **Custom date picker is awkward** - Two-click workflow to select range is not intuitive
5. **No "Profile Activated" for some users** - Only shows if `status = 'active'` and `updated_at` used incorrectly

---

## 3. Code Quality Review

### Issues Found

| Location | Issue | Severity | Status |
|----------|-------|----------|--------|
| `ProfileTimelineSheet.tsx:89` | Pagination increments offset but query replaces data instead of appending | High | ✅ Fixed |
| `ActivityTimelineItem.tsx:124` | Dead code: `event.actor_id !== event.actor_id` always false | Low | ✅ Fixed |
| `useEmployeeActivityTimeline.ts:29` | Uses `as any` for RPC call (type safety bypass) | Medium | Pending |
| `ProfileTimelineSheet.tsx:40` | Missing dependency in useEffect: `employeeId` | Low | ✅ Fixed |
| `ProfileTimelineSheet.tsx:50-75` | Inline Supabase queries in component (should be hooks) | Medium | Improved |
| Console log | React ref warning on `ClickToEdit` component | Low | Pending |

### Separation of Concerns

- **Good**: Timeline components are modular (`ActivityTimelineItem`, `ActivityTimelineFilters`, `ActivityTimelineEmpty`)
- **Good**: RPC aggregation keeps complex logic in database
- ~~**Issue**: Access level checking is duplicated between component and RPC (component has its own check logic that could drift)~~ ✅ **Improved**: Now accepts pre-computed props from parent

### Type Safety

- `useEmployeeActivityTimeline` uses `as unknown as ActivityTimelineEvent[]` - risky if RPC return type changes
- `ActivityEventType` includes types that don't exist in data (e.g., `attendance_checked_out`, `review_started`)

---

## 4. Component & Platform Reuse

### Existing Patterns Followed

| Pattern | Usage |
|---------|-------|
| Sheet component | Reuses `@/components/ui/sheet` |
| ScrollArea | Reuses `@/components/ui/scroll-area` |
| Badge | Reuses `@/components/ui/badge` |
| Button | Reuses `@/components/ui/button` |
| Select | Reuses `@/components/ui/select` |
| useUserRole | Correctly reuses role checking hook |
| formatDateTime | Reuses from `@/lib/utils` |

### Missing Reuse Opportunities

1. ~~**useInfiniteEmployeeActivityTimeline exists but unused** - The component uses basic `useQuery` with manual offset, but there's an `useInfiniteQuery` version available that would handle pagination correctly~~ ✅ **Fixed**: Now using `useInfiniteEmployeeActivityTimeline`
2. ~~**Access check logic** - Could reuse a shared `canViewEmployeeTimeline()` function instead of duplicating checks~~ ✅ **Improved**: Props passed from parent

---

## 5. Performance & "Instant Feel"

### Database Performance

| Aspect | Status | Notes |
|--------|--------|-------|
| Indexes on user_activity_logs | **OK** | Created in migration |
| Query complexity | **Concerning** | 9 UNION ALLs in CTE could be slow with large data |
| Pagination | **OK** | Uses LIMIT/OFFSET |
| No N+1 queries | **OK** | Single RPC call with JOINs |

### Frontend Performance

| Aspect | Status | Notes |
|--------|--------|-------|
| Query caching | **OK** | 1-minute staleTime |
| Lazy loading | **OK** | Only fetches when sheet opens |
| Memoization | ✅ **Improved** | Events array now properly memoized from infinite query |
| Re-renders | **OK** | Filter changes refetch data properly |

### Instant Feel Assessment

- ✅ Sheet opens instantly (data loads after)
- ✅ Filter changes show loading state
- ⚠️ No optimistic updates (expected for read-only view)
- ✅ Pagination now appends data smoothly

---

## 6. Security Findings

### Backend Enforcement

| Check | Status | Notes |
|-------|--------|-------|
| Authentication required | **OK** | RPC checks `auth.uid()` |
| Org isolation | **OK** | Filters by `organization_id` from employee record |
| Role-based access | **OK** | Uses `has_role()` function |
| Manager hierarchy check | **OK** | Checks direct `manager_id` match |
| SECURITY DEFINER | **OK** | Function has `SET search_path = public` |
| Empty result on access denied | **OK** | Returns empty set, no error |

### Frontend Enforcement

| Check | Status | Notes |
|-------|--------|-------|
| Button visibility | ✅ **Fixed** | Button now hidden for unauthorized users |
| Access level indicator | **OK** | Shows viewer's access level |
| No client-side data filtering | **OK** | All filtering in RPC |

### Data Exposure Risks

- **Low risk**: Metadata field exposes internal IDs (kpi_id, leave_id) but these are already visible elsewhere
- **No PII leakage**: Actor names/avatars are already public profile data

---

## 7. AI & Token Tracking

**Status: Not Applicable**

No AI features are used in the Activity Timeline. The feature is purely data aggregation and display.

---

## 8. Error Logging & Observability

### Current State

| Aspect | Status | Notes |
|--------|--------|-------|
| RPC errors logged | **Partial** | `console.error` in hook, but not to central logging |
| Activity logging errors | **OK** | `logEmployeeActivity` catches and logs errors non-fatally |
| Request correlation | **Unknown** | No evidence of X-Request-ID in timeline calls |
| Super-admin visibility | **Partial** | Activity logs table has super-admin SELECT policy |

### Gaps

1. **No observability on timeline access** - Cannot audit who viewed whose timeline
2. **No metrics** - No counters for timeline views or filter usage
3. **Error handling in RPC** - PostgreSQL errors would surface as generic failures

---

## 9. Test Coverage

### Existing Tests

- `src/test/security/rls-policies.test.ts` - Tests RLS on employees table but not activity timeline
- `src/test/services/useLeave.test.ts` - Tests leave hooks but not activity logging

### Missing Tests

| Area | Importance |
|------|------------|
| `useEmployeeActivityTimeline` hook | High |
| `ProfileTimelineSheet` component | High |
| `ActivityTimelineFilters` component | Medium |
| RPC function access control | High |
| Activity logging in services | Medium |

### Manual QA Checklist

```text
[ ] As Owner, view any employee timeline - should see all events
[ ] As Admin, view employee timeline - should see all events with access badges
[ ] As HR, view employee timeline - same as Admin
[ ] As Manager, view direct report timeline - should see manager+ and public events
[ ] As Manager, view non-report timeline - should see empty or no button
[ ] As Employee, view own timeline - should see all own events
[ ] As Employee, view peer timeline - button should be hidden OR empty
[ ] Filter by category - verify filtering works
[ ] Filter by date (Last 7 days) - verify filtering works
[ ] Click Load More - verify events append (currently broken)
[ ] Verify new leave request shows in timeline
[ ] Verify leave approval/rejection shows in timeline
[ ] Verify document upload shows in timeline
```

---

## 10. Prioritized Improvement List

### Critical (Should Fix Now)

| Issue | Impact | Risk | Effort | Status |
|-------|--------|------|--------|--------|
| **Pagination replaces instead of appends** | Data loss during "Load More" | Low | S | ✅ Fixed |
| **Timeline button visible to unauthorized users** | Confusing UX, potential security concern | Low | S | ✅ Fixed |

### High Priority

| Issue | Impact | Risk | Effort | Status |
|-------|--------|------|--------|--------|
| **Missing attendance_checked_out logging** | Incomplete attendance history | Low | S | Pending |
| **Switch to useInfiniteEmployeeActivityTimeline** | Fixes pagination properly | Low | M | ✅ Fixed |
| **Add basic tests for timeline feature** | Prevents regressions | Low | M | Pending |

### Medium Priority

| Issue | Impact | Risk | Effort | Status |
|-------|--------|------|--------|--------|
| **Fix actor_name display logic (dead code)** | Code quality | None | S | ✅ Fixed |
| **Type-safe RPC calls** | Maintainability | Low | M | Pending |
| **Add timeline access audit logging** | Observability | Low | S | Pending |

### Low Priority

| Issue | Impact | Risk | Effort |
|-------|--------|------|--------|
| **Improve custom date picker UX** | Minor UX friction | None | M |
| **Add loading skeleton** | Minor UX polish | None | S |
| **Profile field change logging** | Completeness | Low | M |

---

## Summary

The Activity Timeline feature is **functional for its core use case** (HR/Admin viewing employee history) with:

### ✅ Fixed Issues (This Session)
1. **Pagination now works correctly** - Uses `useInfiniteEmployeeActivityTimeline` to properly append results
2. **Timeline button visibility** - Hidden for unauthorized viewers (regular members viewing peers)
3. **Dead code removed** - Fixed the always-false condition in `ActivityTimelineItem.tsx`
4. **Access control props** - `ProfileTimelineSheet` now accepts pre-computed access props from parent to avoid duplicate DB queries

### Remaining Items
1. **One missing logging feature**: checkout events
2. **Zero test coverage** for timeline-specific code
3. **Type safety** could be improved in RPC calls

**Recommended next actions:**
1. Add checkout event logging to `validate_qr_and_record_attendance` trigger
2. Add basic tests for timeline components
