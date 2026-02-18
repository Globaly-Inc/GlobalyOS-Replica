
## Reorder & Rename Sections in PipelineCard

### What's Changing

Inside the expanded collapsible panel for each pipeline stage, the four automation sections will be reordered and one renamed:

**Current order:**
1. Automation
2. Rejection Rules
3. Notify on Entry
4. Email Trigger

**New order:**
1. Notify on Entry
2. Email Trigger
3. Auto Assignment ← renamed from "Automation"
4. Rejection Rules

---

### Technical Details

**File:** `src/components/hiring/PipelineCard.tsx`

Only one section of code changes — the grid inside `<CollapsibleContent>` (lines 511–759). The four JSX blocks are cut and re-pasted in the new order, and the label string `"Automation"` on line 521 is updated to `"Auto Assignment"`.

No logic, state, handlers, or other files are touched.
