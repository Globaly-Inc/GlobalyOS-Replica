

## Replace Instructions Textarea with Rich Text Editor

### What Changes

Replace the plain `<Textarea>` in the Instructions section of the Assignment Template Editor with the existing `RichTextEditor` component already used throughout the project (e.g., in Job Create/Edit pages).

### Technical Details

**File modified:** `src/pages/hiring/AssignmentTemplateEditor.tsx`

1. Import `RichTextEditor` from `@/components/ui/rich-text-editor`
2. Replace the `<Textarea>` at line 255 with `<RichTextEditor>`, passing:
   - `value={formData.instructions}`
   - `onChange` to update `formData.instructions`
   - `placeholder="Describe what the candidate needs to complete..."`
   - `minHeight="300px"`
3. Remove the now-unused `Textarea` import if no longer needed elsewhere in the file

The `RichTextEditor` provides a toolbar with Bold, Italic, Underline, Bullet List, and Numbered List -- matching the "simple toolbar on top" requirement. It stores content as sanitized HTML, which is compatible with the existing `instructions` text field.

