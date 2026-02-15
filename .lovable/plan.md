

## Make Editor Area Background White

**What will change:**
- The editor content container (the `div` at line 294 wrapping the BlockNote editor) will get a white background, rather than the entire page.

**Technical details:**
- At line 294 in `src/pages/WikiEditPage.tsx`, add `bg-white rounded-lg` to the existing `className` of the container div.
- This scopes the white background to just the editor area, not the full-page overlay.

**File to modify:**
- `src/pages/WikiEditPage.tsx` (line 294 only)

