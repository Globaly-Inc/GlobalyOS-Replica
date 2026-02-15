
## Redesign Assignment Template Editor Layout + Add Questions Builder

### Layout Change

Swap the current layout from "2-col main + 1-col sidebar" to:

```text
+---------------------------+--------------------------------------+
| LEFT (1/3)                | RIGHT (2/3)                          |
|                           |                                      |
| Basic Info                | Instructions (textarea)              |
|  - Name                   |                                      |
|  - Type                   |                                      |
|                           |                                      |
| Settings                  |                                      |
|  - Deadline hours         |                                      |
|  - Recommended effort     |                                      |
|                           |--------------------------------------+
| Positions                 | Questions                            |
|  - Multi-select           |  + Add Question button               |
|                           |  [Question 1] Multiple Choice / Para |
| Expected Deliverables     |  [Question 2] ...                    |
|  - File uploads           |                                      |
|  - URL fields             |                                      |
+---------------------------+--------------------------------------+
```

### Questions Builder

Each question has:
- **Question text** (required)
- **Type**: "Multiple Choice" or "Paragraph"
- For Multiple Choice: a list of options the user can add/remove
- Drag-to-reorder or up/down buttons for question ordering
- Delete button per question

Questions are stored in the existing `expected_deliverables` JSONB column as a new `questions` array, keeping the schema flexible without needing a migration.

Structure: `expected_deliverables.questions[]` where each item is:
```json
{
  "id": "uuid",
  "text": "What frameworks have you used?",
  "type": "multiple_choice" | "paragraph",
  "options": ["React", "Vue", "Angular"],
  "required": true
}
```

### Technical Details

**Files modified:**
- `src/pages/hiring/AssignmentTemplateEditor.tsx` -- Restructure layout (left sidebar 1/3, right content 2/3), add questions builder UI with add/edit/delete/reorder functionality
- `src/types/hiring.ts` -- Add `AssignmentQuestion` interface and update `ExpectedDeliverables` to include `questions` array

**No database migration needed** -- questions are stored inside the existing `expected_deliverables` JSONB column.

**No mutation changes needed** -- the existing create/update mutations already pass `expected_deliverables` as-is to the database.

### Questions Builder UX
- "Add Question" button at the top of the Questions card
- Each question is a collapsible card showing the question text and type
- Inline editing of question text, type toggle (Multiple Choice / Paragraph), and options list
- For Multiple Choice: an "Add Option" button with removable option chips/inputs
- Trash icon to delete a question
- Questions are numbered automatically
