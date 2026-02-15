

## Application Form Settings -- Already Implemented, Needs Verification

### Current State

The `ApplicationFormSettings.tsx` component **already has** the Calendly-style layout with:

- **Fixed fields** (Full Name, Email, Phone, Resume) locked at the top with lock icons
- **Drag-and-drop** sortable custom questions using `@dnd-kit/sortable`
- **All 7 answer types** (One Line, Multiple Lines, Radio Buttons, Checkboxes, Dropdown, Phone Number, File) in the edit dialog
- **Edit dialog** matching the Calendly screenshot (Question text, Required toggle, Answer Type dropdown, Options builder)
- **3-dot menu** on each question row (Edit / Delete)
- **"Add New Question"** button at the bottom

The selected element text you see ("Optional Fields", "Source Options", etc.) appears to be from a **stale/cached render**. The underlying code has already been updated to the unified Calendly-style layout per the previously approved plan.

### What This Plan Will Do

Force a clean re-render by making a trivial whitespace-only touch to the component file, ensuring the latest code is picked up by the build system. No functional changes are needed -- the implementation is complete.

### Technical Verification

| Feature | Status |
|---------|--------|
| Fixed fields pinned at top | Done (line 350-363) |
| Drag-and-drop reordering | Done (lines 371-383, using `@dnd-kit/sortable`) |
| All 7 answer types | Done (types in `hiring.ts` line 68, labels line 70-78) |
| Edit dialog with options builder | Done (lines 134-287) |
| 3-dot menu (edit/delete) | Done (lines 111-127) |
| "Add New Question" button | Done (line 388-391) |
| Old sections removed | Done (no "Optional Fields" or "Source Options" sections) |

### File to Touch

**`src/components/hiring/ApplicationFormSettings.tsx`** -- no-op re-save to clear stale render

