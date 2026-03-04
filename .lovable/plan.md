

## Change Assignment Public Link to Match Careers Page URL Pattern

### Current State
- Career pages: `/careers/:orgSlug` and `/careers/:orgSlug/:jobSlug`
- Assignment links: `/assignment/t/:publicToken` (UUID-based, e.g. `/assignment/t/e0451c61-ef2c-48dc-831f-713c7900c168`)

### Target
Assignment links should follow the same pattern as careers: `/careers/:orgSlug/assignment/:assignmentSlug`

Example: `https://globalyos.com/careers/acme-corp/assignment/frontend-coding-challenge`

### Changes Required

**1. DB Migration — Add `slug` to `assignment_templates`**
- Add `slug TEXT` column to `assignment_templates`
- Backfill existing templates by generating slugs from their `name` column
- Add a unique constraint on `(organization_id, slug)` so slugs are unique per org

**2. Update Route in `src/App.tsx`**
- Add new route: `/careers/:orgCode/assignment/:assignmentSlug`
- Keep legacy `/assignment/t/:templateToken` route as fallback (redirects to new URL or still works)

**3. Update `AssignmentTemplateSubmission.tsx`**
- Accept `orgCode` and `assignmentSlug` params instead of (or in addition to) `templateToken`
- Edge function calls will pass `org_slug` + `assignment_slug` instead of `template_token`

**4. Update Edge Functions**
- **`send-assignment-otp`**: Add a third mode accepting `{ org_slug, assignment_slug, email }` — look up org by slug, then template by org + slug
- **`verify-assignment-otp`**: Same — support `{ org_slug, assignment_slug, email, code }`

**5. Update `send-hiring-notification` Edge Function**
- Build `{{assignment_link}}` as `/careers/:orgSlug/assignment/:templateSlug` instead of `/assignment/t/:publicToken`

**6. Update `AssignmentPreviewDialog.tsx`**
- Change `publicLink` construction from `origin/assignment/t/${publicToken}` to `https://globalyos.com/careers/${orgSlug}/assignment/${templateSlug}`

**7. Update `ApplicationDetail.tsx`**
- Update the copy-link button to use the new URL pattern

**8. Auto-generate slug on template creation/update**
- In `AssignmentTemplateEditor.tsx` / `useHiringMutations.ts`, generate a URL-safe slug from the template name on create/save
- Handle duplicates by appending a numeric suffix

### Files to Modify

| File | Change |
|------|--------|
| DB migration | Add `slug` column, backfill, unique constraint |
| `src/App.tsx` | Add `/careers/:orgCode/assignment/:assignmentSlug` route |
| `src/pages/AssignmentTemplateSubmission.tsx` | Support new URL params |
| `src/components/hiring/AssignmentPreviewDialog.tsx` | Build new-style link |
| `src/pages/hiring/ApplicationDetail.tsx` | Update copy-link URL |
| `src/pages/hiring/AssignmentTemplateEditor.tsx` | Generate slug on save |
| `supabase/functions/send-assignment-otp/index.ts` | Support slug-based lookup |
| `supabase/functions/verify-assignment-otp/index.ts` | Support slug-based lookup |
| `supabase/functions/send-hiring-notification/index.ts` | Use new URL format |

