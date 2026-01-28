

# Fix Project Auto-Sync: Restore Correct Filter Condition

## Root Cause Identified

The recent migration `20260128125848` introduced a bug by changing the query filter from the correct `access_scope = 'projects'` to the incorrect `space_type = 'project'`.

**Current broken query (line 22):**
```sql
WHERE cs.space_type = 'project'  -- WRONG!
```

**The "All GlobalyOS" space has:**
| Field | Value |
|-------|-------|
| `space_type` | `collaboration` |
| `access_scope` | `projects` |
| `auto_sync_members` | `true` |

The filter should check `access_scope`, not `space_type`.

---

## Solution

Restore the correct query logic from migration `20260128121722`:

```sql
WHERE cs.access_scope = 'projects'
  AND cs.auto_sync_members = true
  AND cs.archived_at IS NULL
```

Also fix the profile JOIN to use `p.user_id = e.user_id` (not `p.id = e.user_id`).

---

## Database Migration

The new migration will:
1. Fix the `sync_project_space_members()` function with correct filters
2. Handle both INSERT and DELETE operations
3. Use proper JOIN for profiles table
4. Match the pattern of other working sync functions

---

## Technical Comparison

| Aspect | Broken (Current) | Fixed |
|--------|------------------|-------|
| Filter | `space_type = 'project'` | `access_scope = 'projects'` |
| Profile JOIN | `p.id = e.user_id` | `p.user_id = e.user_id` |
| Archived check | Missing | `archived_at IS NULL` |
| DELETE handling | Missing | Properly removes members when project removed |

---

## Verification Data

**Employee_projects entry (Sarah):**
- Employee ID: `ee06e718-7a28-4e72-ad05-ec64a93a1c1c`
- Project ID: `1fbbfbe0-ee3e-44a9-8b7f-bb6f647e5b4b` (GlobalyOS)
- Created: `2026-01-28 13:00:50`

**Space already linked to project:**
- Space ID: `568b895b-e74d-4d49-8ac5-87af6e99dd20` (All GlobalyOS)
- Project ID: `1fbbfbe0-ee3e-44a9-8b7f-bb6f647e5b4b` (GlobalyOS)

**Sarah is NOT in space members** - confirms the auto-sync failed.

---

## Files Changed

| Resource | Action | Description |
|----------|--------|-------------|
| Database migration | Add | Fix `sync_project_space_members()` with correct `access_scope` filter |

---

## After Fix

- Auto-sync will correctly trigger when projects are assigned to employees
- Sarah will be auto-added to "All GlobalyOS" space when project is assigned
- DELETE operations will properly remove members when projects are unassigned
- System messages will correctly display in the chat space

---

## Manual Fix Required

After the migration, Sarah's existing project assignment won't auto-trigger (since the trigger fires on INSERT). I'll also provide a one-time data fix to add Sarah to the space.

