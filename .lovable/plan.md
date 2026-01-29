

# Wiki Page, Rich Text Editor & Sharing - Audit Report & Improvement Plan

## Summary of Audit

I conducted a thorough review of the Wiki implementation covering:
- **WikiRichEditor.tsx** (2,532 lines) - WYSIWYG rich text editor with toolbar, tables, code blocks, embeds
- **WikiEditPage.tsx** - Full-screen editing interface with unsaved changes protection
- **WikiContent.tsx** - Page view with version history, table of contents, export
- **WikiShareDialog.tsx** (1,041 lines) - Comprehensive sharing with offices, departments, projects, members
- **WikiMarkdownRenderer.tsx** - Content rendering with syntax highlighting
- **Supporting hooks and services** - useWikiPermissions, useWiki.ts, useWikiKeyboardShortcuts

---

## Issues Found

### Critical Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **WikiEditPage permission check ignores fine-grained permissions** | Users with page-level "edit" permission denied - only checks `isAdmin || isHR` role | `WikiEditPage.tsx` line 38 |
| **Missing autosave functionality** | Data loss risk - no draft saving during editing | `WikiEditPage.tsx` |
| **No character/word count in editor** | UX gap - users can't track content length | `WikiRichEditor.tsx` |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **Large editor file size (2,532 lines)** | Maintainability concern - single component is very large | `WikiRichEditor.tsx` |
| **No loading state for image/file uploads in editor toolbar** | User confusion - button disabled but no feedback on progress | `WikiRichEditor.tsx` |
| **Version history doesn't show content diff preview** | Hard to compare changes before restoring | `WikiVersionDiff.tsx` |
| **Keyboard shortcut for save doesn't show feedback** | User may not know if Ctrl+S worked | `WikiEditPage.tsx` |
| **Missing undo/redo buttons in toolbar** | Users expect visual undo/redo buttons beyond keyboard shortcuts | `WikiRichEditor.tsx` |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No collaborative editing indicator | Users don't know if others are editing same page | Not implemented |
| Missing "Copy code" success state consistency | Button shows checkmark but toast also appears - redundant | `WikiRichEditor.tsx` |
| No empty state for version history | Sheet opens with no message when no versions exist | `WikiContent.tsx` |
| Table column resize handle hard to discover | No visual indicator until hover | `WikiRichEditor.tsx` |
| No tooltip for text size input | Users may not know the valid range (8-72) | `WikiRichEditor.tsx` |

---

## Implementation Plan

### Phase 1: Critical Fixes

**1. Fix WikiEditPage permission check to use fine-grained permissions**

Currently line 38 only checks:
```typescript
const canEdit = isAdmin || isHR;
```

This should use the `can_edit_wiki_item` RPC function or `useWikiPermissions` hook:

```text
File: src/pages/WikiEditPage.tsx

Changes:
- Import useWikiPermissions hook
- Add check for page-level edit permission via can_edit_wiki_item RPC
- Combine with existing role check: (isAdmin || isHR) || canEditViaPermission
- Only redirect when all permission checks fail AND role has loaded
```

**2. Add autosave functionality**

```text
File: src/pages/WikiEditPage.tsx

Changes:
- Add debounced autosave (every 30 seconds of inactivity after change)
- Show "Draft saved" indicator in header
- Store draft in localStorage as fallback
- Restore draft on page load if newer than server version
- Clear draft on successful explicit save
```

**3. Add word/character count to editor**

```text
File: src/components/wiki/WikiRichEditor.tsx

Changes:
- Add status bar at bottom of editor
- Show word count, character count, reading time estimate
- Update counts on input using debounced callback
```

---

### Phase 2: UX Enhancements

**4. Add undo/redo buttons to toolbar**

```text
File: src/components/wiki/WikiRichEditor.tsx

Changes:
- Add Undo and Redo buttons to toolbar
- Use document.execCommand('undo') and document.execCommand('redo')
- Style like other toolbar buttons
```

**5. Improve save feedback**

```text
File: src/pages/WikiEditPage.tsx

Changes:
- Show "Saving..." state when Ctrl+S triggered
- Flash "Saved" indicator briefly on success
- Add visual feedback to Save button during save
```

**6. Add empty state for version history**

```text
File: src/components/wiki/WikiContent.tsx

Changes:
- Inside version history Sheet, show message when versions.length === 0
- Message: "No previous versions. Changes are saved when you save the page."
```

**7. Add tooltip to text size input**

```text
File: src/components/wiki/WikiRichEditor.tsx

Changes:
- Wrap text size input in Tooltip
- Show "Font size (8-72)" on hover
```

---

### Phase 3: Code Quality Improvements

**8. Extract editor sub-components for maintainability**

The WikiRichEditor.tsx file is 2,532 lines - too large for easy maintenance. Consider extracting:

```text
Potential new files:
- WikiEditorToolbar.tsx - Toolbar buttons and formatting controls
- WikiEditorDialogs.tsx - Link, embed dialogs
- WikiTableControls.tsx - Table row/column controls
- WikiCodeBlock.tsx - Code block insertion and editing (already partially exists)
- WikiEditorUtils.ts - Helper functions for selection, formatting

Note: This is a larger refactoring effort that should be done carefully to avoid breaking existing behavior.
```

**9. Add unit tests for editor formatting functions**

```text
File: src/test/components/WikiRichEditor.test.tsx

Tests to add:
- Test htmlToText conversion
- Test URL auto-linking regex
- Test sanitizeConfig allows expected tags
- Test table manipulation functions
```

---

## Files to Modify

| File | Action | Priority | Changes |
|------|--------|----------|---------|
| `src/pages/WikiEditPage.tsx` | Modify | Critical | Fix permission check, add autosave |
| `src/components/wiki/WikiRichEditor.tsx` | Modify | Medium | Add word count, undo/redo, tooltips |
| `src/components/wiki/WikiContent.tsx` | Modify | Low | Add empty state for version history |
| `src/test/components/WikiRichEditor.test.tsx` | Create | Low | Add unit tests |

---

## Technical Notes

### Current Permission Flow

The wiki permission system uses server-side RPC functions:
- `can_view_wiki_item(item_type, item_id)` - Checks if user can view
- `can_edit_wiki_item(item_type, item_id)` - Checks if user can edit

These functions check:
1. User role (owner/admin/hr have global access)
2. Item creator (created_by matches current employee)
3. Access scope (company/offices/departments/projects/members)
4. Individual member permissions (wiki_page_members, wiki_folder_members)
5. Folder inheritance for pages

However, WikiEditPage.tsx bypasses this and only checks:
```typescript
const canEdit = isAdmin || isHR;
```

This means:
- Page owners cannot edit their own pages unless they are Admin/HR
- Users added as "edit" members cannot edit
- This is a significant permission bug

### RLS Policies Status

RLS policies correctly use `can_edit_wiki_item` and `can_view_wiki_item` functions:
- wiki_folders: Uses proper can_edit/can_view checks
- wiki_pages: Uses proper can_edit/can_view checks
- Junction tables: Properly scoped to edit/view permissions

The linter flagged some "Always True" RLS policies, but these appear to be on non-wiki tables (based on the truncated output).

### Editor Architecture

The WikiRichEditor uses contentEditable div with manual DOM manipulation:
- Pros: Full control, no external dependencies beyond DOMPurify/Prism
- Cons: Large file, complex state management, browser inconsistencies

The editor properly sanitizes content using DOMPurify with a defined whitelist of tags and attributes.

---

## Expected Outcome

After implementing these fixes:
1. All users with proper permissions can edit pages (not just Admin/HR)
2. Content is protected with autosave during editing
3. Users have better visibility into content metrics (word count)
4. Version history is more useful with proper empty states
5. Code is more maintainable with better test coverage

---

## Security Considerations

- The permission fix must still respect the server-side RLS policies
- Autosave drafts stored in localStorage should not contain sensitive metadata
- The `can_edit_wiki_item` RPC function is SECURITY DEFINER - trust its result
- All content sanitization via DOMPurify should remain in place

