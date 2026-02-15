

## Fix Comments Sidebar Toggle and Improve Layout

### Problem
The comments sidebar toggle button exists but the sidebar doesn't display properly. The sidebar is currently nested deep inside the editor's container div (`container mx-auto`) and the scrollable area, which constrains it to the content width instead of appearing as a proper side panel.

### Solution

**File: `src/pages/WikiEditPage.tsx`**
- Restructure the editor content area to use a flex layout at the top level (below the header)
- When `showCommentsSidebar` is true, split the view into two panels: editor (flex-1) and sidebar (fixed width, full height)
- Move the `ThreadsSidebar` rendering out of `BlockNoteWikiEditor` and into the page layout for proper positioning
- The sidebar will be a right-side panel with its own scroll, border, header ("Comments" title), and full height

**File: `src/components/wiki/BlockNoteWikiEditor.tsx`**
- Remove the internal sidebar rendering (lines 344, 345, 377-385) since the parent page will handle sidebar layout
- Remove the `showCommentsSidebar` prop -- the editor no longer needs to know about sidebar state
- Keep `CommentsAlwaysShowActions` wrapper and all comment functionality intact

### Layout Structure (when sidebar is open)

```text
+----------------------------------------------------------+
| Header: [Title] [Save] [Avatars] [Comments] [Close]      |
+----------------------------------------------------------+
| Editor Content (flex-1, scrollable)  | Comments Sidebar   |
|                                      | (w-80, border-l)   |
|  [BlockNote editor in container]     | [ThreadsSidebar]   |
|                                      |                    |
+--------------------------------------+--------------------+
```

### Detailed Changes

**`src/pages/WikiEditPage.tsx`:**
- Import `ThreadsSidebar` from `@blocknote/react`
- Change the editor content area from a single scrollable div to a flex row
- Left panel: editor with `flex-1 overflow-y-auto`
- Right panel (conditional): sidebar with `w-80 border-l bg-card overflow-y-auto` and a "Comments" header with close button
- Remove `showCommentsSidebar` prop from `BlockNoteWikiEditor`
- The sidebar renders `ThreadsSidebar` wrapped in `CommentsAlwaysShowActions` (needs to be inside BlockNoteView context -- so actually the sidebar must remain inside BlockNoteWikiEditor)

**Revised approach**: Since `ThreadsSidebar` must be rendered inside `BlockNoteView` to access the editor context, the sidebar layout split must happen INSIDE `BlockNoteWikiEditor`. The fix is to restructure the internal layout so the sidebar extends to full height instead of being constrained by the container.

**`src/pages/WikiEditPage.tsx`:**
- Change the editor wrapper: when sidebar is open, don't constrain with `container mx-auto` -- use full width flex layout
- Pass `showCommentsSidebar` and a `onCloseSidebar` callback to `BlockNoteWikiEditor`

**`src/components/wiki/BlockNoteWikiEditor.tsx`:**
- Restructure the layout inside BlockNoteView: use a flex row that fills the available height
- Left side: the editor content in a scrollable, padded container
- Right side (when `showCommentsSidebar`): a fixed-width panel with a styled header ("Comments" + close button), then `ThreadsSidebar` below
- Add `onCloseSidebar` prop for the close button inside the sidebar header
- Use smooth transition (CSS) for the sidebar appearing/disappearing

**`src/components/wiki/blocknote-styles.css`:**
- Add styles for the comments sidebar panel header and thread list

