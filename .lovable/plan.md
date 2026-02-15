

## Fix: Revert Broken Comment Overrides and Restore Working Editor

### Root Cause

The **"Extension not found"** error is crashing the entire wiki editor page. This is caused by two things:

1. **`commentEditorSchemaWithMentions`** passes fake/empty implementations for `text` and `link` inline content specs (`implementation: {} as any`). When BlockNote's `CommentsExtension` tries to instantiate comment editors using this schema, it fails because the TipTap extensions backing those specs don't exist.

2. **`CommentEditorWithMentions`** creates a nested `BlockNoteView` inside the parent `BlockNoteView`, which causes context conflicts and extension resolution failures.

These two issues together crash the editor on mount, which also breaks real-time collaboration (the editor never renders, so the Yjs provider never connects).

### Fix Strategy

Strip out the broken custom schema and editor overrides. Keep only what works reliably:

- **Comment actions always visible**: Keep the `CommentsAlwaysShowActions` wrapper but remove the custom `Editor` override (which causes the crash). Only override `Comment` with `showActions={true}`.
- **@Mentions in comments**: Remove for now. BlockNote v0.46 does not support custom schemas or custom editors for its internal comment mini-editors without causing extension resolution failures. The `mentionUsers` function remains in the codebase for future use.
- **Real-time collaboration**: Will be restored automatically once the crash is fixed.

### Technical Changes

**1. `src/components/wiki/comments/CommentAlwaysShowActions.tsx`**
- Remove the `Editor: CommentEditorWithMentions` override from `patchedComponents`
- Keep only the `Comment: PatchedComment` override (for always-show actions)
- Remove `MentionUsersContext` since it's no longer needed here

**2. `src/components/wiki/BlockNoteWikiEditor.tsx`**
- Remove the `commentEditorSchemaWithMentions` import
- Remove `schema: commentEditorSchemaWithMentions` from the `CommentsExtension()` call
- Remove `mentionUsers` from the `CommentsAlwaysShowActions` props (keep it as a simple wrapper)

**3. Files to leave in place (unused but harmless)**
- `MentionInlineContent.tsx`, `commentEditorSchema.ts`, `CommentEditorWithMentions.tsx` -- these can stay in the codebase. They are not imported by anything once the above changes are made, so they won't cause errors.

### What This Restores

| Feature | Status |
|---------|--------|
| Wiki editor loads without crash | Fixed |
| Real-time collaboration (cursors, presence) | Fixed (was blocked by crash) |
| Comment actions always visible | Working (Comment component override kept) |
| Comments sidebar toggle | Working (layout changes preserved) |
| @Mentions in comments | Deferred (not supported by BlockNote v0.46 internal comment editors) |

