

## Add Assignment Templates Card to Vacancy Sidebar

### Overview
Add an "Assignment Template" card to the right sidebar of the JobEdit page (below Publishing Options, above Preview). This card will show assignment templates that are linked to the vacancy's position, allow selecting one if multiple exist, and let users update the deadline hours.

### How Position Matching Works
- The `jobs` table has no `position_id` column; it uses `title` as the position name
- The `positions` table has `id` and `name`
- Assignment templates have a `position_ids` (UUID array) linking them to positions
- We match: job title -> position name -> position ID -> templates containing that ID

### New Hook: `useAssignmentTemplatesForPosition`
**File: `src/hooks/useAssignmentTemplatesForPosition.ts`**

- Accepts `jobTitle: string`
- Step 1: Query `positions` table to find position ID matching the job title (case-insensitive)
- Step 2: Query `assignment_templates` where `position_ids` contains that position ID, `is_active = true`
- Returns `{ templates, isLoading, positionId }`
- Uses TanStack Query with org scoping
- Stale time: 5 minutes

### New Component: `VacancyAssignmentCard`
**File: `src/components/hiring/VacancyAssignmentCard.tsx`**

A sidebar card that:
- Shows a header with ClipboardList icon + "Assignment Template" title
- If no matching templates found: shows subtle "No templates linked to this position" message with a link to create one
- If one template: displays it directly (name, type badge, recommended effort, deadline hours input)
- If multiple templates: shows a Select dropdown to pick one, then displays the selected template details
- Deadline hours: editable Input field (number) that updates the template's `default_deadline_hours` via mutation
- Shows computed deadline preview: "Due: [date/time from now]"
- Template details shown:
  - Template name (bold)
  - Type badge
  - Recommended effort (if set)
  - Expected deliverables summary (file uploads, URL fields count, text questions count)
  - Editable deadline hours with live preview

### Integration
**`src/pages/hiring/JobEdit.tsx`:**
- Import `VacancyAssignmentCard`
- Add it in the right column (line 873) between "Publishing Options" card and `JobPostPreview`
- Pass `jobTitle={formData.title}` as prop

### UI Design
- Card matches existing sidebar style (same Card/CardHeader/CardContent pattern)
- ClipboardList icon in the header
- Select dropdown for multiple templates follows existing Select component patterns
- Deadline hours input: compact number input with "hours" suffix and computed date preview below
- Deliverables shown as small badges/chips (e.g., "Files", "2 URLs", "3 Questions")
- Muted text for empty states

### Technical Notes
- Position matching is case-insensitive to handle slight variations
- The deadline hours update uses the existing `useUpdateAssignmentTemplate` mutation
- No database changes required -- all data structures already exist
- The card gracefully handles: no position match, no templates, single template, multiple templates
