
# Wiki Templates Management System - Audit Report & Improvement Plan

## Summary of Audit

I conducted a thorough review of the recently implemented Wiki Templates Management System covering:
- Database schema and RLS policies
- Super Admin UI components (TemplateWikiTab, WikiTemplateEditor, AIWikiTemplateTools)
- Edge functions for AI generation (generate-wiki-policy-templates, generate-wiki-sops, bulk-generate-wiki-content)
- Integration with the organization Wiki module (WikiTemplatesDialog)

---

## Issues Found

### Critical Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **Edge functions missing from config.toml** | AI generation won't work - functions not deployed | `supabase/config.toml` |
| **WikiTemplatesDialog not integrated with database** | Organizations can't see Super Admin templates - still using hardcoded templates | `WikiTemplatesDialog.tsx` |
| **Missing useWikiTemplates hook** | No frontend hook to fetch templates for organizations | Not created |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| **Super Admin RLS policy uses WITH CHECK without USING** | Super Admins can't view inactive templates they created | RLS policies |
| **No content preview in editor** | Hard to see how HTML content will render | `WikiTemplateEditor.tsx` |
| **Plain textarea for HTML content** | Poor editing experience for rich content | `WikiTemplateEditor.tsx` |
| **No duplicate template check** | AI can generate duplicate policies | Edge functions |
| **Missing loading states** | No skeleton loading for template list | `TemplateWikiTab.tsx` |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No search functionality in template list | Hard to find specific templates | `TemplateWikiTab.tsx` |
| No bulk actions (activate/deactivate) | Manual work for multiple templates | `TemplateWikiTab.tsx` |
| No template preview for organizations | Users can't preview before using | `WikiTemplatesDialog.tsx` |
| No template usage analytics | Can't track popular templates | Not implemented |

---

## Implementation Plan

### Phase 1: Critical Fixes (Must Do)

**1. Add edge functions to config.toml**

```toml
[functions.generate-wiki-policy-templates]
verify_jwt = false

[functions.generate-wiki-sops]
verify_jwt = false

[functions.bulk-generate-wiki-content]
verify_jwt = false
```

**2. Create useWikiTemplates hook for organizations**

New file: `src/hooks/useWikiTemplates.ts`
- Fetch active templates from `template_wiki_documents`
- Filter by organization's business category and country
- Merge with local built-in templates (as fallback)
- Cache with React Query

**3. Update WikiTemplatesDialog to use database templates**

Changes to `src/components/wiki/WikiTemplatesDialog.tsx`:
- Import and use the new `useWikiTemplates` hook
- Display database templates organized by category
- Keep hardcoded templates as fallback if no database templates
- Add category tabs/filters for better organization
- Show template description and tags

### Phase 2: RLS & Security Fixes

**4. Fix Super Admin SELECT policy**

The current policy only allows selecting active templates. Super Admins need to see all templates including inactive ones:

```sql
CREATE POLICY "Super admins can view all wiki templates" 
ON public.template_wiki_documents 
FOR SELECT 
USING (public.is_super_admin() OR is_active = true);
```

### Phase 3: UX Improvements

**5. Improve WikiTemplateEditor**

- Add content preview toggle (side-by-side view)
- Consider using existing WikiRichEditor for content editing
- Add validation feedback

**6. Add duplicate detection to AI generation**

Before inserting, check if a template with the same name/type already exists:
- Skip if exists and show in results as "Already exists"
- Or ask user whether to overwrite

**7. Add search and bulk actions to TemplateWikiTab**

- Search input that filters templates by name, category, tags
- Bulk select with checkbox column
- Bulk actions: Activate/Deactivate selected

---

## Files to Modify/Create

| File | Action | Changes |
|------|--------|---------|
| `supabase/config.toml` | Modify | Add 3 edge function configs |
| `src/hooks/useWikiTemplates.ts` | Create | Hook to fetch templates for orgs |
| `src/components/wiki/WikiTemplatesDialog.tsx` | Modify | Use database templates |
| Database migration | Create | Fix Super Admin SELECT policy |
| `supabase/functions/generate-wiki-policy-templates/index.ts` | Modify | Add duplicate check |
| `supabase/functions/generate-wiki-sops/index.ts` | Modify | Add duplicate check |
| `src/components/super-admin/templates/WikiTemplateEditor.tsx` | Modify | Add preview toggle |
| `src/components/super-admin/templates/TemplateWikiTab.tsx` | Modify | Add search |

---

## Priority Order

1. **config.toml fixes** - Without this, AI generation is broken
2. **useWikiTemplates hook** - Core functionality for org integration
3. **WikiTemplatesDialog update** - Makes templates available to users
4. **RLS policy fix** - Super Admin experience
5. **Duplicate detection** - Prevents data issues
6. **UX improvements** - Quality of life

---

## Technical Notes

### CORS Headers
The edge functions use standard CORS headers which should work. Consider adding the extended headers:
```typescript
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

### Template Filtering Logic for Organizations
Templates should be filtered for organizations using this priority:
1. Exact match: business_category AND country_code match org settings
2. Industry match: business_category matches, country_code is null (global)
3. Country match: business_category is null (universal), country_code matches
4. Universal: both null (applies to all)

### Performance Considerations
- Add index on `(business_category, country_code, is_active)` for efficient filtering
- Consider pagination if template count grows large
