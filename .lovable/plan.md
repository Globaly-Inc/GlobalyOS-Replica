
## Preview Button for Assignment Template Editor

### What's Being Built

A "Preview" button will be added next to "Cancel" and "Save Changes" in the `AssignmentTemplateEditor` header. Clicking it opens a large dialog that renders the assignment exactly as a candidate sees it on the public `/assignment/:token` page — including the OTP gate screens (simulated), the instruction panel, deliverables form, and questions. A "Copy Public Link" button will also be shown (only in edit mode, since a real token requires a saved instance).

### Where the User Clicked

The user selected the action buttons `div` at line 133 of `AssignmentTemplateEditor.tsx`:
```
<div className="flex items-center gap-2">
  <Button variant="outline" onClick={goBack}>Cancel</Button>
  <Button onClick={handleSave}>Save Changes</Button>
</div>
```

A "Preview" button with an `Eye` icon will be inserted between Cancel and Save.

---

### New Component: `AssignmentPreviewDialog`

A new file `src/components/hiring/AssignmentPreviewDialog.tsx` will be created.

**Dialog specs:**
- Size: `max-w-4xl`, full height using `h-[90vh]` with internal scroll
- Layout: 3 tabs at the top for the 3 states — **Email Gate**, **Assignment View**, **Success Screen** — so the recruiter can explore all states
- Content mirrors `AssignmentSubmission.tsx` exactly (same structure, same styles), but:
  - Data comes from the `formData` prop (template fields), not from a DB query
  - It's read-only / non-interactive (inputs are disabled/displayed for illustration)
  - Shows "PREVIEW" watermark badge in corner so it's clearly not the live page

**Preview Tab 1 — "Email Gate" preview:**
- Renders the `email_entry` card exactly as a candidate would see it (Lock icon, email input, Send button)
- All inputs are disabled — this is a visual preview only

**Preview Tab 2 — "Assignment" preview:**
- Header card: Shows the template `name` as title, a mock deadline badge ("3 days from now" calculated from `default_deadline_hours`)
- `recommended_effort` shown if set (with a clock icon)
- Instructions panel: renders the rich text `instructions` HTML via `DOMPurify.sanitize` + `dangerouslySetInnerHTML` exactly as `AssignmentSubmission.tsx` does
- Submission section:
  - URL fields rendered as disabled inputs (one per label in `url_fields`)
  - File upload area shown if `files = true`
  - Questions shown as disabled form fields (radio group for MC, textarea for paragraph)
- Submit button shown but disabled

**Preview Tab 3 — "Success" preview:**
- The green `CheckCircle2` success card with the "Assignment Submitted!" message

**Copy Link section (edit mode only):**
- Below the tabs, a "Public Assignment Link" info note explains that actual public links are generated per candidate when assignments are dispatched
- In edit mode, shows a gray info card: "Links are generated when you assign this template to a candidate" 
- In cases where a `secure_token` is passed (optional prop for future use), shows the full URL with a Copy button using the `Copy` Lucide icon + `navigator.clipboard.writeText()`

---

### Changes to `AssignmentTemplateEditor.tsx`

1. Import `Eye` from lucide-react and import the new `AssignmentPreviewDialog` component
2. Add `previewOpen` state: `const [previewOpen, setPreviewOpen] = useState(false)`
3. Add the Preview button between Cancel and Save:
```tsx
<Button variant="outline" onClick={() => setPreviewOpen(true)} className="gap-2">
  <Eye className="h-4 w-4" />
  Preview
</Button>
```
4. Render the dialog:
```tsx
<AssignmentPreviewDialog
  open={previewOpen}
  onOpenChange={setPreviewOpen}
  formData={formData}
  isEditMode={isEditMode}
/>
```

---

### Files to Change

| File | Change |
|---|---|
| `src/pages/hiring/AssignmentTemplateEditor.tsx` | Add Preview button + state + render dialog |
| `src/components/hiring/AssignmentPreviewDialog.tsx` | **New** — full preview dialog with 3 tabs |

No backend changes, no DB migrations, no edge functions needed.

---

### UX Details

- The dialog header has a clear "Preview" label with a subtitle: "This is how candidates experience this assignment"
- A subtle amber `PREVIEW MODE` pill badge is shown in the top-right of the dialog to make it unmistakably a preview
- Tabs use standard pill-style navigation consistent with GlobalyOS patterns
- The content area is scrollable independently so the tab bar and dialog header stay fixed
- For the Copy Link feature: in edit mode, show a note explaining that links are per-candidate; offer a "Learn more" tooltip explaining the OTP flow
- Smooth fade-in animation via the existing Dialog component
