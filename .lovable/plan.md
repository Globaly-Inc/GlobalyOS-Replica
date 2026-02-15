
## Fix: Show Formatting Toolbar Below Text (Not Above)

**Problem:**
The BlockNote formatting toolbar appears above the selected text by default, and gets clipped by the sticky header at the top of the editor page. The `overflow-y-auto` on the scroll container creates a clipping boundary, and `flip()` middleware does not help because the header overlay blocks the space.

**Solution:**
Force the formatting toolbar to always appear **below** the selected text by passing custom `floatingUIOptions` to the `FormattingToolbarController`. This avoids the clipping entirely because the toolbar will render into the content area below the selection, never near the header.

**Technical Details:**

**File: `src/components/wiki/BlockNoteWikiEditor.tsx` (around line 345)**

Pass a `floatingUIOptions` prop to `FormattingToolbarController` that overrides the default `placement` from `"top-start"` to `"bottom-start"`, and replaces the `flip()` middleware with one that only flips to other bottom placements (so it never flips back up behind the header):

```tsx
<FormattingToolbarController
  floatingUIOptions={{
    useFloatingOptions: {
      placement: "bottom-start",
      middleware: [offset(10), shift()],
    },
  }}
  formattingToolbar={() => (
    <div className="bn-toolbar bn-formatting-toolbar" role="toolbar">
      {getFormattingToolbarItems()}
      <AIToolbarButton />
      {commentsEnabled && <AddCommentButton />}
    </div>
  )}
/>
```

- Import `offset` and `shift` from `@floating-ui/react` at the top of the file.
- The `placement: "bottom-start"` ensures the toolbar always renders below text.
- Removing `flip()` prevents the toolbar from flipping back above (where it gets clipped).
- `shift()` keeps the toolbar within the viewport horizontally.

**File: `src/components/wiki/BlockNoteWikiEditor.tsx` (imports)**

Add to existing imports:
```tsx
import { offset, shift } from "@floating-ui/react";
```

**Files to modify:**
- `src/components/wiki/BlockNoteWikiEditor.tsx` (2 changes: add import + pass floatingUIOptions)
