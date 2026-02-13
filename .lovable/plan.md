

## Real-time Collaboration for Wiki Editor

### Summary
Add multiplayer editing to the Wiki so team members can see each other's cursors and edits in real-time, like Google Docs. When multiple people open the same wiki page for editing, they will see colored cursors with names and live text changes from their teammates.

### How It Works

The collaboration uses Yjs (an industry-standard CRDT library) synced through the existing backend real-time infrastructure. No external services are needed.

```text
User A editing page            User B editing page
       |                              |
  BlockNote Editor              BlockNote Editor
  (Yjs Y.Doc)                  (Yjs Y.Doc)
       |                              |
       +--- Supabase Realtime --------+
            Broadcast Channel
            (wiki-collab-{pageId})
```

When a user types, the Yjs CRDT generates a small binary update, which is broadcast to all other users on the same page channel. Each user's editor applies the update locally -- conflict-free, no save needed for sync.

### What Users Will See

- Colored cursors with teammate names when multiple editors are on the same page
- Real-time text appearing as others type
- An avatar stack in the header showing who is currently editing
- Cursor labels that appear on activity and fade after idle

### Implementation Steps

#### 1. Install Dependencies
- `yjs` -- the core CRDT library
- `y-protocols` -- standard Yjs sync/awareness protocols (used internally)

#### 2. Create Custom Supabase Yjs Provider
Build a lightweight provider (`src/components/wiki/collaboration/SupabaseYjsProvider.ts`) that:
- Creates a Supabase Realtime Broadcast channel per wiki page
- Sends Yjs document updates as broadcast messages
- Receives updates from other users and applies them to the local Y.Doc
- Manages "awareness" (cursor positions, user name/color) via Supabase Realtime Presence
- Handles initial document sync: the first editor to join loads content from the database into the Yjs doc; latecomers sync from peers via Yjs state vector exchange
- Cleans up the channel on disconnect

#### 3. Update `BlockNoteWikiEditor.tsx`
- Accept new props: `pageId`, `userName`, `userColor`
- Create a `Y.Doc` and the custom Supabase provider
- Pass the `collaboration` option to `useCreateBlockNote` instead of `initialContent`:
  ```text
  collaboration: {
    provider,
    fragment: doc.getXmlFragment("document-store"),
    user: { name, color },
    showCursorLabels: "activity",
  }
  ```
- When collaboration is active, `initialContent` is not used (Yjs doc is the source of truth)
- On save, serialize the Yjs doc back to BlockNote JSON and persist to the database as before

#### 4. Update `WikiEditPage.tsx`
- Use `useCurrentEmployee` to get the current user's name and avatar
- Generate a consistent user color from the employee ID (deterministic hash)
- Pass `pageId`, `userName`, `userColor` to the editor
- Add an "Active Editors" avatar stack in the header showing who else is editing
- Track connected users via the provider's awareness state

#### 5. Create Active Editors Component
A small component (`WikiActiveEditors.tsx`) that:
- Subscribes to the Yjs awareness state
- Displays overlapping avatar circles for each connected user
- Shows a tooltip with names on hover
- Excludes the current user from the display

#### 6. Handle Edge Cases
- **Single user**: Works identically to current behavior (no sync overhead, Yjs doc is local-only until a peer joins)
- **First user loads content**: When no peers are present, the provider loads existing content from the `initialContent` prop into the Yjs doc
- **Save behavior**: Save button continues to work -- it reads the current Yjs doc state, serializes to JSON, and writes to the database
- **Reconnection**: If a user loses connection, the provider reconnects and resyncs via state vector exchange
- **Legacy HTML content**: Still handled via the existing HTML-to-blocks migration path before Yjs takes over

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/wiki/collaboration/SupabaseYjsProvider.ts` | Custom Yjs provider using Supabase Realtime Broadcast + Presence |
| `src/components/wiki/collaboration/useCollaborationColor.ts` | Hook to generate deterministic user colors from employee IDs |
| `src/components/wiki/collaboration/WikiActiveEditors.tsx` | Avatar stack showing who is currently editing |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/wiki/BlockNoteWikiEditor.tsx` | Add collaboration option with Yjs provider, handle initial content loading into Yjs doc |
| `src/pages/WikiEditPage.tsx` | Pass user info and pageId to editor, add active editors display in header |
| `src/components/wiki/blocknote-styles.css` | Style collaboration cursors and active editors |
| `package.json` | Add `yjs` dependency |

### Security Considerations

- The Supabase Realtime channel is scoped per page ID; only authenticated users with edit permission can join
- No document content is persisted through the realtime channel -- it is ephemeral broadcast only
- The save-to-database flow remains unchanged and uses the existing RLS policies
- Awareness data (cursor position, user name) is ephemeral and not stored

