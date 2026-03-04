

## Make Assignment Links Public (per-template, not per-candidate)

### Current State
- Each `assignment_instance` has a unique `secure_token` → generates a per-candidate link (`/assignment/:token`)
- The OTP flow validates the candidate's email matches the one linked to that specific instance
- The `assignment_templates` table has no public token/link concept
- The email notification edge function builds the link from `assignment_instance.secure_token`

### Proposed Changes

**1. DB Migration — Add `public_token` to `assignment_templates`**

Add a `public_token TEXT UNIQUE` column to `assignment_templates`. When a template is created or first needs a public link, generate a stable token (e.g., UUID). This gives every template a single, shareable URL like `/assignment/t/:publicToken`.

**2. New Public Route — `/assignment/t/:templateToken`**

Create a new page `src/pages/AssignmentTemplateSubmission.tsx`:
- Step 1 (Email Gate): Candidate enters email → edge function checks if any `assignment_instance` exists for that email + this template → sends OTP
- Step 2 (OTP Verify): Same OTP flow as today
- Step 3 (Assignment View): Load the candidate's specific `assignment_instance` and render the submission form

The existing `/assignment/:token` route (per-instance) can remain as a fallback for already-sent links.

**3. Update Edge Functions**

- **`send-assignment-otp`**: Add a new mode accepting `template_token` instead of instance `token`. Looks up the template by `public_token`, then finds the `assignment_instance` for the given email + template → sends OTP if found.
- **`verify-assignment-otp`**: Similarly support template-based verification — after OTP passes, return the instance's `secure_token` so the frontend can load the correct assignment.

**4. Update `AssignmentPreviewDialog.tsx`**

- Replace the "per-candidate" info text with the actual public link using the template's `public_token`
- Always show the copy-link footer when viewing/editing a template (generate `public_token` on template creation)

**5. Update `AssignmentTemplateEditor.tsx` / `useCreateAssignmentTemplate`**

- Auto-generate a `public_token` (UUID) when creating a new template
- Pass it through the insert mutation

**6. Show Assignment Card in `ApplicationDetail.tsx` Pipeline Detail**

In the existing Assignments tab (lines 302-346), enhance each assignment card to include:
- A "Preview" button opening `AssignmentPreviewDialog` with the template's form data
- A copy-link button for the template's public URL
- These are shown automatically when an assignment is assigned to the candidate

**7. Update `send-hiring-notification` Edge Function**

When `trigger_type === 'assignment_sent'`, build the `{{assignment_link}}` using the **template's `public_token`** instead of the instance's `secure_token`:
- Look up the assignment instance → get `template_id` → get `assignment_templates.public_token`
- Build link as `${siteUrl}/assignment/t/${publicToken}`

**8. Auto-assign on Stage Move (existing `pipeline_stage_rules`)**

The `auto_assignment_template_id` in `pipeline_stage_rules` already supports auto-assigning. The email triggered on stage move will now include the template's public link automatically via change #7.

### Files to Create/Modify

| File | Action |
|------|--------|
| DB migration | Add `public_token` column to `assignment_templates` |
| `src/pages/AssignmentTemplateSubmission.tsx` | **New** — public page for template-level access |
| `src/App.tsx` | Add route `/assignment/t/:templateToken` |
| `src/components/hiring/AssignmentPreviewDialog.tsx` | Show public link from template `public_token` |
| `src/services/useHiringMutations.ts` | Generate `public_token` on template creation |
| `src/pages/hiring/ApplicationDetail.tsx` | Add preview + copy-link to assignment cards |
| `supabase/functions/send-assignment-otp/index.ts` | Support template-token lookup mode |
| `supabase/functions/verify-assignment-otp/index.ts` | Support template-token verification |
| `supabase/functions/send-hiring-notification/index.ts` | Use template public link in emails |

