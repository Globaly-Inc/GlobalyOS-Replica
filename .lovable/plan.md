

## Move Application Form Inline to Sidebar

### What
Remove the Dialog/popup for "Apply Now" and render the application form directly in the right sidebar card. After submission, replace the form with an "Applied" confirmation showing the date and time. Track applications by IP address using `localStorage` as a fallback to prevent re-applications from the same browser.

### Changes

**`src/pages/careers/JobDetailPublic.tsx`**

1. **Remove Dialog**: Remove the `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` imports and their usage wrapping the form (lines 337-427).

2. **Inline form in sidebar**: Render the application form fields (name, email, phone, LinkedIn, cover letter, consent checkbox, submit button) directly inside the sidebar `CardContent`, below a heading like "Apply for this position".

3. **Track by IP + localStorage**: 
   - On successful submission, store `{ jobId, appliedAt }` in `localStorage` keyed by `applied-{orgCode}-{jobId}`.
   - On page load, check `localStorage` for an existing application record for this job.
   - If found, show the "Applied" state instead of the form.

4. **Applied state in sidebar**: When applied (either just submitted or detected from localStorage), show:
   - A green checkmark icon
   - "Application Submitted" heading
   - "Applied on DD MMM YYYY at HH:MM" timestamp
   - "View More Jobs" link back to careers page
   - Hide the form entirely

5. **Remove full-page success screen**: Remove the `showSuccess` block (lines 167-185) that currently renders a full-page success card, since the success state will now be shown inline in the sidebar.

6. **Update sticky offset**: Change the sidebar card sticky position from `top-4` to `top-[116px]` to account for the 100px header + border.

### No other changes
- Job details, header, footer, metadata all remain unchanged.
- Edge function and form validation logic stay the same.

