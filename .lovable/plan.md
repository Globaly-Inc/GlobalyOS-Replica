

# Migrate Exemptions from Org-Level to Office-Level

## Problem

Two independent exemption systems coexist, causing confusion:

| System | Storage | UI (Admin) | UI (Employee-facing) |
|--------|---------|------------|----------------------|
| **Old** (org-level) | `employees.checkin_exempt` boolean | `AttendanceSettings.tsx` in Fields Settings | `SelfCheckInCard`, `NotCheckedInCard`, `AttendanceNotCheckedInTab` all read this |
| **New** (office-level) | `office_attendance_exemptions` table | `ExemptionsTab` inside Office Attendance Settings | **Nothing reads this table** |

The old `checkin_exempt` flag is still `true` for 3 employees (Amit Ranjitkar, Sandip Manandhar, Tula Bahadur Gurung). The new `office_attendance_exemptions` table is empty. No frontend component checks the new table to decide whether to hide the check-in card or exclude someone from "Not Checked In" reports.

## What needs to happen

### Step 1: Migrate existing exemptions to the new table

Write a SQL migration that:
- For each employee where `checkin_exempt = true`, inserts a row into `office_attendance_exemptions` using their current `office_id` and `organization_id`
- Then resets `checkin_exempt = false` for all employees
- This ensures Amit, Sandip, and Tula appear in the new office-level exemptions

### Step 2: Update employee-facing components to read the new table

Create a hook `useIsEmployeeExempt(employeeId)` that queries `office_attendance_exemptions` for the given employee. Then update:

- **`SelfCheckInCard.tsx`** — currently checks `employee.checkin_exempt` to hide the card. Replace with the new hook.
- **`NotCheckedInCard.tsx`** — currently filters `.eq('checkin_exempt', false)`. Replace with a left join or post-filter against `office_attendance_exemptions`.
- **`AttendanceNotCheckedInTab.tsx`** — same pattern as `NotCheckedInCard`.

### Step 3: Remove old org-level exemptions UI

Remove the "Check-in Exemptions" section (lines 417-510) from `AttendanceSettings.tsx`. This is the old UI that sets `employees.checkin_exempt`. The replacement UI already exists in `ExemptionsTab.tsx` inside Office Attendance Settings.

### Step 4: Clean up the old column

After migration, the `checkin_exempt` column on `employees` is no longer needed. We will keep the column for now (to avoid a destructive schema change) but stop reading/writing it.

## Technical Details

### New hook: `useIsEmployeeExempt`

```typescript
// src/hooks/useIsEmployeeExempt.ts
export const useIsEmployeeExempt = (employeeId?: string) => {
  return useQuery({
    queryKey: ['employee-exempt', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('office_attendance_exemptions')
        .select('id')
        .eq('employee_id', employeeId!)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};
```

### SQL migration

```sql
-- Migrate old checkin_exempt employees to office_attendance_exemptions
INSERT INTO office_attendance_exemptions (employee_id, office_id, organization_id, reason)
SELECT id, office_id, organization_id, 'Migrated from org-level exemption'
FROM employees
WHERE checkin_exempt = true
  AND office_id IS NOT NULL
  AND status = 'active'
ON CONFLICT DO NOTHING;

-- Reset the old flag
UPDATE employees SET checkin_exempt = false WHERE checkin_exempt = true;
```

### Files to modify

| File | Change |
|------|--------|
| `src/hooks/useIsEmployeeExempt.ts` | New hook |
| `src/components/home/SelfCheckInCard.tsx` | Replace `checkin_exempt` check with new hook |
| `src/components/home/NotCheckedInCard.tsx` | Filter out exempted employees using the new table |
| `src/components/attendance/AttendanceNotCheckedInTab.tsx` | Same as above |
| `src/components/AttendanceSettings.tsx` | Remove the "Check-in Exemptions" section (lines 417-510) and related state/handlers |
| SQL migration | Migrate data + reset old flags |

### Affected employees (live data)

- Amit Ranjitkar (office: `c0234ca4-...`)
- Sandip Manandhar (office: `0ab3dc6b-...`)
- Tula Bahadur Gurung (office: `0ab3dc6b-...`)

All three will be migrated to `office_attendance_exemptions` and will continue to be exempt, but now managed at the office level.

