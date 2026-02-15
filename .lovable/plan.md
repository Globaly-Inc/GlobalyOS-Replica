

## Widen Wiki Editor to Match Other Pages

### The Problem
The Wiki edit page uses `max-w-4xl` (896px) for both the header and editor content, making it noticeably narrower than other pages like Home which use the Tailwind `container` class (responsive, up to ~1280px on large screens).

### The Fix
Replace `max-w-4xl mx-auto` with `container mx-auto` in two places within `src/pages/WikiEditPage.tsx`:

1. **Header bar** (line 229): `max-w-4xl mx-auto px-4` becomes `container mx-auto px-4 md:px-8`
2. **Editor content area** (line 294): `max-w-4xl mx-auto px-4` becomes `container mx-auto px-4 md:px-8`

Also remove the `max-w-2xl` constraint on the title input wrapper (line 231) so the title field can use more of the available width.

This matches the exact padding (`px-4 md:px-8`) and width (`container`) used by Layout.tsx for all other pages.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/WikiEditPage.tsx` | Replace `max-w-4xl` with `container` in header and content; add `md:px-8` padding; remove `max-w-2xl` from title wrapper |

