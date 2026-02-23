

# Hiring Management Bugs - Comprehensive Fix Plan

## Summary of Bugs

Six bugs were identified in the hiring management system, spanning email notifications, UI issues, and data handling problems.

---

## Bug 1: Public Career Page Apply Button Not Clickable

**Root Cause:** On the CareersPage, each job card is wrapped in a `<Link>` component, but there's a `<Button variant="ghost">` with an arrow icon inside the link. This nested interactive element (button inside a link) may be intercepting clicks and preventing navigation on some browsers/devices. Additionally, the entire card area needs to be clearly clickable.

**Fix:**
- Replace the ghost `<Button>` inside the `<Link>` with a plain `<div>` or `<span>` to avoid nested interactive elements
- Ensure the `<Link>` wrapper properly covers the entire card area

---

## Bug 2: Assignment Email Missing Task Link and Using Email as Name

**Root Cause:** In `send-hiring-notification/index.ts`, the replacement map (line 144-153) includes `{{assignment_link}}` and `{{candidate_name}}`, but there are two issues:
1. The candidate `name` field is sometimes populated with the email prefix instead of the actual name (data issue from candidate creation or existing candidate reuse in Bug 6)
2. The `{{assignment_link}}` replacement works IF the `assignment_id` is passed. Need to verify the `triggerHiringEmail` call in `useHiringMutations.ts` (line 510-514) actually sends the `assignment_id`.

**Fix:**
- In `useHiringMutations.ts`, verify the `useAssignAssignment` mutation passes `assignmentId` to `triggerHiringEmail` - currently it does pass it (line 513), so the issue may be that the email template body doesn't use `{{assignment_link}}` properly
- Ensure the candidate greeting uses `{{candidate_name}}` and falls back properly. The edge function already does `candidate.name || "Candidate"` - the real issue is Bug 6 (name not being saved properly on existing candidates)

---

## Bug 3: Interview Email Shows Placeholders Instead of Actual Details

**Root Cause:** In `send-hiring-notification/index.ts`, the replacement map (lines 144-153) does NOT include `{{interview_date}}`, `{{interview_time}}`, `{{interview_type}}`, or `{{meeting_link}}`. The function fetches assignment details when `assignment_id` is provided, but it does NOT fetch interview details when `interview_id` is provided - there's no interview data lookup at all.

**Fix:**
- Add interview data lookup in `send-hiring-notification/index.ts`: when `body.interview_id` is provided, query `hiring_interviews` to get `scheduled_at`, `interview_type`, `duration_minutes`, `meeting_link`, and `location`
- Add interview-related replacements to the replacements map: `{{interview_date}}`, `{{interview_time}}`, `{{interview_type}}`, `{{interview_location}}`, `{{meeting_link}}`, `{{interview_duration}}`

---

## Bug 4: Interviewer Not Receiving Notification

**Root Cause:** In `useHiringMutations.ts`, the `useScheduleInterview` mutation (lines 644-694) only triggers a candidate-facing email via `triggerHiringEmail`. There is no logic to notify the selected interviewers (neither in-app notification nor email).

**Fix:**
- After interview creation, send in-app notifications to each selected interviewer using the existing notification system
- Optionally trigger an email notification to interviewers with interview details (date, time, candidate name, meeting link)

---

## Bug 5: Only 7 Currencies in Offer Currency Dropdown

**Root Cause:** In `CreateOfferDialog.tsx` (line 37), currencies are hardcoded as `['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY']` - only 7 options with no search functionality.

**Fix:**
- Expand the currency list to include all commonly used ISO 4217 currencies (or at minimum add NPR, CHF, SGD, AED, SAR, NZD, SEK, NOK, DKK, etc.)
- Replace the basic `<Select>` with a searchable combobox component so users can filter/search currencies

---

## Bug 6: Send Offer Edge Function Returns Non-2xx Error

**Root Cause:** The `send-offer-email` edge function exists but may fail due to:
1. The `hiring_offers` table query joins through `candidate_applications` -> `candidates` with specific column selections that may not match the actual schema
2. The `employee.role` check uses `["owner", "admin", "hr"]` but the actual role values in the system may differ
3. The RESEND_API_KEY may not be configured properly

**Fix:**
- Check edge function logs for the specific error
- Verify the `hiring_offers` join query works with the actual schema
- Ensure error messages are properly propagated to the client

---

## Bug 7: External Candidate Profile Details Not Displayed

**Root Cause:** In `submit-public-application/index.ts` (lines 233-244), when an existing candidate is found by email, only the `employee_id` is conditionally updated. The candidate's `name`, `phone`, `location`, and other profile fields are NOT updated. So if the candidate record already exists (e.g., from a referral or previous partial entry), the new application's form data (full name, phone, location) is discarded.

**Fix:**
- When an existing candidate is found, update their profile fields (name, phone, location, linkedin_url, portfolio_url) with the new application's data if the existing values are null/empty
- This ensures the latest submitted data is reflected in the candidate profile

---

## Technical Implementation Details

### File Changes Required

1. **`src/pages/careers/CareersPage.tsx`**
   - Replace the `<Button variant="ghost">` inside job card links with a non-interactive element

2. **`supabase/functions/send-hiring-notification/index.ts`**
   - Add interview data lookup when `interview_id` is provided
   - Add interview placeholder replacements: `{{interview_date}}`, `{{interview_time}}`, `{{interview_type}}`, `{{meeting_link}}`, `{{interview_location}}`, `{{interview_duration}}`

3. **`src/services/useHiringMutations.ts`**
   - In `useScheduleInterview`, add logic to create in-app notifications for selected interviewers
   - Optionally send interviewer notification emails

4. **`src/components/hiring/offers/CreateOfferDialog.tsx`**
   - Expand the `CURRENCIES` array to include 20+ common currencies
   - Replace the `<Select>` for currency with a searchable combobox (using the existing `cmdk`-based Command component)

5. **`supabase/functions/send-offer-email/index.ts`**
   - Debug and fix the error (likely schema mismatch or auth issue)
   - Add better error logging

6. **`supabase/functions/submit-public-application/index.ts`**
   - When existing candidate found, update their name/phone/location if the existing values are empty

### Deployment Steps

1. Update the two edge functions (`send-hiring-notification`, `submit-public-application`, `send-offer-email`) and deploy
2. Update the frontend components (CareersPage, CreateOfferDialog, useHiringMutations)
3. Test end-to-end: apply flow, assignment email, interview email, offer creation and sending

