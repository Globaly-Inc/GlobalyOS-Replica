
# Wiki Templates Management System - Comprehensive Audit & Improvement Plan

## Audit Summary

I conducted a thorough review of the Wiki Templates Management System implementation covering:
- Database schema and RLS policies
- Super Admin UI components (TemplateWikiTab, WikiTemplateEditor, AIWikiTemplateTools)
- Edge functions for AI generation
- Organization Wiki integration (WikiTemplatesDialog, useWikiTemplates hook)
- Main Wiki page and page creation flow

---

## Issues Found

### Critical Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **WikiTemplatesDialog not integrated into Wiki UI** | Templates feature is completely unused - dialog exists but is never imported or rendered | `Wiki.tsx`, `WikiFolderView.tsx` |
| **Field name mismatch in useWikiTemplates** | Organization filtering broken - hook looks for `business_category` but organizations use `industry` field | `src/hooks/useWikiTemplates.ts` |
| **No template selection during page creation** | Users can only create blank pages - no way to use templates | `Wiki.tsx` page creation flow |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **HTML content stored unsanitized** | Potential XSS risk when rendering template content with `dangerouslySetInnerHTML` | `WikiTemplatesDialog.tsx` preview |
| **No template content validation** | AI-generated content may contain markdown or malformed HTML | Edge functions |
| **No pagination in template list** | Performance issue if template count grows large | `TemplateWikiTab.tsx` |
| **Missing keyboard navigation** | Accessibility issue in template selection dialog | `WikiTemplatesDialog.tsx` |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No bulk activate/deactivate in Super Admin | Manual work for multiple templates | `TemplateWikiTab.tsx` |
| No template usage analytics | Can't track which templates are popular | Not implemented |
| No template versioning | Can't track changes to templates | Not implemented |
| Built-in templates not displayed when DB is empty in categories | Only shows in "All" tab | `WikiTemplatesDialog.tsx` filtering |

---

## Implementation Plan

### Phase 1: Critical Integration Fixes

**1. Fix organization field name mismatch**

The `useWikiTemplates` hook incorrectly references `business_category` but organizations use `industry`:

```text
File: src/hooks/useWikiTemplates.ts

Changes:
- Line 18-21: Update Organization interface to use `industry` instead of `business_category`
- Line 115: Change queryKey to use `org?.industry`  
- Line 138-139: Change `orgBusinessCategory` to `orgIndustry` using `org?.industry`
- Lines 148-149, 160, 177, 183: Update all references to use correct field name
```

**2. Integrate WikiTemplatesDialog into page creation flow**

Currently, clicking "New Page" creates a blank page directly. We need to show the template dialog first:

```text
File: src/pages/Wiki.tsx

Changes:
- Import WikiTemplatesDialog component
- Add state for template dialog: `templateDialogOpen`
- Modify `onStartCreating("page")` to open template dialog instead of creating directly
- Add handler for template selection that creates page with template content
```

```text
File: src/components/wiki/WikiFolderView.tsx

Changes:
- Import WikiTemplatesDialog component
- Add template dialog state and props
- Modify "New Page" button to trigger template dialog
- Pass selected template content to page creation
```

**3. Create page with template content**

Update the page creation flow to accept initial content:

```text
File: src/pages/Wiki.tsx

Changes to createPageMutation:
- Accept optional `content` parameter
- Pass content to RPC or use update after creation
```

---

### Phase 2: Security & Validation Fixes

**4. Sanitize HTML content before rendering**

Use DOMPurify (already installed) to sanitize template content:

```text
File: src/components/wiki/WikiTemplatesDialog.tsx

Changes:
- Import DOMPurify
- Sanitize content before using in dangerouslySetInnerHTML
- Add sanitization in preview section
```

**5. Add HTML validation to AI generation**

Edge functions should clean up AI-generated content:

```text
Files:
- supabase/functions/generate-wiki-policy-templates/index.ts
- supabase/functions/generate-wiki-sops/index.ts
- supabase/functions/bulk-generate-wiki-content/index.ts

Changes:
- Strip any markdown code fences from AI response
- Validate HTML structure before saving
```

---

### Phase 3: UX Enhancements

**6. Add bulk actions to Super Admin**

```text
File: src/components/super-admin/templates/TemplateWikiTab.tsx

Changes:
- Add checkbox column for row selection
- Add bulk action dropdown (Activate/Deactivate selected)
- Add bulk delete with confirmation
```

**7. Fix built-in templates display in category tabs**

When database is empty, built-in templates should show in their respective category tabs:

```text
File: src/hooks/useWikiTemplates.ts

Changes:
- Include all built-in templates in results, not just blank
- Merge database templates with built-in templates properly
```

**8. Add keyboard navigation to template dialog**

```text
File: src/components/wiki/WikiTemplatesDialog.tsx

Changes:
- Add arrow key navigation between templates
- Add Enter to select current template
- Add Escape to close dialog
```

---

## Files to Modify

| File | Action | Priority | Changes |
|------|--------|----------|---------|
| `src/hooks/useWikiTemplates.ts` | Modify | Critical | Fix `industry` vs `business_category` field name |
| `src/pages/Wiki.tsx` | Modify | Critical | Import & render WikiTemplatesDialog, modify page creation |
| `src/components/wiki/WikiFolderView.tsx` | Modify | Critical | Add template dialog integration |
| `src/components/wiki/WikiTemplatesDialog.tsx` | Modify | Medium | Add DOMPurify sanitization, keyboard nav |
| Edge functions (3 files) | Modify | Medium | Add HTML validation/cleanup |
| `src/components/super-admin/templates/TemplateWikiTab.tsx` | Modify | Low | Add bulk actions |

---

## Priority Order

1. **Field name fix** - Templates won't filter correctly without this
2. **WikiTemplatesDialog integration** - Core feature is unusable without this
3. **Page creation with content** - Enables template content to be used
4. **HTML sanitization** - Security fix
5. **UX improvements** - Quality of life enhancements

---

## Technical Notes

### Template Selection Flow

```text
User clicks "New Page"
        |
        v
WikiTemplatesDialog opens
        |
        v
User selects template
        |
        v
Page created with template title + content
        |
        v
Navigate to WikiEditPage for editing
```

### Organization Field Mapping

The organizations table uses:
- `industry` - maps to template `business_category`
- `country` - maps to template `country_code`

### RLS Policies Status

Current RLS policies are correctly configured:
- Super Admins can view/manage all templates
- All authenticated users can view active templates
- No issues found with current policies

### Edge Functions Status

All three edge functions are deployed and configured in `config.toml`:
- `generate-wiki-policy-templates` - Working
- `generate-wiki-sops` - Working  
- `bulk-generate-wiki-content` - Working

All include proper:
- Super Admin verification
- Duplicate detection (returns 409 if exists)
- Extended CORS headers
- Lovable AI integration

---

## Expected Outcome

After implementing these fixes:
1. Organizations can browse and use Super Admin templates when creating wiki pages
2. Templates are correctly filtered by organization's industry and country
3. Template content is securely rendered without XSS risk
4. Super Admins have better bulk management tools
5. The feature works end-to-end as designed
