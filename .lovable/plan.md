
# Client Portal -- Bug Fixes, Security Hardening, and Missing Flows

## Summary
After a full audit of the Client Portal code (edge functions, frontend pages, hooks, and admin UI), I identified **security vulnerabilities**, **bugs**, and **missing user flows** that need to be addressed before this is production-ready.

---

## 1. Security Vulnerabilities (Critical)

### 1a. OTP exposed in email subject line
**File:** `supabase/functions/portal-send-otp/index.ts` (line 189)
**Issue:** The OTP code is included in the email subject: `Your portal verification code: 123456`. Email subjects are visible in notifications, lock screens, and email previews, leaking the OTP.
**Fix:** Change subject to `Your ${brandingName} portal verification code` (no code in subject). The code is already in the email body.

### 1b. portal-admin lacks role-based access control
**File:** `supabase/functions/portal-admin/index.ts` (lines 44-50)
**Issue:** Only checks `organization_members` membership -- any org member (including basic members) can invite clients, suspend users, create cases, and manage the portal. Should require `admin` or `hr` role.
**Fix:** After checking membership, also verify `role` is `admin`, `hr`, or `owner` before allowing admin operations.

### 1c. portal-admin: missing org scoping on mutations
**File:** `supabase/functions/portal-admin/index.ts`
**Issue:** Several actions update records by `id` only without enforcing `organization_id`:
- `update-case-status` (line 167): updates case by `id` without org check
- `review-document` (line 253): updates document without org check  
- `create-task` (line 217): inserts task without verifying case belongs to org
- `send-message` (line 190): inserts message without verifying thread org
**Fix:** Add `.eq('organization_id', organizationId)` to all queries or verify via case ownership before mutations.

### 1d. portal-api: update-profile lacks input validation
**File:** `supabase/functions/portal-api/index.ts` (lines 259-269)
**Issue:** `full_name` and `phone` values are passed directly to the database without validation -- could contain XSS payloads or excessively long strings.
**Fix:** Add length limits (full_name: 200 chars, phone: 30 chars) and basic sanitization (trim whitespace, strip HTML).

### 1e. portal-api: send-message lacks input validation
**File:** `supabase/functions/portal-api/index.ts` (lines 176-208)
**Issue:** Client can send arbitrarily long messages with no length limit.
**Fix:** Add max message length (e.g., 5000 chars).

---

## 2. Bugs

### 2a. PortalLoginPage: Resend OTP button doesn't pass FormEvent
**File:** `src/pages/portal/PortalLoginPage.tsx` (line 194)
**Issue:** The "Resend Code" button calls `handleSendOTP` directly via `onClick`, but `handleSendOTP` expects a `React.FormEvent` and calls `e.preventDefault()`. While this works since `preventDefault` exists on MouseEvent too, it should be cleaned up.
**Fix:** Make `handleSendOTP` accept optional event, or create a separate `resendOtp` function.

### 2b. PortalLoginPage: Missing resend cooldown timer
**Issue:** Client can spam the "Resend Code" button rapidly. While the server has rate limiting, there should be a UI cooldown (e.g., 60 seconds).
**Fix:** Add a countdown timer after sending OTP that disables the resend button.

### 2c. PortalDashboardPage: portalFetch in useEffect deps causes infinite loop risk
**File:** `src/pages/portal/PortalDashboardPage.tsx` (line 34)
**Issue:** `portalFetch` is listed as a dependency of `useEffect`, but it's created via `useCallback` with `token` dep. If token changes, it triggers re-fetch, which is correct. But since `portalFetch` is a new reference on every token change, this is fine. No actual bug, but the pattern could be fragile.
**Fix:** Wrap in a stable ref or remove from deps and use a ref for the fetch function.

### 2d. PortalCasePage: handleVerifyOTP called in useEffect without cleanup
**File:** `src/pages/portal/PortalLoginPage.tsx` (lines 94-96)
**Issue:** `useEffect` auto-submits when OTP reaches 6 digits, but `handleVerifyOTP` is not wrapped in the deps and could run with stale closure values. Also, no debounce prevents double-submission.
**Fix:** Add proper deps and a `submitting` guard.

---

## 3. Missing User Flows

### 3a. No document upload functionality for clients
**File:** `src/pages/portal/PortalCasePage.tsx` (Documents tab)
**Issue:** The documents tab shows documents and download buttons but has no upload capability. Clients need to upload documents (passport, forms, etc.) to fulfill requests.
**Fix:** Add an upload button and file input to the documents tab. The backend `portal-api` needs a `upload-document` action that generates a signed upload URL.

### 3b. No staff messaging UI for case management
**Issue:** Admin can create cases and clients via `SettingsClientPortal`, but there's no internal staff view to:
- View/manage individual cases with timeline
- Send messages to clients within threads
- Use AI "Suggest Reply" / "Summarize Thread" buttons
- Review/approve documents
- Create tasks for clients
**Fix:** Add a case management page accessible from the client list (e.g., clicking a client row expands their cases, clicking a case opens a detail view with messaging, documents, tasks, and AI tools).

### 3c. No case list or case detail view in admin
**Issue:** The admin UI only shows clients. There's no way to see all cases, filter by status, or navigate to a case's internal management view.
**Fix:** Add a "Cases" tab to the SettingsClientPortal page showing all cases with filters (status, client, priority), and a case detail dialog/page for staff.

### 3d. Missing portal index redirect
**Issue:** If a user navigates to `/org/:orgCode/portal/` (no sub-path), there's no redirect to dashboard.
**Fix:** Add an `<Route index element={<Navigate to="dashboard" replace />} />` inside the portal route group.

---

## 4. Implementation Sequence

### Step 1: Security fixes (edge functions)
- Remove OTP from email subject
- Add role check to portal-admin
- Add org scoping to all portal-admin mutations
- Add input validation to portal-api (message length, profile fields)

### Step 2: Bug fixes (frontend)
- Fix resend OTP handler + add cooldown timer
- Add portal index redirect
- Guard against double OTP submission

### Step 3: Missing flows
- Add document upload to portal case page + backend action
- Add portal index redirect
- Add staff case management view with messaging and AI tools (as a new tab in SettingsClientPortal or a separate route)

---

## Technical Details

### Edge Function Changes
- **portal-send-otp**: 1 line change (subject line)
- **portal-admin**: ~20 lines added (role check + org scoping on 5 actions)
- **portal-api**: ~15 lines added (input validation + upload-document action)

### Frontend Changes
- **PortalLoginPage.tsx**: Add resend cooldown, fix handler type
- **PortalCasePage.tsx**: Add document upload UI + file input
- **App.tsx**: Add portal index redirect
- **SettingsClientPortal.tsx**: Add "Cases" tab with case management, messaging, AI tools
