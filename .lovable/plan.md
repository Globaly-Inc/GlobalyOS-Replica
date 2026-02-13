

## 1. Comments/Threads Support for Wiki Editor

### What It Does
Adds inline commenting directly on wiki page content. Team members can highlight text, leave comments, reply in threads, add emoji reactions, and resolve threads -- all using BlockNote's built-in `CommentsExtension`.

### How It Works

Comments are stored inside the Yjs document itself using `YjsThreadStore`. This means:
- Comments sync in real-time between all editors via the existing Supabase Realtime provider
- Comments persist as part of the Yjs state (synced to peers and loaded on reconnect)
- No new database tables are needed -- comment data lives in the Yjs document

User resolution (names/avatars) queries the existing `employees` + `profiles` tables.

### Changes

**`src/components/wiki/BlockNoteWikiEditor.tsx`**
- Import `CommentsExtension`, `YjsThreadStore`, `DefaultThreadStoreAuth` from `@blocknote/core/comments`
- Import `FloatingComposerController`, `FloatingThreadController`, `ThreadsSidebar`, `AddCommentButton` from `@blocknote/react`
- Create a `YjsThreadStore` backed by the same Yjs doc used for collaboration
- Create a `resolveUsers` function that fetches employee profiles from the database
- Add `CommentsExtension` to the editor's `extensions` array
- Add `FloatingComposerController` and `FloatingThreadController` inside `BlockNoteView`
- Add `AddCommentButton` to the formatting toolbar
- Accept a new `userId` prop (the employee ID used as the comment author)
- Accept a new `canComment` prop to control whether commenting is enabled
- Optionally show a `ThreadsSidebar` toggled by a prop

**`src/pages/WikiEditPage.tsx`**
- Pass `userId` (employee ID) and `canComment={true}` to the editor
- Add a toggle button in the header to show/hide the comments sidebar
- Pass the sidebar visibility state to the editor

---

## 2. "Who Is Viewing" Presence Indicator on Wiki Read View

### What It Does
Shows small avatar bubbles on the wiki page read view (not edit) indicating which team members are currently viewing the same page. Uses Supabase Realtime Presence -- lightweight, no database writes.

### How It Works

When a user opens a wiki page in read mode, the component joins a Supabase Realtime Presence channel scoped to that page (`wiki-viewers-{pageId}`). It tracks who is viewing and shows their avatars in the page header. When the user navigates away or the component unmounts, they leave the channel.

### Changes

**New file: `src/components/wiki/collaboration/WikiPageViewers.tsx`**
- A component that joins a Supabase Realtime Presence channel for the current page
- Tracks other viewers and displays their avatars as an overlapping stack
- Shows tooltip with names on hover
- Excludes the current user from the display
- Cleans up the channel on unmount

**New file: `src/hooks/useWikiPagePresence.ts`**
- A hook that manages the Supabase Realtime Presence channel for a wiki page
- Accepts `pageId`, `userName`, `userAvatar`, `employeeId`
- Returns a list of current viewers (excluding self)
- Handles join/leave/sync events

**`src/components/wiki/WikiContent.tsx`**
- Import and render `WikiPageViewers` in the header area next to the Edit button
- Pass the current page ID and user info
- Add `currentEmployeeId` and user name/avatar from props or hooks

**`src/pages/Wiki.tsx`**
- Pass `currentEmployeeId` (already available) and employee profile info down to `WikiContent`

---

## Technical Details

### Comments Architecture
```text
BlockNote Editor
  |-- CommentsExtension
  |     |-- YjsThreadStore (stores threads in Yjs doc)
  |     |-- resolveUsers (fetches from employees/profiles table)
  |     |-- DefaultThreadStoreAuth (role-based: editor vs commenter)
  |
  |-- UI Components
        |-- AddCommentButton (in formatting toolbar)
        |-- FloatingComposerController (new comment popup)
        |-- FloatingThreadController (thread view popup)
        |-- ThreadsSidebar (optional sidebar panel)
```

### Presence Architecture
```text
Wiki Read View
  |-- useWikiPagePresence hook
  |     |-- supabase.channel(`wiki-viewers-{pageId}`)
  |     |-- .on('presence', { event: 'sync' })
  |     |-- .track({ employeeId, name, avatar })
  |
  |-- WikiPageViewers component
        |-- Avatar stack showing current viewers
        |-- Auto-cleanup on unmount
```

### Files Summary

| Action | File |
|--------|------|
| Modify | `src/components/wiki/BlockNoteWikiEditor.tsx` -- add CommentsExtension + UI |
| Modify | `src/pages/WikiEditPage.tsx` -- pass userId, sidebar toggle |
| Create | `src/components/wiki/collaboration/WikiPageViewers.tsx` -- viewer avatars |
| Create | `src/hooks/useWikiPagePresence.ts` -- presence hook for read view |
| Modify | `src/components/wiki/WikiContent.tsx` -- add WikiPageViewers |
| Modify | `src/pages/Wiki.tsx` -- pass employee info to WikiContent |
| Modify | `src/components/wiki/blocknote-styles.css` -- comment thread styling |

### Dependencies
No new packages needed. `CommentsExtension` and `YjsThreadStore` are already available in the installed `@blocknote/core` v0.46.2. `FloatingComposerController`, `FloatingThreadController`, `ThreadsSidebar` are in `@blocknote/react` v0.46.2. Supabase Realtime Presence is already used by the collaboration provider.

