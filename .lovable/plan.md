

## Redesign Application Form Settings -- Calendly-Style with Drag-and-Drop and Extended Answer Types

### Overview

Redesign the `ApplicationFormSettings` component to match Calendly's booking form builder. Fixed fields (Full Name, Email, Phone, Resume) stay pinned at the top and cannot be reordered. All other fields (Source, LinkedIn, Cover Letter, and custom questions) become a single unified list that supports drag-and-drop reordering. Each custom question opens an inline edit dialog with expanded answer types.

### New Answer Types

Expand `CustomFieldConfig.type` from `'text' | 'file'` to support:

| Type | Description | Public Form Renders |
|------|-------------|-------------------|
| `one_line` | Short text input | `<Input />` |
| `multiple_lines` | Long text | `<Textarea />` |
| `radio_buttons` | Single select from options | Radio group |
| `checkboxes` | Multi-select from options | Checkbox group |
| `dropdown` | Single select dropdown | `<Select />` |
| `phone_number` | Phone with country code | `<PhoneInput />` |
| `file` | File upload | File input |

### UI Layout (Calendly-style)

```text
Application Form
Configure fields shown to applicants

Applicant Questions
+--------------------------------------------------+
| [lock] Full Name, Email, Phone, Resume           |
+--------------------------------------------------+
| [grip] Q1: Source                          [...]  |
|        Dropdown                                   |
+--------------------------------------------------+
| [grip] Q2: LinkedIn URL                    [...]  |
|        One Line                                   |
+--------------------------------------------------+
| [grip] Q3: Portfolio Link                  [...]  |
|        One Line                                   |
+--------------------------------------------------+
| + Add new question                                |
+--------------------------------------------------+
```

- The locked row at top shows the 4 required fields in one row (non-draggable, non-editable)
- Each question row shows: drag handle, question number, label, answer type, and a 3-dot menu (edit/delete)
- Clicking a row or "Edit" opens an edit dialog (like the Calendly screenshot) with: Question text, Required checkbox, Answer Type dropdown, and Options list (for radio/checkboxes/dropdown)

### Files to Modify

**1. `src/types/hiring.ts`**
- Expand `CustomFieldConfig.type` union to include all 7 answer types
- Add `options?: string[]` to `CustomFieldConfig` (for radio/checkboxes/dropdown)
- Remove `optional_fields` from `ApplicationFormConfig` -- LinkedIn, Cover Letter, and Source become regular custom fields in the unified list with pre-set defaults

**2. `src/components/hiring/ApplicationFormSettings.tsx`** (major rewrite)
- Replace 4-section layout with Calendly-style single list
- Fixed header row for locked fields (Full Name, Email, Phone, Resume)
- Sortable list using `@dnd-kit/sortable` for all other fields (Source, LinkedIn, Cover Letter are now just pre-seeded custom fields)
- Each item: drag grip icon, "Q{n}:" prefix, label, type subtitle, 3-dot menu
- "Add new question" button at bottom
- Edit question dialog with: Question text input, Required checkbox, Answer Type select (all 7 types), Options builder (for radio/checkboxes/dropdown types)
- Source Options editing moves into the Source field's edit dialog (as its dropdown options)

**3. `src/pages/careers/JobDetailPublic.tsx`**
- Update the custom fields rendering to handle all 7 new answer types
- Render radio buttons, checkboxes, dropdowns, phone input, textarea based on field type
- Remove the separate `optional_fields` handling -- all fields come from the unified `custom_fields` list now

**4. `src/pages/hiring/JobEdit.tsx` and `src/pages/hiring/JobCreate.tsx`**
- When initializing `application_form_config`, if `custom_fields` is empty, seed with default fields: Source (dropdown), LinkedIn URL (one_line, not required)
- Migration logic: if old `optional_fields` format is detected, convert to the unified custom_fields format

**5. `supabase/functions/submit-public-application/index.ts`**
- Handle new field types in form submission (radio, checkboxes, dropdown values stored as strings/arrays in custom_fields JSON)

### Data Migration Approach

No database migration needed -- `application_form_config` is already a JSONB column. The new format simply stores all configurable fields in `custom_fields[]` instead of splitting between `optional_fields` and `custom_fields`. The code will handle backward compatibility by detecting the old format and converting on read.

### Default Custom Fields (seeded on new jobs)

```json
{
  "custom_fields": [
    { "id": "source", "label": "Source", "type": "dropdown", "required": true, "options": ["LinkedIn", "Referral", "Job Board", "Company Website", "Other"] },
    { "id": "linkedin_url", "label": "LinkedIn / Personal URL", "type": "one_line", "required": false }
  ]
}
```

### Technical Details

- Uses `@dnd-kit/sortable` (already installed) with `verticalListSortingStrategy`
- `SortableContext` wraps the custom fields list; locked fields stay outside
- Edit dialog uses the existing `Dialog` component
- Answer type icons match Calendly's pattern for visual recognition

