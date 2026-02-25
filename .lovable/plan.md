

## Plan: Four-Tier Hierarchy with Color-Coded Levels

### Understanding

The current `task_spaces` table already supports unlimited nesting via `parent_id`. The sidebar renders all spaces in a flat tree with uniform styling. The user wants to enforce a **four-tier visual hierarchy** in the sidebar with distinct labels and colors per depth level:

| Depth | Label | Color |
|-------|-------|-------|
| 0 | Projects | Green |
| 1 | Sub-projects | Pink |
| 2 | Tasks | Blue |
| 3 | Subtasks | Yellow |

No database changes are needed — the existing `parent_id` self-referencing structure already supports 4 levels of nesting. This is purely a **UI/UX change** in the sidebar and the create dialog.

### Changes

**1. `src/components/tasks/TaskInnerSidebar.tsx`**

- Define a tier config map:
  ```
  depth 0 → { label: 'Projects', color: 'text-green-600', bg: 'bg-green-500/10', selectedBg: 'bg-green-500/20', icon: '📂' }
  depth 1 → { label: 'Sub-projects', color: 'text-pink-600', bg: 'bg-pink-500/10', selectedBg: 'bg-pink-500/20', icon: '📁' }
  depth 2 → { label: 'Tasks', color: 'text-blue-600', bg: 'bg-blue-500/10', selectedBg: 'bg-blue-500/20', icon: '📋' }
  depth 3 → { label: 'Subtasks', color: 'text-yellow-600', bg: 'bg-yellow-500/10', selectedBg: 'bg-yellow-500/20', icon: '📌' }
  ```

- Update `renderNode` to accept `depth` (already does) and apply the tier-specific color classes:
  - Selected state uses `selectedBg` + tier `color` instead of generic `bg-primary/10 text-primary`
  - Unselected state uses tier `color` for the text instead of generic `text-muted-foreground`
  - Add a small colored dot/indicator before the name to reinforce the tier color

- Update the section header from "Spaces" to "Projects"

- Update the "Add Sub-space" context menu label to be tier-aware:
  - On a Project (depth 0): "Add Sub-project"
  - On a Sub-project (depth 1): "Add Task"
  - On a Task (depth 2): "Add Subtask"
  - On a Subtask (depth 3): no "Add" option (max depth reached)

- Limit nesting to 4 levels — hide the "Add child" menu item when `depth >= 3`

- Pass `depth` info when opening the `CreateSpaceDialog` so the dialog title is tier-aware

**2. `src/components/tasks/CreateSpaceDialog.tsx`**

- Accept an optional `depth` prop (the depth of the parent + 1, or 0 for root)
- Use the tier config to set the dialog title dynamically:
  - depth 0: "Create Project"
  - depth 1: "Create Sub-project"
  - depth 2: "Create Task"
  - depth 3: "Create Subtask"
- Update the placeholder text accordingly (e.g. "e.g. Marketing Campaign" for projects)

### Technical details

- The tier config is a simple array indexed by depth, clamped to index 3 for any depth ≥ 3
- No database migration needed — the `parent_id` column already supports unlimited nesting
- The `buildSpaceTree` function already computes the tree correctly; depth is derived during render traversal
- Colors use Tailwind's built-in green/pink/blue/yellow palettes so they work in both light and dark mode

