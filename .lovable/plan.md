
## Fix: BlockNote Toolbar/Dropdown Cut Off at Top

**Problem:**
The BlockNote formatting toolbar and its "text type" dropdown (Paragraph, Heading 1, etc.) get clipped at the top of the editor area. This happens because the editor content wrapper at line 293 has `overflow-y: auto`, which creates a new stacking/clipping context that cuts off any floating UI that extends above the visible scroll area.

**Solution:**
Two changes are needed:

1. **Remove `overflow-y-auto` from the editor container** (line 293 in `WikiEditPage.tsx`) and replace it with `overflow-y: visible` so floating menus are not clipped. Move the scroll behavior to the outer page layout or let the page scroll naturally.

2. **Add CSS to ensure BlockNote floating elements have high z-index and are not clipped** in `blocknote-styles.css` -- strengthen the existing `[data-floating-ui-portal]` rule to ensure the toolbar dropdowns render above all other content.

**Technical Details:**

**File: `src/pages/WikiEditPage.tsx` (line 293)**
- Change `className="flex-1 overflow-y-auto"` to `className="flex-1 min-h-0 overflow-visible"` (or simply `"flex-1"` and let the parent handle scrolling).
- Wrap the outer page container (the full-screen flex column) with `overflow-y-auto` instead, so scrolling happens at the page level rather than clipping the editor's floating UI.

**File: `src/components/wiki/blocknote-styles.css`**
- Update the `[data-floating-ui-portal]` z-index rule to use `z-index: 9999` for safety.
- Add `overflow: visible` to `.bn-container` to prevent any internal clipping.

These changes ensure the formatting toolbar and all its dropdown menus (text type selector, color picker, etc.) render fully visible regardless of scroll position.
