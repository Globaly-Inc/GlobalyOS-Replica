

## Upgrade Wiki Editor to BlockNote.js (Block-Based Editor)

### Summary
Replace the current custom HTML `contenteditable`-based Wiki editor (2382-line WikiRichEditor.tsx) with **BlockNote.js** -- a modern, block-based rich text editor (the same library used by suitenumerique/docs). This brings slash commands, drag-and-drop blocks, a polished formatting toolbar, image/file blocks, and a foundation for AI writing assist and export features.

### Why BlockNote.js
- It is the same editor powering suitenumerique/docs (16k GitHub stars)
- Block-based architecture (like Notion): headings, paragraphs, lists, images, tables, code blocks are all draggable/nestable blocks
- Built-in slash menu (`/` commands), formatting toolbar, drag handles
- Clean React API with TypeScript support
- Supports custom blocks (callouts, PDF embeds, etc.)
- Built on ProseMirror/TipTap -- battle-tested
- Future-ready for real-time collaboration (Yjs integration available)

### Phase 1: Core Editor Replacement (This Implementation)

#### 1. Install Dependencies
Add the following npm packages:
- `@blocknote/core` -- Core editor engine
- `@blocknote/react` -- React hooks and components
- `@blocknote/mantine` -- Pre-styled UI components (toolbar, menus, slash menu)

#### 2. Create New BlockNote Editor Component
**New file**: `src/components/wiki/BlockNoteWikiEditor.tsx`
- Wrapper component using `useCreateBlockNote` hook
- `BlockNoteView` with Mantine theme for consistent UI
- Props: `initialContent` (BlockNote JSON or HTML string), `onChange` callback, `editable` flag
- Content storage: Store content as **BlockNote JSON** (array of blocks) in the database for lossless round-tripping. The existing `content` column (text) can hold JSON-stringified block data.
- HTML conversion: Use BlockNote's built-in `blocksToHTMLLossy` for rendering in read-only views and exports
- Image uploads: Integrate with existing wiki-attachments storage bucket via BlockNote's `uploadFile` callback

#### 3. Data Migration Strategy
- **New pages**: Stored as BlockNote JSON in `wiki_pages.content`
- **Existing pages**: Contain HTML. BlockNote can parse HTML into blocks via `tryParseHTMLToBlocks`. On first edit, the HTML is converted to blocks. On save, blocks are stored as JSON.
- **Detection**: A simple heuristic -- if `content` starts with `[` it is JSON (blocks), otherwise it is legacy HTML
- **Read-only view**: Legacy HTML pages render through the existing `WikiMarkdownRenderer`. New JSON pages render through `BlockNoteReader` (non-editable BlockNote view).

#### 4. Update WikiEditPage (`src/pages/WikiEditPage.tsx`)
- Replace `WikiRichEditor` import with `BlockNoteWikiEditor`
- Convert initial page content (HTML or JSON) to BlockNote blocks on load
- On save, serialize blocks to JSON string for storage
- Keep existing draft save (localStorage), unsaved changes detection, and save/close flow
- Remove old `WikiRichEditor` component reference

#### 5. Update WikiContent Read-Only View (`src/components/wiki/WikiContent.tsx`)
- For JSON content: Use `BlockNoteReader` (read-only BlockNote view) instead of `WikiMarkdownRenderer`
- For legacy HTML content: Continue using `WikiMarkdownRenderer` as fallback
- Table of Contents: Extract headings from BlockNote blocks instead of parsing markdown/HTML

#### 6. Built-in Features (come free with BlockNote)
- **Slash menu** (`/`): Type `/` to see block types (heading, list, image, table, code, quote, etc.)
- **Drag handles**: Every block has a drag handle for reordering
- **Formatting toolbar**: Appears on text selection (bold, italic, underline, link, colors)
- **Block nesting**: Indent/outdent for nested lists and content
- **Image blocks**: Upload, resize, caption
- **Table blocks**: Add/remove rows and columns
- **Code blocks**: Syntax-highlighted code with language selection

### Phase 2: Export Formats

#### 7. Document Export (`src/components/wiki/WikiExportMenu.tsx`)
Update the existing export menu to support:
- **PDF**: Use BlockNote's HTML output + existing html2canvas/print approach
- **DOCX**: Use BlockNote's built-in `blocksToDocx` (or HTML-to-DOCX conversion)
- **Markdown**: Use BlockNote's `blocksToMarkdownLossy` for markdown export
- Keep the existing export menu UI pattern

### Phase 3: AI Writing Assist

#### 8. AI Block Actions
- Add a custom formatting toolbar button "AI Assist" that appears on text selection
- Actions: Rephrase, Summarize, Fix typos, Translate, Make shorter/longer
- Uses existing Lovable AI (Gemini) integration pattern via edge function
- Selected text is sent to AI, response replaces or inserts below the selection
- Reuse the existing `WikiAIWritingAssist` pattern but adapted for BlockNote's API

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/wiki/BlockNoteWikiEditor.tsx` | Main editor component wrapping BlockNote |
| `src/components/wiki/BlockNoteWikiReader.tsx` | Read-only renderer for JSON content |
| `src/components/wiki/blocknote-styles.css` | Custom CSS overrides for BlockNote theme to match GlobalyOS |

### Files to Modify
| File | Change |
|------|--------|
| `src/pages/WikiEditPage.tsx` | Replace WikiRichEditor with BlockNoteWikiEditor |
| `src/components/wiki/WikiContent.tsx` | Add JSON content detection, use BlockNoteWikiReader for new content |
| `src/components/wiki/WikiTableOfContents.tsx` | Support extracting headings from BlockNote JSON |
| `src/components/wiki/WikiExportMenu.tsx` | Update export logic for BlockNote content |

### Files to Keep (no changes needed)
- `src/pages/Wiki.tsx` -- Folder/page management stays the same
- `src/components/wiki/WikiSidebar.tsx` -- No changes
- `src/components/wiki/WikiSearch.tsx` -- Search still works on content column
- All wiki RLS policies and database structure -- No schema changes needed

### Files to Deprecate (kept for legacy HTML rendering)
- `src/components/wiki/WikiRichEditor.tsx` -- No longer used for editing, but kept temporarily
- `src/components/wiki/editor/EditorToolbar.tsx` -- Part of old editor

### Technical Considerations
- **Bundle size**: BlockNote adds approximately 200-300KB gzipped. This is acceptable for a SaaS app and can be code-split (lazy loaded on the wiki route).
- **Content column**: The existing `text` column in `wiki_pages.content` works for both HTML and JSON strings. No schema change needed.
- **Backward compatibility**: Old HTML pages are still readable. They are converted to blocks on first edit.
- **Performance**: BlockNote uses ProseMirror under the hood, which is highly optimized for large documents.
- **Security**: BlockNote sanitizes content internally. No raw HTML injection risk.
- **Mobile**: BlockNote has responsive support. The formatting toolbar adapts to mobile viewports.

