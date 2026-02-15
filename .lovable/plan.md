

## Internal Apply and Share Referral for Open Positions

This plan adds two new features to the **InternalVacanciesCard** (and the internal vacancy detail page): an **Apply** button for team members to apply internally, and a **Share** button for referring external candidates.

---

### Feature 1: Internal Apply Button

When a team member clicks "Apply" on an open position:

1. A **Dialog** opens with a simple application form
2. The form is **pre-filled** with the team member's name, email, and phone from their employee profile
3. These fields are **read-only** (greyed out) since they come from the system
4. The team member can **upload a resume** (PDF, DOC, DOCX -- reusing the same file upload pattern from the public careers page)
5. On submit, the application is created via the existing `submit-public-application` edge function with:
   - `source_of_application` set to `"internal"`
   - `is_internal` flag set to `true`
   - The candidate linked to the employee via the `employee_id` field
6. A success confirmation is shown after submission

### Feature 2: Share / Refer Button

When a team member clicks "Share":

1. A **Dialog** opens with two sections:
   - **Copy Sharing Content**: AI-generated sharing text (a short blurb about the position with the public link) that the team member can copy to clipboard with one click
   - **Email a Referral**: An optional section where the team member enters a prospective candidate's email address and sends a referral invitation email
2. The AI sharing content is generated client-side using a simple template (position title, company name, key details, and public link) -- no AI API call needed for this straightforward template
3. The referral email is sent via a new edge function `send-referral-email` that:
   - Sends a branded email to the prospective candidate
   - Mentions the referring team member's name
   - Includes the public job link
   - Logs the referral activity

---

### Database Changes

Add a `referred_by_employee_id` column to the `candidates` table to track which team member referred a candidate:

```sql
ALTER TABLE public.candidates
  ADD COLUMN referred_by_employee_id UUID REFERENCES public.employees(id);
```

---

### New Components

1. **`src/components/hiring/InternalApplyDialog.tsx`**
   - Dialog with pre-filled employee info (name, email, phone -- read-only)
   - Resume file upload (reusing existing upload patterns to `hiring-documents` bucket)
   - Submit button that calls the `submit-public-application` edge function with `source_of_application: 'internal'`

2. **`src/components/hiring/ShareVacancyDialog.tsx`**
   - Tab 1: "Copy Link" -- shows a pre-written sharing message with the public job URL and a "Copy" button
   - Tab 2: "Email Referral" -- email input field and send button
   - Uses the existing org/job data to compose the message

### New Edge Function

3. **`supabase/functions/send-referral-email/index.ts`**
   - Accepts: `organization_id`, `job_id`, `referrer_employee_id`, `candidate_email`
   - Validates the job is open and public
   - Sends a branded email via Resend (reusing existing pattern from `send-hiring-notification`)
   - Logs activity in `hiring_activity_logs`
   - Optionally creates a candidate record with `source: 'referral'` and `referred_by_employee_id`

### Modified Components

4. **`src/components/home/InternalVacanciesCard.tsx`**
   - Add small "Apply" and "Share" icon buttons on each vacancy row
   - Buttons are inline, appear on the right side of each row
   - Clicking opens the respective dialogs

5. **`src/pages/hiring/JobDetail.tsx`**
   - Add "Apply" and "Share" buttons in the header action bar (next to Edit, Pause, etc.)
   - Only visible when job status is `open`

6. **`supabase/functions/submit-public-application/index.ts`**
   - Add support for `referred_by_employee_id` field in the form data
   - When present, set `source: 'referral'` and store the referrer

### Hooks

7. **`src/hooks/useEmployeeProfile.ts`** (or reuse `useCurrentEmployee`)
   - Already exists -- will use `useCurrentEmployee` to get name, email, phone for pre-filling

---

### UX Flow Summary

**Apply Flow:**
- Team member sees open position in sidebar card or detail page
- Clicks "Apply" button
- Dialog shows with their info pre-filled (read-only)
- Uploads resume, clicks "Submit Application"
- Toast: "Application submitted!" and dialog closes

**Share Flow:**
- Team member clicks "Share" button
- Dialog opens with two sections
- Section 1: Pre-written message with public link and "Copy to Clipboard" button
- Section 2: Email input + "Send Referral" button
- On send, the candidate receives a branded email with the job link and referrer's name
- Toast: "Referral sent!" and the referral is tracked

