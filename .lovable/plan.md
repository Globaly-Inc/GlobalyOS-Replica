

# Fix Form Builder: Column Width, System Field Labels, and Missing Flows

## Issues Found

### Bug 1: Column Width Does Not Apply Visually
The "Half Width" / "Full Width" setting saves correctly to the node data, but neither the **canvas** nor the **public form renderer** reads `node.properties.columns` to change the element width. Both render every node at full width in a simple vertical list.

**Fix**: Update `FormCanvas.tsx` to use a CSS grid layout that groups consecutive half-width fields into 2-column rows. Update `PublicFormRenderer.tsx` to do the same. Update `CanvasElement.tsx` to show a visual indicator of column width.

### Bug 2: Label Field Lacks System Field Selector
The Label input in Properties is a plain text input. Users expect to pick from system/predefined field names (Name, Email, Phone, Street, City, Country, Date of Birth, etc.) based on the field type they chose, rather than typing manually.

**Fix**: Add a dropdown of suggested system labels above or integrated with the Label input in `PropertiesTab.tsx`. The dropdown will show relevant predefined labels. Users can still type a custom label.

### Bug 3: Missing User Flows
After auditing all routes and components:

1. **Forms list -> Form Detail page lacks "Share" button** -- the detail page has Edit and Export but no Share
2. **Public form page has no confirmation screen** -- after submission it just shows an alert, should show a proper confirmation view
3. **No "Back to forms" link from builder** -- Cancel navigates back, but there is no breadcrumb or back arrow
4. **Preview dialog does not reflect column widths** -- since PublicFormRenderer ignores columns
5. **FormDetailPage missing DialogDescription** -- accessibility warning

---

## Technical Changes

### 1. Column Width Grid Layout (`FormCanvas.tsx`)
- Replace the simple `space-y-2` list with a grid-based renderer
- Group consecutive `columns: 2` nodes into pairs rendered in a 2-column CSS grid row
- Full-width nodes (`columns: 1` or elements) span the full width
- Logic: iterate nodes, collect consecutive half-width fields into grid rows, render full-width nodes as standalone

### 2. Column Width in Public Renderer (`PublicFormRenderer.tsx`)
- Apply the same grid grouping logic to the public renderer
- Half-width fields sit side-by-side, full-width fields span 100%

### 3. Visual Indicator in Canvas Element (`CanvasElement.tsx`)
- Show a small "1/2" badge on half-width elements so the user can see the setting at a glance

### 4. System Field Label Selector (`PropertiesTab.tsx`)
- Add a `Select` dropdown labeled "Suggested Labels" above the Label text input
- Options based on the node type:
  - `text`: Name, First Name, Last Name, Street, City, Company, Job Title
  - `email`: Email, Work Email, Secondary Email
  - `phone`: Phone, Mobile, Work Phone
  - `dropdown`: Country, State, Department
  - `date`: Date of Birth, Start Date, End Date
  - `file`: Cover Image, Logo, Resume, Attachment
  - Other types: generic suggestions
- Selecting a suggested label auto-fills the Label input and placeholder
- Users can still override with custom text

### 5. Public Form Confirmation Screen (`PublicFormPage.tsx` / `PublicFormRenderer.tsx`)
- After successful submission, show a styled confirmation card (checkmark, "Thank you" message, optional redirect) instead of a browser alert

### 6. FormDetailPage Share Button
- Add a Share button to the detail page header that opens `ShareFormDialog`

### 7. Accessibility Fix
- Add `DialogDescription` to the submission viewer dialog in `FormDetailPage.tsx`

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/forms/FormCanvas.tsx` | Grid layout grouping for column widths |
| `src/components/forms/CanvasElement.tsx` | Half-width badge indicator |
| `src/components/forms/PropertiesTab.tsx` | System field label selector dropdown |
| `src/components/forms/PublicFormRenderer.tsx` | Grid layout for columns + confirmation screen |
| `src/pages/public/PublicFormPage.tsx` | Confirmation state after submit |
| `src/pages/crm/forms/FormDetailPage.tsx` | Share button + DialogDescription |

