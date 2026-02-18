
## Assignment Page OTP Gate — Candidate Email Verification

### What's Being Built

The public assignment page (`/assignment/:token`) currently lets anyone who has the URL open and submit the assignment with no identity check. We need to add a **one-time password (OTP) email gate**: when a candidate visits the link, they must enter their email, receive a 6-digit OTP, and verify it before seeing the assignment. Anyone who isn't the assigned candidate sees a clear rejection message.

Separately, the **email template** for the "Assignment Sent" pipeline stage (or `assignment_sent` trigger) will be updated to include the direct assignment link and OTP access instructions as template variables.

---

### Architecture

```text
Candidate receives email:
  └── "Complete your assessment" + link + instructions
        └── Visits /assignment/:token
              └── Step 1: Email gate
                    ├── Enter email
                    ├── POST /send-assignment-otp (new edge function)
                    │     ├── Look up assignment_instances by secure_token
                    │     ├── Get candidate email from joined candidate_applications → candidates
                    │     ├── If email MATCHES → generate 6-digit OTP, store in otp_codes, send email
                    │     └── If NOT matched → return 403 "not assigned to you"
                    └── Step 2: OTP entry
                          └── POST /verify-assignment-otp (new edge function)
                                ├── Verify code from otp_codes (reuse same table, scoped by email)
                                └── Return { verified: true, candidateEmail } → show assignment
```

---

### What Changes

#### 1. New Edge Function: `send-assignment-otp`

Accepts: `{ token: string, email: string }`

Logic:
- Fetch `assignment_instances` by `secure_token = token` (with joined candidate email)
- Normalise both emails to lowercase and compare
- If **no match**: return `{ error: 'This assignment has not been assigned to you.', notAssigned: true }` (HTTP 403)
- If **match**: generate a 6-digit OTP, insert into `otp_codes` table (exactly as `send-otp` does), send email via Resend with a simple "Your assignment verification code: XXXXXX" template
- Rate-limit: same as existing `send-otp` (3 per email per hour)

#### 2. New Edge Function: `verify-assignment-otp`

Accepts: `{ token: string, email: string, code: string }`

Logic:
- Re-verify the assignment belongs to this email (double-check)
- Look up `otp_codes` by `email + verified=false`, check expiry and code match
- On success: mark OTP as `verified = true`, return `{ verified: true }`
- On failure: increment `failed_attempts`, return error

These two functions are **separate from the login OTP** functions — they don't create sessions or affect auth. They are purely an identity gate for the public assignment page.

#### 3. `AssignmentSubmission.tsx` — Add OTP Gate UI

Replace the current "show assignment immediately" behaviour with a **3-state flow**:

```
State 1 — EMAIL_ENTRY (default)
  ┌──────────────────────────────────────────────────────┐
  │  🔒  Verify your identity                            │
  │  Enter the email address this assignment was         │
  │  sent to.                                            │
  │                                                      │
  │  [Email address ____________________]                │
  │  [Send Verification Code]                            │
  └──────────────────────────────────────────────────────┘

State 2 — OTP_ENTRY (after sending OTP)
  ┌──────────────────────────────────────────────────────┐
  │  📧  Check your email                                │
  │  We sent a 6-digit code to j***@example.com          │
  │                                                      │
  │  [_ _ _ _ _ _]  (OTP input)                         │
  │  [Verify Code]          [← Back]                     │
  │  Didn't get it? [Resend]                             │
  └──────────────────────────────────────────────────────┘

State 3 — VERIFIED (show assignment)
  → Normal assignment page content renders
```

**Error case** (wrong email): Show inline error message — "This assignment has not been assigned to you. Please check your email and try again."

The `token` from `useParams` is still used to load the assignment data, but only **after** OTP is verified. The query for `useAssignmentByToken` is gated: `enabled: verified`.

#### 4. Update `send-hiring-notification` Template Variable

Add `{{assignment_link}}` and `{{assignment_instructions}}` to the variable replacement map in `send-hiring-notification/index.ts`:

```
{{assignment_link}}         → https://globalyos.lovable.app/assignment/{secure_token}
{{assignment_instructions}} → "Visit the link and enter your email to receive a verification code, then enter it to access your assignment."
```

These will be fetched when `assignment_id` is present in the notification payload. The `assignment_sent` stage email template body already exists and can be updated by users in the Email Automation settings to include these variables.

Also update the default AI-generated "Assignment" stage template body (in `generate-stage-email-templates`) to include these variables automatically.

---

### Files to Change

| File | Change |
|---|---|
| `supabase/functions/send-assignment-otp/index.ts` | **New** — validates email vs assignment, sends OTP |
| `supabase/functions/verify-assignment-otp/index.ts` | **New** — verifies OTP code for assignment access |
| `supabase/functions/send-hiring-notification/index.ts` | Add `{{assignment_link}}` + `{{assignment_instructions}}` variable substitution when `assignment_id` is present |
| `src/pages/AssignmentSubmission.tsx` | Add 3-state OTP gate UI before showing assignment |
| `supabase/config.toml` | Register 2 new edge functions with `verify_jwt = false` |

No database migration needed — the existing `otp_codes` table is reused as-is.

---

### Security Considerations

- The OTP check is **server-side** (edge function compares emails) — the client cannot bypass it by passing a different email
- The `secure_token` in the URL is long and random (already generated with `generateSecureToken()`), so guessing URLs is infeasible
- Rate limiting is applied per email (3 OTP requests/hour) to prevent abuse
- OTPs expire in 10 minutes and are deleted after successful verification
- The assignment data query (`useAssignmentByToken`) only runs **after** OTP is verified client-side — but even if called without verification, the existing RLS on `assignment_instances` protects the DB

---

### Email Template Variable Example

After the change, users can put this in their Assignment stage email template body:

```
Hi {{candidate_name}},

Please complete the assessment for the {{job_title}} position:

👉 {{assignment_link}}

To access the page:
1. Click the link above
2. Enter your email: {{candidate_email}}
3. Enter the verification code sent to your inbox
4. Complete and submit the assignment before {{deadline}}

{{assignment_instructions}}
```
