

## Add Default AI-Written Email Templates for Each Hiring Trigger

When the Email Templates section is empty, instead of showing a blank state, we'll seed the organization with professionally written default templates for all 8 trigger types with a single click.

### What You'll Get

A **"Generate Default Templates"** button in the empty state that creates 8 ready-to-use email templates:

1. **Application Received** -- Confirms receipt and sets expectations
2. **Application Rejected** -- Professional and empathetic rejection
3. **Interview Scheduled** -- Details with date/time placeholders
4. **Interview Reminder** -- Friendly reminder before the interview
5. **Assignment Sent** -- Instructions for completing the task
6. **Assignment Reminder** -- Nudge before the deadline
7. **Offer Sent** -- Congratulatory offer notification
8. **Offer Accepted** -- Welcome and next-steps confirmation

All templates use dynamic placeholders like `{{candidate_name}}`, `{{job_title}}`, and `{{company_name}}`.

### How It Works

- The empty state will show a prominent "Generate Default Templates" button
- Clicking it inserts all 8 templates in one batch into the database
- Templates are immediately editable after creation
- No AI API call needed -- these are curated, pre-written templates hardcoded in the app for instant results

### Technical Details

**File: `src/pages/hiring/HiringSettings.tsx`**
- Add a constant `DEFAULT_EMAIL_TEMPLATES` array containing all 8 templates with `name`, `trigger_type`, `subject`, `body_template`, and `is_active: true`
- Add a `useSeedDefaultEmailTemplates` mutation (or inline logic) that bulk-inserts all templates via `supabase.from('hiring_email_templates').insert([...])` scoped to the current `organization_id`
- Update the empty state UI to replace "Create your first template" with a "Generate Default Templates" button that triggers the bulk insert
- After success, the query cache is invalidated and all templates appear in the table

**File: `src/services/useHiringMutations.ts`**
- Add a new `useSeedDefaultEmailTemplates()` hook that accepts an array of template objects and bulk-inserts them, keeping the pattern consistent with existing mutations

Each template body will be a professional, multi-paragraph email using the existing `{{placeholder}}` system, ready for immediate use or customization.
