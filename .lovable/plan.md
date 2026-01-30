

# Wiki Page, Rich Text Editor & Sharing - Audit Report & Improvement Plan

## Audit Summary

I conducted a thorough review of the Wiki implementation covering:
- **WikiRichEditor.tsx** (2,594 lines) - WYSIWYG editor with toolbar, tables, code blocks, embeds
- **WikiEditPage.tsx** - Full-screen editing with draft autosave and permissions
- **WikiContent.tsx** - Page view with version history, table of contents, export
- **WikiShareDialog.tsx** (1,041 lines) - Comprehensive sharing with offices, departments, projects, members
- **useWikiPermissions.tsx** - Fine-grained permission checks via `can_edit_wiki_item` RPC
- **useWiki.ts** - Domain service hooks for CRUD operations

---

## Issues Found

### Critical Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **No unit tests for WikiRichEditor** | No test coverage for critical formatting functions | Missing test file |
| **WikiRichEditor file is very large (2,594 lines)** | Maintainability concern - difficult to extend and debug | `WikiRichEditor.tsx` |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **Missing keyboard accessibility in share dialog** | Accessibility gap - no arrow key navigation | `WikiShareDialog.tsx` |
| **No loading skeleton in WikiShareDialog** | No visual feedback during data loading | `WikiShareDialog.tsx` |
| **Duplicate Prism language imports** | Both WikiRichEditor and WikiMarkdownRenderer import Prism languages separately | Multiple files |
| **Public link toggle has no loading state indicator** | User may not know if action is processing | `WikiShareDialog.tsx` |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No confirmation when removing group access | User may accidentally remove access | `WikiShareDialog.tsx` |
| Copy link shows both checkmark and toast | Redundant feedback | `WikiShareDialog.tsx` |
| Missing tooltip on some toolbar buttons | Discoverability issue | `WikiRichEditor.tsx` |

---

## What's Working Well

1. **Permissions System**: The `can_edit_wiki_item` RPC function properly checks creator, role, access scope, and individual member permissions
2. **Draft Autosave**: WikiEditPage correctly saves drafts to localStorage with 2-second debounce and recovers them on reload
3. **Content Metrics**: Status bar shows word count, character count, and reading time
4. **Version History**: Properly shows empty state when no versions exist
5. **Undo/Redo**: Toolbar includes visual undo/redo buttons
6. **Rich Editor Features**: Tables, code blocks with syntax highlighting, embeds, images, links all work correctly
7. **Sharing**: Comprehensive sharing with offices, departments, projects, and individual members with notifications

---

## Implementation Plan

### Phase 1: Add Unit Tests for WikiRichEditor

Create test file: `src/test/components/WikiRichEditor.test.tsx`

Tests to cover:
- HTML sanitization via DOMPurify config
- URL auto-linking regex patterns
- Table manipulation functions (add/remove rows/columns)
- Content metrics calculation (word count, char count)
- Heading detection and font size detection

### Phase 2: Extract Shared Prism Configuration

Create utility file: `src/lib/prismConfig.ts`

- Extract shared Prism language imports
- Export LANGUAGE_MAP constant
- Import in both WikiRichEditor and WikiMarkdownRenderer

### Phase 3: Improve Accessibility

In `WikiShareDialog.tsx`:
- Add keyboard navigation (arrow keys to move between members)
- Add Escape key handler to close dialog
- Add focus management when dialog opens

### Phase 4: Add Confirmation for Destructive Actions

In `WikiShareDialog.tsx`:
- Add confirmation dialog when removing company-wide access
- Add confirmation when removing office/department/project access

---

## Files to Modify/Create

| File | Action | Priority | Changes |
|------|--------|----------|---------|
| `src/test/components/WikiRichEditor.test.tsx` | Create | High | Add unit tests for editor functions |
| `src/lib/prismConfig.ts` | Create | Medium | Extract shared Prism configuration |
| `src/components/wiki/WikiRichEditor.tsx` | Modify | Medium | Import from prismConfig.ts |
| `src/components/wiki/WikiMarkdownRenderer.tsx` | Modify | Medium | Import from prismConfig.ts |
| `src/components/wiki/WikiShareDialog.tsx` | Modify | Low | Add confirmation dialogs, keyboard nav |

---

## Technical Notes

### Current Permission Flow (Working Correctly)

```text
User tries to edit page
        |
        v
WikiEditPage checks: isAdmin || isHR || isOwner
        |
        v
Also calls can_edit_wiki_item RPC
        |
        v
RPC checks: creator, role, access_scope, member permissions
        |
        v
Combined result determines edit access
```

### RLS Policies (Verified Working)

- wiki_folders: Uses can_edit_wiki_item for UPDATE/DELETE
- wiki_pages: Uses can_edit_wiki_item for UPDATE/DELETE
- Junction tables: Properly scoped to folder/page edit permissions

### Key Observations from Testing

1. All network requests returned 200 status codes
2. No console errors related to Wiki functionality
3. Share dialog properly loads offices, departments, projects, and employees
4. Draft autosave and recovery working correctly
5. Version history displays correctly with empty state

---

## Expected Outcome

After implementing these improvements:
1. Critical editor functionality is covered by unit tests
2. Code is more maintainable with extracted shared utilities
3. Better accessibility for keyboard-only users
4. Safer UX with confirmation dialogs for destructive actions
5. Reduced code duplication across files

