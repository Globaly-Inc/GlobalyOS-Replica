

# Employee Activity Timeline Log - Implementation Plan

## Executive Summary

This plan enhances the existing `ProfileTimelineSheet` component to become a comprehensive, role-restricted Employee Activity Log. The system will aggregate events from multiple existing sources into a unified timeline view with filtering capabilities.

---

## Current State Analysis

### Already Implemented ✅

| Feature | Location | Status |
|---------|----------|--------|
| Timeline Sheet UI | `ProfileTimelineSheet.tsx` | Working - slide-out sheet with timeline visualization |
| Access control model | Same component | 4-tier: public, manager, hr_admin, self |
| `user_activity_logs` table | Database | Tracks attendance, leave_requested, wiki, chat |
| `kpi_activity_logs` table | Database | Tracks KPI operations |
| `workflow_activity_logs` table | Database | Tracks onboarding/offboarding tasks |
| `leave_balance_logs` table | Database | Detailed leave balance changes |
| `is_manager_of_employee()` | Database function | Validates direct manager relationship |
| Manager hierarchy validation | `is_manager_of_employee()` | Only validates direct manager (not full chain) |

### Partially Implemented ⚠️

| Feature | Current State | Gap |
|---------|---------------|-----|
| Leave events | Only `leave_requested` logged | Missing: approved, rejected, cancelled |
| Attendance | Only check-in logged | Check-out not consistently logged |
| Position changes | Stored in `position_history` table | Not emitting to activity log |
| Document events | Documents stored in `employee_documents` | No activity log on upload/delete |

### Missing ❌

| Feature | Description |
|---------|-------------|
| Unified timeline API | No RPC to aggregate all event sources |
| Event type filtering | No filter UI in timeline sheet |
| Date range filtering | No date picker in timeline |
| Profile change logging | Field changes not logged |
| Performance review events | Not aggregated into timeline |
| Full manager chain access | Only direct manager validated, not full hierarchy |

---

## Proposed Solution Architecture

### Database Design

Rather than creating a new unified table, we will:
1. Extend `user_activity_logs` to log additional employee-specific events
2. Create a secure RPC function `get_employee_activity_timeline` that:
   - Aggregates from `user_activity_logs`, `kpi_activity_logs`, `leave_balance_logs`, `position_history`
   - Enforces role-based access at the database level
   - Supports pagination and filtering

### Activity Event Types

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ACTIVITY EVENT CATEGORIES                        │
├─────────────────────────────────────────────────────────────────────┤
│ PROFILE (public/manager)                                            │
│   - profile_activated, joined_organization, profile_updated         │
│   - position_changed, department_changed, manager_changed           │
├─────────────────────────────────────────────────────────────────────┤
│ ATTENDANCE (manager)                                                │
│   - attendance_checked_in, attendance_checked_out                   │
│   - attendance_adjusted                                             │
├─────────────────────────────────────────────────────────────────────┤
│ LEAVE (manager)                                                     │
│   - leave_requested, leave_approved, leave_rejected                 │
│   - leave_cancelled, leave_modified                                 │
├─────────────────────────────────────────────────────────────────────┤
│ KPI & PERFORMANCE (manager)                                         │
│   - kpi_created, kpi_updated, kpi_milestone_reached                 │
│   - review_started, review_completed                                │
├─────────────────────────────────────────────────────────────────────┤
│ LEARNING & DEVELOPMENT (manager)                                    │
│   - training_assigned, training_completed, certification_earned     │
├─────────────────────────────────────────────────────────────────────┤
│ DOCUMENTS (self/hr_admin)                                           │
│   - document_uploaded, document_deleted, document_acknowledged      │
├─────────────────────────────────────────────────────────────────────┤
│ RECOGNITION (public)                                                │
│   - kudos_received, achievement_unlocked                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Backend - Activity Logging Enhancement

**Step 1.1: Add missing activity type logging**

Modify existing service functions to emit activity logs:

| Module | File | Events to Add |
|--------|------|---------------|
| Leave | `useLeave.ts` | `leave_approved`, `leave_rejected`, `leave_cancelled` |
| Attendance | `useAttendance.ts` | `attendance_checked_out` (verify consistency) |
| Documents | `UploadDocumentDialog.tsx` | `document_uploaded` |
| Documents | `EmployeeDocuments.tsx` | `document_deleted` |

**Step 1.2: Create unified timeline RPC**

```sql
CREATE OR REPLACE FUNCTION get_employee_activity_timeline(
  target_employee_id UUID,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0,
  event_types TEXT[] DEFAULT NULL,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (...)
SECURITY DEFINER
SET search_path = public
AS $$
  -- Enforces: Owner/Admin/HR can view all
  -- Manager can view direct reports only
  -- Self can view own timeline
  -- Returns events from multiple sources, filtered by access level
$$
```

### Phase 2: Frontend - Enhanced Timeline UI

**Step 2.1: Create new components**

| Component | Purpose |
|-----------|---------|
| `EmployeeActivityTimeline.tsx` | Main container with filters |
| `ActivityTimelineFilters.tsx` | Event type & date filters |
| `useEmployeeActivityTimeline.ts` | React Query hook for timeline API |

**Step 2.2: Enhance existing ProfileTimelineSheet**

- Add filter controls (matching wireframe)
- Implement pagination/infinite scroll
- Add event type grouping toggles
- Improve mobile responsiveness

### Phase 3: Access Control Verification

**Step 3.1: Validate manager hierarchy**

Current `is_manager_of_employee()` only checks direct manager. For full manager chain access, we need to:
- Option A: Extend to recursive manager check (performance impact)
- Option B: Keep direct manager only (current behavior, simpler)

**Recommendation**: Keep direct manager only for Phase 1, consider hierarchy in future iteration.

**Step 3.2: RLS policy for activity logs**

Ensure `user_activity_logs` has proper RLS:
- INSERT: Allow authenticated users to log their own activities
- SELECT: Enforce via RPC function (no direct table access for timeline)

---

## Detailed Technical Specifications

### Database Migration

```sql
-- Add new activity types to user_activity_logs (no schema change needed)
-- The activity_type column is TEXT, so new types can be added

-- Create secure RPC function for timeline
CREATE OR REPLACE FUNCTION get_employee_activity_timeline(
  target_employee_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_event_types TEXT[] DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_category TEXT,
  title TEXT,
  description TEXT,
  actor_id UUID,
  actor_name TEXT,
  actor_avatar TEXT,
  event_timestamp TIMESTAMPTZ,
  metadata JSONB,
  access_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_employee_id UUID;
  is_admin_hr BOOLEAN;
  is_own_profile BOOLEAN;
  is_direct_manager BOOLEAN;
BEGIN
  -- Get viewer's employee ID
  SELECT id INTO viewer_employee_id FROM employees WHERE user_id = auth.uid();
  
  -- Check permissions
  is_admin_hr := has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR has_role(auth.uid(), 'owner');
  is_own_profile := viewer_employee_id = target_employee_id;
  is_direct_manager := EXISTS (SELECT 1 FROM employees WHERE id = target_employee_id AND manager_id = viewer_employee_id);
  
  -- Access denied if not authorized
  IF NOT (is_admin_hr OR is_own_profile OR is_direct_manager) THEN
    RETURN;
  END IF;
  
  -- Return aggregated events from multiple sources
  RETURN QUERY
  WITH all_events AS (
    -- User activity logs
    SELECT 
      ual.id as event_id,
      ual.activity_type as event_type,
      CASE 
        WHEN ual.activity_type LIKE 'attendance%' THEN 'attendance'
        WHEN ual.activity_type LIKE 'leave%' THEN 'leave'
        WHEN ual.activity_type LIKE 'document%' THEN 'documents'
        ELSE 'other'
      END as event_category,
      ual.activity_type as title,
      '' as description,
      ual.user_id as actor_id,
      ual.created_at as event_timestamp,
      ual.metadata,
      'manager' as access_level
    FROM user_activity_logs ual
    JOIN employees e ON e.user_id = ual.user_id
    WHERE e.id = target_employee_id
    
    UNION ALL
    
    -- KPI activity logs
    SELECT 
      kal.id,
      kal.action_type,
      'kpi',
      kal.action_type,
      kal.description,
      e.user_id,
      kal.created_at,
      jsonb_build_object('kpi_id', kal.kpi_id, 'old_value', kal.old_value, 'new_value', kal.new_value),
      'manager'
    FROM kpi_activity_logs kal
    JOIN kpi_owners ko ON ko.kpi_id = kal.kpi_id
    JOIN employees e ON e.id = ko.employee_id
    WHERE e.id = target_employee_id
    
    -- Add more UNION ALLs for other sources...
  )
  SELECT 
    ae.event_id,
    ae.event_type,
    ae.event_category,
    ae.title,
    ae.description,
    ae.actor_id,
    p.full_name as actor_name,
    p.avatar_url as actor_avatar,
    ae.event_timestamp,
    ae.metadata,
    ae.access_level
  FROM all_events ae
  LEFT JOIN profiles p ON p.id = ae.actor_id
  WHERE (p_event_types IS NULL OR ae.event_type = ANY(p_event_types))
    AND (p_start_date IS NULL OR ae.event_timestamp::date >= p_start_date)
    AND (p_end_date IS NULL OR ae.event_timestamp::date <= p_end_date)
  ORDER BY ae.event_timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
```

### Frontend Component Structure

```text
src/
├── components/
│   ├── timeline/
│   │   ├── EmployeeActivityTimeline.tsx    # Main container
│   │   ├── ActivityTimelineFilters.tsx     # Filter controls
│   │   ├── ActivityTimelineItem.tsx        # Single event card
│   │   └── ActivityTimelineEmpty.tsx       # Empty state
│   └── ProfileTimelineSheet.tsx            # Existing (to be enhanced)
├── services/
│   └── useEmployeeActivityTimeline.ts      # React Query hook
└── types/
    └── activity.ts                         # Type definitions
```

### React Query Hook

```typescript
// src/services/useEmployeeActivityTimeline.ts
export interface ActivityTimelineEvent {
  event_id: string;
  event_type: string;
  event_category: string;
  title: string;
  description: string;
  actor_id: string;
  actor_name: string;
  actor_avatar: string | null;
  event_timestamp: string;
  metadata: Record<string, unknown>;
  access_level: 'public' | 'manager' | 'hr_admin' | 'self';
}

export interface UseActivityTimelineOptions {
  employeeId: string;
  limit?: number;
  offset?: number;
  eventTypes?: string[];
  startDate?: string;
  endDate?: string;
}

export const useEmployeeActivityTimeline = (options: UseActivityTimelineOptions) => {
  return useQuery({
    queryKey: ['employee-activity-timeline', options],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_employee_activity_timeline', {
        target_employee_id: options.employeeId,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0,
        p_event_types: options.eventTypes || null,
        p_start_date: options.startDate || null,
        p_end_date: options.endDate || null,
      });
      if (error) throw error;
      return data as ActivityTimelineEvent[];
    },
    enabled: !!options.employeeId,
  });
};
```

---

## UI/UX Specifications

### Wireframe Alignment

Based on the provided wireframe:

```text
┌─────────────────────────────────────────────────────┐
│  [Employee Name]'s Timeline                    [X]  │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐│
│  │ Log Types: [All ▼]  Date: [Any ▼]              ││
│  └─────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────┤
│  ○────┬─────────────────────────────────────────────│
│       │ ┌───────────────────────────────────┐      │
│       │ │ Profile Activated                 │      │
│       │ │ John activated their account      │      │
│       │ │ 24 Jan 2026 - 3:22 PM    [profile]│      │
│       │ └───────────────────────────────────┘      │
│  ○────┤                                            │
│       │ ┌───────────────────────────────────┐      │
│       │ │ Sick Leave Approved               │      │
│       │ │ 1 day from 08/12/2025             │      │
│       │ │ 17 Dec 2025 - 7:26 AM    [leave]  │      │
│       │ └───────────────────────────────────┘      │
│  ○────┘                                            │
│                                                     │
│            [Load More]                              │
└─────────────────────────────────────────────────────┘
```

### Filter Options

| Filter | Options |
|--------|---------|
| Log Types | All, Profile, Attendance, Leave, KPI, Documents, Recognition |
| Date Range | Any, Last 7 days, Last 30 days, Last 90 days, Custom |

### Event Card Design

Each event card will display:
- Colored icon (based on category)
- Event title (human-readable)
- Event description
- Timestamp
- Category badge
- Access level badge (visible to HR/Admin only)

---

## Security Considerations

### Access Control Matrix

| Viewer Role | Can See | Cannot See |
|-------------|---------|------------|
| Owner/Admin/HR | All employee logs | - |
| Direct Manager | Manager-level and public events | Self-only events (e.g., documents) |
| Employee (Self) | All their own events | Other employees' logs |
| Regular Member | Nothing (timeline hidden) | All timeline data |

### Backend Enforcement

1. RPC function `get_employee_activity_timeline` validates access before returning data
2. `is_manager_of_employee()` checks direct manager relationship
3. `has_role()` validates Owner/Admin/HR status
4. No direct SELECT access to `user_activity_logs` for timeline feature

### Frontend Enforcement

1. Timeline button only visible to authorized viewers
2. Access level indicator shown to HR/Admin
3. No client-side filtering of events (all filtering in RPC)

---

## Performance Considerations

1. **Pagination**: Default 50 events, load more on scroll
2. **Indexes**: Ensure indexes on `user_activity_logs(user_id, created_at)`
3. **Query Optimization**: Use CTEs with proper filtering before JOINs
4. **Caching**: React Query with 5-minute stale time

---

## Testing Plan

### Unit Tests
- Activity logging functions emit correct event types
- Access control logic returns correct permissions

### Integration Tests
- RPC returns correct events for each role
- Pagination works correctly
- Filters return expected results

### Manual QA Checklist

| Scenario | Expected Result |
|----------|-----------------|
| Admin views employee X | Sees all events, access badges visible |
| HR views employee X | Sees all events, access badges visible |
| Manager of X views X | Sees manager+ and public events only |
| Manager of Y views X | Timeline button hidden |
| Employee views own profile | Sees all own events |
| Employee views peer | Timeline button hidden |

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_employee_activity_timeline.sql` | Create | RPC function for timeline |
| `src/services/useEmployeeActivityTimeline.ts` | Create | React Query hook |
| `src/types/activity.ts` | Create | TypeScript types |
| `src/components/timeline/ActivityTimelineFilters.tsx` | Create | Filter UI component |
| `src/components/ProfileTimelineSheet.tsx` | Modify | Use new hook, add filters |
| `src/services/useLeave.ts` | Modify | Add activity logging |
| `src/components/dialogs/UploadDocumentDialog.tsx` | Modify | Add activity logging |
| `src/components/EmployeeDocuments.tsx` | Modify | Add activity logging on delete |

---

## Estimated Effort

| Phase | Task | Effort |
|-------|------|--------|
| 1.1 | Add missing activity logging | M |
| 1.2 | Create RPC function | M |
| 2.1 | Create new components | M |
| 2.2 | Enhance ProfileTimelineSheet | M |
| 3 | Access control verification | S |
| Testing | Unit + integration + QA | M |
| **Total** | | **~3-4 days** |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance with large event history | Medium | Low | Pagination, indexes |
| Missing edge cases in access control | High | Low | Thorough testing matrix |
| Breaking existing timeline behavior | Medium | Low | Incremental rollout, feature flag |
| Manager hierarchy (full chain) not validated | Medium | Medium | Document limitation, Phase 2 enhancement |

---

## Conflicts & Clarifications Needed

### Conflicts Identified

1. **Manager Hierarchy**: Current `is_manager_of_employee()` only validates direct manager, not full chain. The wireframe implies managers "up the chain" should have access. This requires a recursive function or different approach.

2. **Self-View Policy**: The requirement states employees should only see their own log "if current product/privacy rules allow." Current implementation allows self-view. Need confirmation this is intended.

### Clarifications Needed

1. Should managers up the full reporting chain have access, or only direct managers?
2. Should there be real-time updates when new events occur?
3. Should events be clickable to navigate to the related entity (e.g., click leave event → open leave request)?

