
## Fix URL Fields Input — Tag-based Input

### Problem
The current URL fields input is a single text `<Input>` that joins all fields with commas and re-splits on change. The issue is that while typing, the split/join causes the cursor to jump or the comma to be consumed before the user finishes typing a label. It also doesn't feel like a multi-value input — there's no visual feedback of individual tags.

### Solution
Replace the single `<Input>` with a **tag-based input** pattern directly in `AssignmentTemplateEditor.tsx`:

- Each existing URL field renders as a **pill/badge** with a remove (×) button
- A plain `<Input>` at the end of the pills lets the user type the next field name
- Pressing **comma** or **Enter** commits the current typed value as a new tag
- Pressing **Backspace** on an empty input removes the last tag

This is a self-contained change — no new component needed, just replace the `<Input>` block at lines 234–252.

### Technical Details

**State**: Add a local `urlFieldInput` state string (the in-progress text being typed).

**Key handler on the input**:
```typescript
onKeyDown={(e) => {
  if (e.key === ',' || e.key === 'Enter') {
    e.preventDefault();
    const val = urlFieldInput.trim();
    if (val && !url_fields.includes(val)) {
      setFormData({ ...formData, expected_deliverables: { ...formData.expected_deliverables, url_fields: [...url_fields, val] } });
    }
    setUrlFieldInput('');
  }
  if (e.key === 'Backspace' && urlFieldInput === '') {
    // remove last tag
    setFormData({ ...formData, expected_deliverables: { ...formData.expected_deliverables, url_fields: url_fields.slice(0, -1) } });
  }
}}
```

**Visual layout**: A rounded border container that wraps the pill badges + the input inside it, looking like a multi-select field.

### Files Changed
- **`src/pages/hiring/AssignmentTemplateEditor.tsx`**: Replace the single `<Input>` block (lines 234–252) with the tag-based input. Add `urlFieldInput` local state. Import `X` from lucide-react for the remove icon on badges.

No database changes, no new files needed.
