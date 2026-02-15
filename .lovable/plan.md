

## Redesign Pipeline Tab to Vertical Stage Sidebar + Candidate Grid

### What Changes

Replace the current horizontal Kanban board with a two-panel layout matching the wireframe:

- **Left panel**: Vertical list of pipeline stages (Applied, Screening, Assignment, etc.) with colored left borders and candidate counts. Clicking a stage selects it.
- **Right panel**: A 2-column grid of candidate cards for the selected stage. Cards show: Full Name, Email + Phone, Applied Date and Time.
- **Summary card (3rd column)**: Replace the dot-list pipeline stats with a small bar/summary chart showing candidate counts per stage.

### Layout Structure

```text
Pipeline Tab
+------------------+--------------------------------------+
| Applied       1  |  [Card]              [Card]          |
| Screening     1  |  Name                Name            |
| Assignment    1  |  Email - Phone       Email - Phone   |
| Interview 1   0  |  Applied Date        Applied Date    |
| Interview 2   0  |                                      |
| Interview 3   0  |  [Card]              [Card]          |
| Offer         0  |  ...                 ...             |
| Hired         0  |                                      |
+------------------+--------------------------------------+
```

### Drag-and-Drop

- Candidate cards can be dragged from the right grid and dropped onto any stage in the left sidebar to move them between stages
- The left sidebar stages act as drop targets with visual feedback

### Files to Modify

**1. `src/components/hiring/pipeline/HiringKanbanBoard.tsx`** (major rewrite)
- Add `selectedStage` state (defaults to first stage with candidates, or `'applied'`)
- Left panel: vertical list of stages, each is a clickable row with colored left border, stage name, and count badge. Active stage gets highlighted background. Each row is a drop target for drag-and-drop.
- Right panel: 2-column responsive grid (`grid grid-cols-1 md:grid-cols-2`) showing candidates for the selected stage only
- Candidate cards simplified to match wireframe: Full Name (bold), Email - Phone on second line, Applied date/time on third line
- Cards remain draggable; dropping on a stage row in the sidebar moves the candidate

**2. `src/pages/hiring/JobDetail.tsx`** (minor update to pipeline stats column)
- Replace the dot-list pipeline stats in the summary card's right column with a small horizontal bar chart or stacked mini-bars showing counts per stage with colored segments, giving a visual summary of the pipeline distribution

### Stage Sidebar Item Design

Each stage row in the left sidebar:
- 3px colored left border (matching existing stage colors)
- Stage label text
- Count badge on the right
- Selected state: light background fill
- Drop hover state: dashed border or highlighted background

### Candidate Card Design (simplified)

```text
+--------------------------------+
| Candidate Full Name            |
| email@example.com - 9841234567 |
| Applied 15 Feb 2026, 2:30 PM  |
+--------------------------------+
```

- Clean card with border, rounded corners
- No avatar, no dropdown menu, no badges (cleaner per wireframe)
- Clicking the name links to the application detail page
- Draggable with grab cursor

### Technical Details

- No database changes
- No new dependencies (uses native HTML drag-and-drop, same as current)
- Stage colors reused from existing `STAGE_COLORS` map but converted to left-border-only style
- Responsive: on mobile, sidebar stacks above the grid
