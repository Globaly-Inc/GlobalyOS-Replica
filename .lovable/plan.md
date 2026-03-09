

## Fix: Show Folders and Lists as Sub-projects in Project Dashboard

### Problem
The "Sub-projects" card looks for **child spaces** (`spaces.filter(s => s.parent_id === spaceId)`), but the actual data hierarchy is **Space → Folders → Task Lists → Tasks**. Since there are no nested spaces, sub-projects is always empty.

### Fix in `src/services/useProjectDashboard.ts`

Replace the current sub-project logic with:

1. **Fetch folders** for the space from `task_folders` where `space_id = projectSpaceId`.
2. **Fetch task lists** for the space from `task_lists` where `space_id = projectSpaceId`.
3. **Build sub-project entries** from:
   - Each **folder** — aggregate task counts from all lists where `folder_id` matches that folder.
   - Each **unfiled list** (where `folder_id` is null) — show as its own entry.
4. For each entry, compute `totalTasks` and `completedTasks` by filtering the already-fetched `allTasks` array by matching `list_id`.
5. Update the task query to select `list_id` alongside existing fields so we can group by list.

Also update the `SubProjectData` interface to add a `type: 'folder' | 'list'` field for the UI to distinguish them.

### Fix in `src/components/tasks/ProjectDashboard.tsx`

- Use `FolderOpen` icon for folder entries, `List` icon for standalone list entries (instead of relying on `sp.icon`).

### Fix query `enabled` condition

Currently: `enabled: !!projectSpaceId && allDescendantIds.length > 0`. Since `allDescendantIds` only has the space itself (no children), this works — but the task query uses `.in('space_id', allDescendantIds)` which is correct since tasks reference the space directly.

### Summary of changes
- **`useProjectDashboard.ts`**: Fetch `task_folders` + `task_lists` for the space; build sub-project entries from folders (aggregated) and unfiled lists; add `list_id` to task select; add `type` to `SubProjectData`.
- **`ProjectDashboard.tsx`**: Show folder vs list icon based on `type` field.

