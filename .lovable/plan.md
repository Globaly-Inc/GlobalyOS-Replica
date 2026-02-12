

## Comprehensive Vacancy Status Actions and UX Overhaul

### Overview

Add status-aware action menus to the **Job Detail** and **Job Edit** pages, fix the "Unpublish" naming to "Pause", block editing of closed vacancies, guard deletes based on candidate count, and hide the pipeline tab for drafts.

### Status-Based Rules

```text
+----------+----------------------------------------------------+
| Status   | Allowed Actions                                    |
+----------+----------------------------------------------------+
| Draft    | Edit, Publish, Delete (always allowed)              |
| Open     | Edit, Pause, Close, Delete (only if 0 candidates)  |
| Paused   | Edit, Resume, Close, Delete (only if 0 candidates)  |
| Closed   | View only -- NO edit, Delete (only if 0 candidates) |
+----------+----------------------------------------------------+
```

- Pipeline tab is hidden for `draft` status (no pipeline until published)
- Closed vacancies are **read-only** -- the Edit button is removed/disabled and the edit page redirects back to detail

---

### Changes

**1. Job Detail Page (`src/pages/hiring/JobDetail.tsx`)**

- **Add a three-dot DropdownMenu** next to the existing action buttons in the header, containing:
  - Pause Vacancy (when `open`)
  - Resume Vacancy (when `paused`)
  - Close Vacancy (when `open` or `paused`)
  - Separator
  - Delete Vacancy (destructive; blocked with toast if `applications.length > 0`)
- **Remove the Edit button when status is `closed`** -- closed vacancies cannot be edited
- **Hide the Pipeline tab when status is `draft`**; default the active tab to `description` for drafts
- Add `handleStatusChange` and `handleDelete` functions (same pattern as `JobsList.tsx`)
- Add `AlertDialog` for delete confirmation
- New imports: `DropdownMenu`, `MoreHorizontal`, `Pause`, `Play`, `Archive`, `Trash2`, `AlertDialog`

**2. Job Edit Page (`src/pages/hiring/JobEdit.tsx`)**

- **Redirect closed vacancies**: if `job.status === 'closed'`, immediately redirect to the detail page with a toast "Closed vacancies cannot be edited"
- **Rename "Unpublish" to "Pause Vacancy"** and update toast from "Job unpublished" to "Vacancy paused"; rename `handleUnpublish` to `handlePause`
- **Replace the standalone Unpublish/Publish buttons with a DropdownMenu** (three-dot) next to Save/Save & Close:
  - Publish (when `draft` or `approved`)
  - Pause Vacancy (when `open`)
  - Resume Vacancy (when `paused`)
  - Close Vacancy (when `open` or `paused`)
  - Separator
  - Delete Vacancy (destructive; blocked if candidates exist)
- Fetch applications count using `useApplications` to guard the delete action
- Add `AlertDialog` for delete confirmation

**3. JobsList.tsx -- Delete guard improvement**

- Implement the actual delete: call `supabase.from('jobs').delete().eq('id', jobId)` with candidate count check
- Before deleting, query applications count and block with toast if > 0 for non-draft statuses
- Use `AlertDialog` instead of `window.confirm` for a polished UX

---

### Technical Details

**Delete guard logic (shared across all 3 pages):**
```
1. If status is draft -> allow delete (no pipeline exists)
2. If status is open/paused/closed -> check applications count
   - If > 0 -> toast.error("Remove all candidates before deleting")
   - If 0 -> show confirmation dialog, then delete
3. On successful delete -> navigate to /hiring?tab=jobs
```

**Closed vacancy redirect in JobEdit:**
```
useEffect(() => {
  if (job && job.status === 'closed') {
    toast.error('Closed vacancies cannot be edited');
    navigateOrg(`/hiring/jobs/${job.slug}`);
  }
}, [job]);
```

**Pipeline tab visibility in JobDetail:**
- Default `activeTab` to `job.status === 'draft' ? 'description' : 'pipeline'`
- Only render the Pipeline `TabsTrigger` when `job.status !== 'draft'`

