

## Enhance File Uploads in Expected Deliverables

### What Changes

Update the "File uploads" checkbox area in the Expected Deliverables card to:
1. Show the list of accepted file types (PDF, DOC, DOCX, JPG, PNG, etc.)
2. Display the max file size (25MB, matching existing hiring-documents conventions)
3. Add a note that multiple file uploads are supported
4. Replace the bare checkbox with a more informative UI showing these details when enabled

### Technical Details

**File modified:** `src/pages/hiring/AssignmentTemplateEditor.tsx`

Changes to the Expected Deliverables card (lines 207-224):
- Keep the checkbox toggle for enabling file uploads
- When checked, show a helper text block listing:
  - Accepted types: PDF, DOC, DOCX, JPG, JPEG, PNG, GIF, WEBP
  - Max file size: 25MB per file
  - Multiple files allowed
- Use muted/secondary text styling consistent with the rest of the form
- This is a template configuration display only (informational for the template creator); actual upload validation happens at submission time

No database or type changes needed -- this is purely a UI enhancement to the existing boolean `files` toggle.

