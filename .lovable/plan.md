
# Client Portal with AI Responder -- Full Implementation Plan

## Overview
Build a dedicated Client Portal within GlobalyOS where external clients sign in via Email + OTP (separate from staff auth), view service/case progress, exchange messages and documents, complete tasks, and optionally receive AI-assisted responses. The portal lives at `/org/:orgCode/portal/...` and is fully tenant-isolated.

---

## Phase 1: Database Schema (Migrations)

### New Tables

**1. `client_portal_settings`** -- per-org portal configuration
- `id`, `organization_id` (FK), `is_enabled` (bool, default false), `branding_logo_url`, `branding_primary_color`, `branding_company_name`, `otp_expiry_minutes` (default 10), `otp_max_attempts` (default 5), `otp_lockout_minutes` (default 15), `ai_auto_reply_enabled` (default false), `ai_confidence_threshold` (default 0.8), `created_at`, `updated_at`

**2. `client_portal_offices`** -- which offices the portal applies to
- `id`, `organization_id`, `office_id` (FK to offices), `created_at`

**3. `client_portal_users`** -- external client accounts (NOT Supabase auth)
- `id`, `organization_id`, `email` (unique per org), `full_name`, `phone`, `avatar_url`, `status` (active/suspended/invited), `primary_office_id` (FK, nullable), `last_login_at`, `created_at`, `updated_at`
- Unique constraint on `(organization_id, email)`

**4. `client_portal_otp_codes`** -- separate OTP table for portal clients
- `id`, `organization_id`, `email`, `code_hash` (text, bcrypt hashed), `expires_at`, `attempts` (default 0), `max_attempts` (default 5), `locked_until` (nullable), `ip_hash`, `user_agent_hash`, `created_at`

**5. `client_portal_sessions`** -- JWT-like session tracking
- `id`, `organization_id`, `client_user_id` (FK), `token_hash`, `expires_at`, `ip_address`, `user_agent`, `created_at`, `revoked_at` (nullable)

**6. `client_cases`** -- services/applications linked to clients
- `id`, `organization_id`, `office_id`, `client_user_id` (FK), `title`, `description`, `status` (text: draft/active/pending/completed/cancelled), `priority` (text: low/normal/high/urgent), `assigned_to` (FK to employees, nullable), `workflow_template_id` (nullable), `metadata` (jsonb), `created_by`, `created_at`, `updated_at`

**7. `client_case_status_history`** -- timeline events
- `id`, `case_id` (FK), `status`, `note`, `client_visible` (bool, default true), `created_by_type` (staff/system/ai), `created_by_id`, `created_at`

**8. `client_case_milestones`** -- workflow milestones
- `id`, `case_id` (FK), `title`, `description`, `status` (pending/in_progress/completed/skipped), `sort_order`, `completed_at`, `created_at`

**9. `client_threads`** -- message threads per case
- `id`, `organization_id`, `case_id` (FK), `subject`, `unread_by_client` (int default 0), `unread_by_staff` (int default 0), `last_message_at`, `created_at`

**10. `client_messages`** -- messages within threads
- `id`, `thread_id` (FK), `sender_type` (client/staff/ai/system), `sender_id` (text), `message` (text), `attachments` (jsonb array), `client_visible` (bool, default true), `is_internal_note` (bool, default false), `ai_confidence` (float, nullable), `ai_sources` (jsonb, nullable), `created_at`

**11. `client_documents`** -- document requests and uploads
- `id`, `organization_id`, `case_id` (FK), `file_name`, `file_url`, `file_type`, `file_size`, `document_type` (text: requested/uploaded), `status` (pending/submitted/approved/rejected), `version` (int default 1), `parent_document_id` (FK nullable, for versioning), `review_note`, `reviewed_by`, `reviewed_at`, `uploaded_by_type` (client/staff), `uploaded_by_id`, `created_at`

**12. `client_tasks`** -- action items for clients
- `id`, `case_id` (FK), `title`, `description`, `task_type` (upload_doc/fill_form/approve/pay/custom), `status` (pending/in_progress/completed/skipped), `due_at`, `completed_at`, `metadata` (jsonb), `created_by`, `created_at`

**13. `client_notifications`** -- in-app + email notifications
- `id`, `organization_id`, `client_user_id` (FK), `type` (message/status_change/task/document/system), `title`, `body`, `link`, `read_at`, `emailed_at`, `created_at`

**14. `client_portal_audit_logs`** -- security audit trail
- `id`, `organization_id`, `office_id` (nullable), `actor_type` (client/staff/system/ai), `actor_id`, `action` (login/logout/download/upload/message_sent/ai_auto_reply/permission_change/etc), `entity_type`, `entity_id`, `metadata` (jsonb), `ip_address`, `user_agent`, `created_at`

**15. `client_ai_interactions`** -- AI usage tracking
- `id`, `organization_id`, `thread_id` (FK), `case_id` (FK), `interaction_type` (draft_reply/auto_reply/summarize/extract_actions), `prompt_summary`, `response`, `sources_used` (jsonb), `confidence_score` (float), `staff_rating` (int nullable, 1-5), `staff_feedback` (text nullable), `was_sent_to_client` (bool default false), `created_at`

### Storage Bucket
- `client-portal-documents` -- for client file uploads, scoped `{orgId}/{caseId}/{fileName}`

### RLS Policies
All tables will have RLS enabled. Policies will be based on:
- Staff access: via `organization_members` membership check (using existing `has_role` pattern)
- Client access: via portal session validation (edge function only, no direct client DB access)
- All tables enforce `organization_id` scoping

---

## Phase 2: Edge Functions (Backend)

### 1. `portal-send-otp` -- Request OTP for portal login
- Input: `{ orgSlug, email }`
- Resolves org from slug, checks portal is enabled
- Generates 6-digit OTP, bcrypt-hashes it, stores in `client_portal_otp_codes`
- Rate limits: 3/email/hour, 10/IP/hour
- Sends branded email via Resend (using org branding from `client_portal_settings`)
- Logs to `client_portal_audit_logs`

### 2. `portal-verify-otp` -- Verify OTP and create session
- Input: `{ orgSlug, email, code, turnstileToken? }`
- Verifies code against bcrypt hash (NOT plaintext comparison)
- Handles expiry, attempt limits, lockout, CAPTCHA after 2 failures
- Creates entry in `client_portal_sessions` with JWT-like token
- Returns session token + client user info
- Logs to audit

### 3. `portal-auth-middleware` (shared utility)
- Validates portal session token from `Authorization: Bearer <token>` header
- Returns `{ clientUser, organizationId, officeId }` or 401
- Used by all other portal edge functions

### 4. `portal-dashboard` -- Get client dashboard data
- Returns: active cases, pending tasks, unread messages, recent updates

### 5. `portal-case-detail` -- Get case detail with timeline
- Returns: case info, status history, milestones, tasks, documents, thread summary

### 6. `portal-messages` -- Send/receive messages
- GET: list messages in thread (client-visible only)
- POST: send message from client (with optional attachments)
- Updates unread counts

### 7. `portal-documents` -- Upload/download documents
- POST: upload document (signed URL to storage)
- GET: get signed download URL (scoped to client's own docs)

### 8. `portal-tasks` -- Get/complete tasks
- GET: list tasks for case
- PATCH: mark task complete

### 9. `portal-notifications` -- Get/mark-read notifications
- GET: unread notifications
- PATCH: mark as read

### 10. `portal-ai-assist` -- AI draft/summarize/auto-reply
- POST: `{ action: 'draft_reply' | 'summarize' | 'extract_actions', threadId, caseId }`
- Uses Lovable AI Gateway (Gemini) with RAG from:
  - Wiki pages (existing `ai_content_index` / `knowledge_embeddings`)
  - Case metadata and status history
  - Organization knowledge settings
- Stores interaction in `client_ai_interactions`
- For auto-reply: checks `ai_auto_reply_enabled` and confidence threshold
- Never auto-sends unless explicitly enabled by admin

### 11. `portal-admin` -- Admin operations
- Invite client (create `client_portal_users` + send invite email)
- Link client to case
- Revoke sessions
- Update portal settings

---

## Phase 3: Frontend -- Client Portal UI

### New Route Structure (in App.tsx)
```
/org/:orgCode/portal/login          -- Portal login (public)
/org/:orgCode/portal/dashboard      -- Client dashboard
/org/:orgCode/portal/cases/:caseId  -- Case detail
/org/:orgCode/portal/messages       -- All messages
/org/:orgCode/portal/profile        -- Client profile
```

### New Components (`src/components/portal/`)
- `PortalLayout.tsx` -- Shell layout with portal nav, branding, client avatar
- `PortalLogin.tsx` -- Email input then OTP input (reuses InputOTP component)
- `PortalDashboard.tsx` -- Active cases grid, pending tasks, unread messages, recent updates
- `PortalCaseDetail.tsx` -- Timeline view, milestones, tasks checklist, messages tab, documents tab
- `PortalTimeline.tsx` -- Vertical timeline for status history
- `PortalMessages.tsx` -- Chat-like messaging UI with attachments
- `PortalDocuments.tsx` -- Document list with upload, status badges, version history
- `PortalTasks.tsx` -- Checklist-style task list with completion
- `PortalNotifications.tsx` -- Notification dropdown/page
- `PortalProfile.tsx` -- Contact details, notification preferences

### New Pages (`src/pages/portal/`)
- `PortalLoginPage.tsx`
- `PortalDashboardPage.tsx`
- `PortalCasePage.tsx`
- `PortalMessagesPage.tsx`
- `PortalProfilePage.tsx`

### Portal Auth Context (`src/hooks/usePortalAuth.tsx`)
- Separate from staff `useAuth` -- manages portal session token in localStorage
- Provides: `portalUser`, `portalSession`, `isAuthenticated`, `signOut`
- `PortalProtectedRoute` component wrapping portal pages

---

## Phase 4: Frontend -- Internal Admin UI

### Portal Settings (under existing Settings)
- New tab in Settings: "Client Portal"
- Enable/disable toggle
- Office selection (multi-select)
- Branding: logo upload, primary color picker, company name
- Security: OTP expiry, attempt limits (with safe defaults pre-filled)
- AI: toggle auto-reply, confidence threshold slider

### Client Management (under CRM or new section)
- Client list with status, linked cases, last login
- Create client dialog
- Invite button (sends portal login instructions email)
- Revoke access / suspend

### Case Management (internal view)
- Create case and link to client
- Update status (with client-visible toggle for notes)
- Create milestones and tasks
- Request documents
- Message client (internal notes vs client-visible)
- "AI Suggest Reply" button on message thread
- "AI Summarize Thread" button

---

## Phase 5: AI Responder Module

### RAG Pipeline
- Reuse existing `knowledge_embeddings` table and `generate-embeddings` edge function
- When staff clicks "Suggest Reply":
  1. Gather context: case details, recent messages, client info
  2. Query embeddings for relevant wiki/knowledge content
  3. Call Lovable AI (Gemini) with system prompt + context + sources
  4. Return draft with source citations
  5. Staff reviews, edits, and sends

### Auto-Reply (Phase 2 within this)
- When enabled: incoming client message triggers AI evaluation
- If confidence >= threshold AND topic not blocklisted: send auto-reply with disclaimer
- Otherwise: create draft for staff review
- All interactions logged in `client_ai_interactions`

### Safety Controls
- AI toggle per organization (in `client_portal_settings`)
- "Human takeover" always available
- Confidence threshold configurable (default 0.8)
- Source citations shown to staff (not to client)
- PII redaction: AI system prompt instructs no PII in responses

---

## Phase 6: Notifications

### Email Notifications (via Resend, existing infrastructure)
- OTP code (portal-branded template)
- New message from staff
- Case status changed
- Document approved/rejected
- Task assigned/reminder
- Portal invite email

### In-App Notifications
- Stored in `client_notifications`
- Bell icon in portal nav with unread count
- Mark as read on click

---

## Phase 7: Feature Flag & Routing

### Feature Flag
- Add `client_portal` to `FeatureName` type in `useFeatureFlags.tsx`
- Gate internal admin UI behind this flag
- Portal public routes (`/org/:orgCode/portal/login`) always accessible if portal is enabled for that org (checked via `client_portal_settings`)

### Routing Integration
- Add portal routes to `App.tsx` as a separate route group
- Portal routes use `PortalLayout` (not the staff `Layout`)
- No staff auth required -- portal has its own auth context

---

## Technical Notes

- **No cross-tenant leakage**: Every query enforced by `organization_id` from session, never from client input
- **OTP stored as bcrypt hash**: Unlike existing `otp_codes` table which stores plaintext, portal OTPs are hashed
- **Separate session system**: Portal sessions are custom JWT-like tokens, not Supabase auth sessions
- **Existing infrastructure reused**: Resend for email, storage buckets for files, embeddings for AI RAG, Lovable AI Gateway for LLM
- **No new dependencies needed**: All built with existing React + Supabase + Tailwind stack
- **Mobile-responsive**: Portal UI built mobile-first with clean stacking

## Estimated Scope
- ~15 new database tables
- ~11 edge functions
- ~15 new React components + 5 pages
- ~3 new hooks (portal auth, portal data, portal notifications)
- Admin settings additions to existing Settings page
