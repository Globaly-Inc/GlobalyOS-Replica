
## Fix Comment System Issues and Add @Mentions

Three issues to address:

### Issue 1: Duplicate Comment Icons in Toolbar
`getFormattingToolbarItems()` from BlockNote already includes two built-in comment buttons (one for the CommentsExtension and one for Tiptap comments). The code then manually adds a THIRD `<AddCommentButton />` on line 357. This results in duplicate comment icons.

**Fix**: Remove the manually added `<AddCommentButton />` from the formatting toolbar since `getFormattingToolbarItems()` already provides it.

**File: `src/components/wiki/BlockNoteWikiEditor.tsx` (line 357)**
- Remove `{commentsEnabled && <AddCommentButton />}`
- Remove the `AddCommentButton` import (line 13)

---

### Issue 2: Comment Composer Disappears When Clicking Textarea
The `BlockNoteView` component does not have `comments={false}` set, so it renders its own default `FloatingComposerController` and `FloatingThreadController` internally (via BlockNote's default UI). The code ALSO manually renders these same controllers at lines 380-382. This creates two competing floating controllers -- when one opens, the other interferes, causing the composer to immediately close when interacted with.

**Fix**: Add `comments={false}` to `BlockNoteView` so only the manually rendered controllers are active, OR remove the manual controllers and let the default UI handle it. Since the manual controllers don't add any customization, the simplest fix is to remove them and let `BlockNoteView` handle comments automatically.

**File: `src/components/wiki/BlockNoteWikiEditor.tsx`**
- Remove lines 377-383 (manual `FloatingComposerController` and `FloatingThreadController`)
- Keep the default comments UI from `BlockNoteView` (do NOT set `comments={false}`)

---

### Issue 3: Enable @Mentions in Document Comments
Implement team member mentions in comments using the `resolveUsers` function that already exists.

Currently, `resolveUsers` is passed to `CommentsExtension` which handles resolving user data for display. To enable @mentions in comment editors, we need to add a `mentionUsers` resolver that queries accessible team members when "@" is typed.

**File: `src/components/wiki/collaboration/useResolveUsers.ts`**
- Add a `mentionUsers` function that queries employees by search term
- Export it alongside `resolveUsers`

**File: `src/components/wiki/BlockNoteWikiEditor.tsx`**
- Pass `mentionUsers` to the `CommentsExtension` configuration

---

### Summary of Changes

| File | Change |
|------|--------|
| `src/components/wiki/BlockNoteWikiEditor.tsx` | Remove duplicate `AddCommentButton` import and usage; remove manual `FloatingComposerController`/`FloatingThreadController`; add `mentionUsers` to CommentsExtension |
| `src/components/wiki/collaboration/useResolveUsers.ts` | Add `mentionUsers` function for @mention search |
