
## Widen Wiki Editor and Add Viewer Presence to Header

### Changes

**1. Expand editor width to full page width**
Remove the `max-w-6xl` constraint from both the header and editor content areas, replacing them with full-width layout (just keeping horizontal padding). This matches how other pages in the app use the full available width.

- Header: `max-w-6xl mx-auto px-6` becomes just `px-6` (full width)
- Editor body: `max-w-6xl mx-auto px-6` becomes just `px-6` (full width)

**2. Add "who is viewing" profile stack to the top bar**
Import and add the existing `WikiPageViewers` component next to the comments icon in the header. This shows stacked profile pictures of everyone currently viewing the page.

### Technical Details

**File: `src/pages/WikiEditPage.tsx`**

- Import `WikiPageViewers` from `@/components/wiki/collaboration/WikiPageViewers`
- Remove `max-w-6xl mx-auto` from the header inner div (line 229) and editor wrapper (line 292)
- Add `WikiPageViewers` in the header actions area, positioned before the comment toggle button, passing `pageId`, `employeeId` (from `currentEmployee`), `userName`, and `userAvatar` (from `currentEmployee?.profiles?.avatar_url`)
- Keep `WikiActiveEditors` as well -- it shows who is actively editing (cursor-based), while `WikiPageViewers` shows who is viewing the page (presence-based)
