# GlobalyOS — Product Requirements Document

**Version:** 1.1
**Updated:** 2026-02-22
**Source:** Derived from codebase analysis — `src/pages/` (165 pages), `src/components/` (713 components), `supabase/functions/` (197 edge functions), `supabase/migrations/` (478 files)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Module 1 — Authentication & Onboarding](#3-module-1--authentication--onboarding)
4. [Module 2 — Home Dashboard](#4-module-2--home-dashboard)
5. [Module 3 — People / HRMS](#5-module-3--people--hrms)
6. [Module 4 — Leave Management](#6-module-4--leave-management)
7. [Module 5 — Attendance](#7-module-5--attendance)
8. [Module 6 — Payroll](#8-module-6--payroll)
9. [Module 7 — Performance Reviews & KPIs](#9-module-7--performance-reviews--kpis)
10. [Module 8 — Workflows (Onboarding/Offboarding)](#10-module-8--workflows-onboardingoffboarding)
11. [Module 9 — Hiring / ATS](#11-module-9--hiring--ats)
12. [Module 10 — Chat & Messaging](#12-module-10--chat--messaging)
13. [Module 11 — Social Feed & Announcements](#13-module-11--social-feed--announcements)
14. [Module 12 — Wiki / Knowledge Base](#14-module-12--wiki--knowledge-base)
15. [Module 13 — Tasks](#15-module-13--tasks)
16. [Module 14 — CRM](#16-module-14--crm)
17. [Module 15 — Calendar](#17-module-15--calendar)
18. [Module 16 — AI Assistant (Ask AI)](#18-module-16--ai-assistant-ask-ai)
19. [Module 17 — Inbox (Omnichannel)](#19-module-17--inbox-omnichannel)
20. [Module 18 — WhatsApp Business](#20-module-18--whatsapp-business)
21. [Module 19 — Accounting & Finance](#21-module-19--accounting--finance)
22. [Module 20 — Client Portal](#22-module-20--client-portal)
23. [Module 21 — Telephony / IVR / Call Center](#23-module-21--telephony--ivr--call-center)
24. [Module 22 — Org Settings & Administration](#24-module-22--org-settings--administration)
25. [Module 23 — Billing & Subscriptions](#25-module-23--billing--subscriptions)
26. [Module 24 — Super Admin](#26-module-24--super-admin)
27. [Route Map](#27-route-map)
28. [Edge Functions](#28-edge-functions)
29. [Database Schema Summary](#29-database-schema-summary)
30. [Non-Functional Requirements](#30-non-functional-requirements)

---

## 1. Product Overview

**GlobalyOS** is a multi-tenant, cloud-native Business Operating System delivered as a SaaS product. It consolidates HR management, team communication, CRM, project management, knowledge management, accounting, telephony, and AI assistance into a single platform.

**Target Users:** SMBs and growing enterprises (primarily in the Asia-Pacific / South Asia market based on India payroll engine).

**Deployment Model:**
- Web SPA (React/Vite) hosted via CDN
- Progressive Web App (PWA) with offline support
- Native mobile apps via Capacitor (iOS + Android)
- Backend: Supabase (PostgreSQL + Auth + Edge Functions + Realtime + Storage)

**Core Value Propositions:**
- Eliminate tool sprawl — replace 10+ point solutions
- AI-powered across every module
- Real-time collaboration built-in
- Multi-office, multi-timezone, multi-currency support
- Configurable per-org via feature flags and settings

---

## 2. User Roles & Permissions

### 2.1 Role Definitions

| Role | `app_role` enum | Description |
|------|----------------|-------------|
| **Super Admin** | `super_admin` | Platform-level access; can manage all orgs |
| **Owner** | `owner` | Org creator; billing, plan changes, all settings |
| **Admin** | `admin` | Full org management; cannot change billing plan |
| **HR** | `hr` | Employee management, leave, payroll, hiring |
| **Member / User** | `member` / `user` | Standard employee; self-service only |

### 2.2 Role-Based Access Patterns

- **Admin/Owner only:** Organization settings, office management, billing, super-admin features, feature flag configuration, workflow template management, AI knowledge settings
- **HR only:** Payroll runs, bulk employee imports, leave type configuration, exit interviews, hiring approval
- **Manager (implicit):** Approves leave and WFH for direct reports, views direct report KPIs, assigns tasks
- **All authenticated users:** Chat, feed, wiki (with per-item ACL), tasks, calendar viewing, ask-AI
- **Public (unauthenticated):** Landing page, blog, careers, contact, assignment submissions (token-gated), client portal (session-gated)

### 2.3 Row-Level Security (RLS) Functions

The database enforces access via PostgreSQL RLS policies backed by helper functions:
- `has_role(org_id, role)` — checks if current user has a role in an org
- `is_org_member(org_id)` — verifies org membership
- `is_org_admin_or_owner(org_id)` — admin/owner check
- `is_manager_of_employee(employee_id)` — manager relationship check
- `can_view_employee_sensitive_data(employee_id)` — HR/admin or self
- `can_view_post(post_id)` — office/department/project-based post visibility
- `can_edit_wiki_item(item_id)` — wiki ACL check
- `is_space_member(space_id)` — chat space access
- `is_conversation_participant(conversation_id)` — chat conversation access
- `check_feature_limit(org_id, feature)` — plan-based feature gating

---

## 3. Module 1 — Authentication & Onboarding

### 3.1 Authentication

**Route:** `/auth`

**Supported Methods:**
- **Passwordless OTP** — email-based one-time password (primary)
- **Google OAuth** — configurable per-organization
- **CAPTCHA** (Cloudflare Turnstile) — triggered after 2 failed OTP attempts

**Auth Flow:**
1. User enters email → system sends OTP via edge function
2. 60-second resend cooldown enforced client-side
3. User enters 6-digit OTP → verified via Supabase Auth
4. On success: check org onboarding completion → redirect accordingly
5. If org not onboarded → redirect to `/onboarding`

**Security Controls:**
- Email normalization (trim + lowercase before lookup)
- `login_attempts` table tracks failed attempts
- Duplicate redirect prevention guard
- `otp_codes` table for OTP management

**Tables:** `otp_codes`, `login_attempts`, `profiles`, `organization_members`

---

### 3.2 Organization Onboarding

**Route:** `/onboarding`

**Data Collected:**
- Organization name, industry, size
- Owner profile (name, timezone)
- First office location
- Initial departments and positions

**Table:** `org_onboarding_data`, `onboarding_progress`, `welcome_survey_responses`

**Admin Setup Component:** `AdminSetup.tsx` — guides first-time admin through initial configuration steps (shown on home page until complete).

**Feature Setup Guide:** `FeatureSetupGuide.tsx` — onboarding checklist widget on home dashboard showing which modules have been configured.

---

## 4. Module 2 — Home Dashboard

**Route:** `/org/:orgCode`

### 4.1 Dashboard Widgets

| Widget | Description | Audience |
|--------|-------------|----------|
| **Hero Section** | Personalized greeting, quick-action buttons (check-in, leave request, post) | All |
| **Attendance Card** | Self check-in/out; shows not-checked-in reminder | All |
| **Leave Overview** | Current leave balances, pending requests | All |
| **Pending Leave Approvals** | Requests awaiting manager/HR action | Managers, HR |
| **Pending WFH Approvals** | WFH requests awaiting approval | Managers, HR |
| **My Workflow Tasks** | Personal workflow tasks due | All |
| **Internal Vacancies** | Open job postings for internal candidates | All |
| **World Clocks** | Multi-timezone clock display | All |
| **Weather Display** | Local weather for user's office | All |
| **Daily Horoscope** | Fun astrological widget | All |
| **Feature Setup Guide** | Admin checklist for initial configuration | Admin |
| **Support Requests** | User's own help tickets | All |
| **Team Sidebar** | Team availability, upcoming leaves, birthdays, anniversaries | All |

### 4.2 Home Data Sources

- People on leave today
- Upcoming team leave (next 7/14/30 days)
- Upcoming birthdays and anniversaries (date-masked for privacy: MM-DD format)
- Upcoming calendar events
- Weather API (office location-based)

---

## 5. Module 3 — People / HRMS

### 5.1 Employee Directory

**Route:** `/org/:orgCode/team`

**Features:**
- Searchable, filterable employee list
- Filter by department, office, employment type, status
- List and card views
- Export to CSV

**Employee Card shows:**
- Avatar, name, position, department, office
- Online status indicator
- Role badge (Admin, HR, Member)
- Work location (onsite/hybrid/remote)
- Work model indicator

### 5.2 Employee Profile

**Route:** `/org/:orgCode/team/:employeeId`

**Profile Sections:**
- Personal info (name, email, phone, address, birthday, emergency contact)
- Employment details (position, department, employment type, manager, join date, work model)
- Position history timeline
- Documents (personal docs, contracts, payslips — folder-based)
- Leave balances and history
- Attendance history
- KPIs (individual)
- Performance reviews
- AI-generated profile summary
- Activity timeline

**Editable fields (self or HR/Admin):**
- Name, email, address, avatar, status message
- Emergency contacts
- Employment info (HR/Admin only)
- Manager assignment (HR/Admin only)
- Position (HR/Admin only)

### 5.3 Organization Chart

**Route:** `/org/:orgCode/org-chart`

**Features:**
- Hierarchical org chart by department
- Department-based color coding (8 colors)
- Bento-style layout for large departments
- External manager detection (dashed border)
- Employee count per department
- Click to view employee profile

### 5.4 Employee Lifecycle Management

**Invite & Onboarding:**
- Email invite with role assignment (Admin, HR, Member)
- Bulk CSV import via `BulkImportDialog`
- Orphaned user recovery (`RecoverOrphanedUsersDialog`)
- Quick invite (`QuickInviteDialog`)

**Offboarding:**
- Set resignation date and last working day (`SetResignationDialog`)
- Offboarding workflow (asset handover, knowledge transfer, exit interview)
- Transfer direct reports and project leads (`TeamMemberOffboardTransferDialog`)

**Tables:** `employees`, `profiles`, `organization_members`, `user_roles`, `employee_projects`, `position_history`, `employee_documents`, `employee_bank_accounts`, `employee_onboarding_data`

---

## 6. Module 4 — Leave Management

### 6.1 Employee Leave Self-Service

**Route:** `/org/:orgCode/leave`

**Features:**
- View leave balances by type (paid, unpaid, sick, etc.)
- Separated current year vs previous year balances
- Request leave (full day, half day)
- Cancel pending requests
- View request history with status (pending, approved, rejected, cancelled)
- Overtime/undertime hour balance tracking

### 6.2 Leave Types

**Configured per office** via `office_leave_types` table. Attributes include:
- Name, color, paid/unpaid flag
- Accrual rules
- Carry-forward limits
- Allow half-day flag

### 6.3 Leave Approval Workflow

**Multi-level approval chain:**
1. Employee submits request → status: `pending`
2. Direct manager receives notification → can approve/reject
3. HR/Admin can approve any request (backup approver)
4. On approval: balance deducted automatically

**PendingLeaveApprovals component:** Shows HR/manager requests with approve/reject + optional notes.

**Business Rules:**
- Manager on leave → HR auto-notified
- Half-day leave type enforcement
- Balance validation before approval
- Retroactive leave adjustments via `EditLeaveAdjustmentDialog`

### 6.4 Leave Administration (HR/Admin)

- Add leave on behalf of employees (`AddLeaveForEmployeeDialog`)
- Adjust balances manually (`AddLeaveBalanceDialog`)
- View balance change logs (`LeaveBalanceLogsDialog`)
- Bulk leave import (`BulkLeaveImportDialog`)
- Configure leave types per office (`ManageLeaveTypesDialog`)
- Auto-initialize employee leave balances

### 6.5 WFH (Work From Home) Requests

- Separate request flow from leave
- Manager/HR/Admin approval chain
- `PendingWfhApprovals` for approvers

**Tables:** `leave_requests`, `leave_balances`, `leave_balance_logs`, `leave_type_balances`, `office_leave_types`, `attendance_leave_adjustments`, `attendance_hour_balances`, `wfh_requests`

---

## 7. Module 5 — Attendance

### 7.1 Attendance Tracking Methods

**Check-In Methods (configured per org):**

| Method | Description |
|--------|-------------|
| **QR Code** | Office-specific QR codes; optional GPS radius validation |
| **Remote Check-In** | GPS location-based; validates within office radius |
| **Manual** | HR/Admin enters attendance directly |
| **Self Check-In** | Simple button check-in from home dashboard |

**QR Code Features (`AttendanceQRButton`):**
- Generates office-specific QR codes with configurable location radius
- Auto-deactivates old codes when new one is generated
- Export QR as PDF
- Stored in `office_qr_codes` table

### 7.2 Attendance Records

**Route:** `/org/:orgCode/team/:employeeId/attendance`

**Data captured per session:**
- Check-in time, check-out time
- Location (GPS coordinates)
- Session type (regular, break, etc.)
- Late flag, early departure flag

**Multiple sessions per day** (up to configured limit).

**Monthly Stats:**
- Total days present / absent / late / half-day
- Total hours worked
- Late arrival count
- Early departure count

**Filters:** Month picker, status (present/late/absent/half-day), date-specific

### 7.3 Attendance Administration

- Edit attendance records (Admin/HR) — `EditAttendanceDialog`
- Bulk edit multiple records — `BulkEditAttendanceDialog`
- Add manual attendance — `AddAttendanceDialog`
- Attendance report scheduling — `AttendanceReportScheduleDialog`
- Office-level attendance exemptions — `office_attendance_exemptions`

### 7.4 Attendance Policy Settings

Configurable via `AttendanceSettings`:
- Auto-adjustment toggle (overtime → Day In Lieu)
- Day In Lieu accrual cap
- Multi-session daily limit
- Early checkout reason requirement
- Attendance reminders — `attendance_reminders`

### 7.5 Attendance Widgets

**AttendanceTracker (`AttendanceTracker.tsx`):**
- Weekly attendance chart with bars
- Work hours summary (week)
- Late/early arrival indicators
- WFH days count

**Tables:** `attendance_records`, `attendance_summary`, `attendance_hour_balances`, `attendance_not_checked_in`, `office_qr_codes`, `office_attendance_settings`, `office_attendance_exemptions`, `office_schedules`, `employee_schedules`, `attendance_reminders`, `attendance_report_schedules`

---

## 8. Module 6 — Payroll

### 8.1 Overview

**Route:** `/org/:orgCode/payroll`

Full payroll processing system with India-specific statutory compliance engine.

### 8.2 Payroll Configuration

**Salary Structures:**
- Custom salary components (basic, HRA, allowances, deductions)
- Component types: fixed, percentage-of-basic, formula-based
- Salary structures per employee or employment type

**Statutory Rules (India engine):**
- PF (Provident Fund) calculation
- ESI (Employee State Insurance)
- Professional Tax slabs
- Income Tax slabs (`tax_slabs`)
- Social security rules

**Tables:** `salary_components`, `salary_structures`, `statutory_rules`, `social_security_rules`, `tax_slabs`, `payroll_profiles`, `employer_contributions`

### 8.3 Payroll Runs

- Create payroll run for a period (monthly)
- Auto-calculate earnings and deductions per employee
- Review individual payroll items before finalization
- Finalize and generate payslips
- Payslip PDF generation and distribution

**Run statuses:** draft → processing → review → finalized

**Tables:** `payroll_runs`, `payroll_run_items`, `payroll_earnings`, `payroll_deductions`, `payslips`

### 8.4 Employee Payroll Profile

- Bank account details (`employee_bank_accounts`)
- Tax declarations
- PF/ESI enrollment
- Salary structure assignment

---

## 9. Module 7 — Performance Reviews & KPIs

### 9.1 KPI Management

**Route:** `/org/:orgCode/growth` (KPI section)

**KPI Types:**
- **Group KPIs** — owned by a team/department/project
- **Individual KPIs** — owned by specific employees

**KPI Fields:**
- Title, description, unit of measurement
- Target value, current value
- Status: `on_track` | `at_risk` | `behind` | `achieved` | `completed`
- Quarter and year
- Parent/child KPI linking
- Multiple owners per KPI

**KPI Features:**
- Kanban-style KPI board
- AI-generated KPI suggestions (`AIKPIAssist`)
- AI performance insights (`AIKPIInsights`) — trend analysis, focus areas, recommendations with caching
- Update history log (`kpi_activity_logs`)
- Milestone tracking (`kpi_milestone_progress`)
- Attachment uploads
- Bulk KPI operations
- KPI templates for quick setup (`kpi_templates`)
- Pending update reminders with snooze (`PendingKpiUpdates`)
- Stale KPI indicator (last updated X days ago)
- Achievement celebration animation
- Bulk KPI generation from AI (`kpi_generation_jobs`)

**KPI Settings:** Update frequency configuration, reminder settings (`kpi_update_settings`)

**Tables:** `kpis`, `kpi_owners`, `kpi_updates`, `kpi_activity_logs`, `kpi_ai_insights`, `kpi_templates`, `kpi_generation_jobs`, `kpi_update_settings`

### 9.2 Performance Reviews

**Features:**
- Review cycle management
- Configurable review templates (`review_templates`)
- Multi-dimensional scoring
- AI draft generation (`AIReviewPrep`) — analyzes achievements, KPIs, kudos
- Reviewer/reviewee roles
- Review status tracking

**Tables:** `performance_reviews`, `review_templates`

### 9.3 Kudos & Recognition

- Employee-to-employee kudos posts
- Target scoping: specific employees, departments, offices, projects
- Emoji reactions on kudos
- AI-assisted kudos writing (`AIWritingAssist`)
- Kudos appear in social feed
- Privacy controls (who can view)

**Tables:** `kudos`, `kudos_departments`, `kudos_offices`, `kudos_projects`

### 9.4 Learning & Development

- L&D content tracking
- `learning_development` table

---

## 10. Module 8 — Workflows (Onboarding/Offboarding)

### 10.1 Workflow Templates

**Route:** `/org/:orgCode/workflows`

Templates define repeatable processes (onboarding, offboarding, equipment provisioning, etc.).

**Template Structure:**
- Template name, description
- Stages (ordered)
- Tasks per stage (with default assignees, categories, due-date offsets)
- Triggers (manual or automatic based on employee events)

### 10.2 Workflow Applications (Instances)

Each "application" is a running instance of a workflow template for a specific employee.

**Views:**
- **Kanban board** — applications as cards across template columns
- **List view** — all applications with status

**Application lifecycle:**
1. Started (manually or triggered automatically)
2. Stage-by-stage task completion
3. Stage completion requires all tasks done
4. Stage notes and attachments per stage
5. Completion or cancellation

**Special Offboarding Features:**
- Exit interview form capture (`ExitInterviewForm`)
- Asset handover tracking (`AssetHandoverList`)
- Knowledge transfer documentation (`KnowledgeTransferList`)

### 10.3 Task Management Within Workflows

- Per-task assignee (any org member)
- Task category and status
- Due dates with offsets from workflow start
- Task checklists
- Task comments and mentions
- Task attachments
- Archive completed tasks

### 10.4 Workflow Triggers

Automatic workflow initiation based on:
- Employee hired (triggers onboarding)
- Resignation set (triggers offboarding)
- Custom trigger conditions

**Tables:** `workflow_templates`, `workflow_stages`, `workflow_template_tasks`, `employee_workflows`, `employee_workflow_tasks`, `workflow_task_categories`, `workflow_task_statuses`, `workflow_triggers`, `workflow_activity_logs`, `workflow_stage_notes`, `workflow_stage_attachments`, `workflow_stage_note_mentions`, `workflow_task_comments`, `workflow_task_comment_mentions`, `workflow_task_checklists`, `workflow_task_attachments`, `exit_interviews`, `asset_handovers`, `knowledge_transfers`

---

## 11. Module 9 — Hiring / ATS

### 11.1 Job Postings

**Route:** `/org/:orgCode/hiring`

**Job fields:**
- Title, position, department, office
- Employment type, work model
- Salary range (min/max, currency)
- Description (rich text)
- Custom application form questions

**Job statuses:** `draft` → `submitted` → `approved` → `open` → `paused` → `closed`

**Features:**
- Careers page integration (public job listing)
- Share job posting link
- Internal vacancy posting (visible to existing employees)

### 11.2 Candidate Management

**Candidate Profiles:**
- Basic info, source (`careers_site`, `internal`, `referral`, `manual`, `job_board`, `linkedin`, `other`)
- CV/Resume upload with AI parsing (`ResumeParseButton`)
- Custom notes
- Activity log

### 11.3 Application Pipeline

**Configurable pipeline stages per org:**
- Default: `applied` → `screening` → `assignment` → `interview_1` → `interview_2` → `interview_3` → `offer` → `hired` / `rejected`
- Custom stage configuration via `org_pipeline_stages` / `org_pipelines`
- Stage transition rules (`pipeline_stage_rules`)

**Application statuses:** `active` | `on_hold` | `withdrawn` | `rejected` | `hired`

### 11.4 Hiring Sub-Modules

**Assignments:**
- Multiple assignment types: `coding`, `writing`, `design`, `case_study`, `general`
- Questions: paragraph, multiple choice, file upload, URL
- Token-based public submission link (no login required)
- OTP email verification gate for submissions
- Deadline enforcement
- File upload support
- Review and scoring

**Interviews:**
- Schedule interviews (date, time, interviewers)
- Interview status: `scheduled` | `completed` | `cancelled` | `no_show`
- Scorecard submission per interviewer
- Recommendation: `strong_yes` | `yes` | `neutral` | `no` | `strong_no`
- Interview notes

**Offers:**
- Draft and send offer letters
- Offer statuses: `draft` → `pending_approval` → `approved` → `sent` → `accepted` / `declined` / `expired`
- Salary and benefits details
- Custom offer letter template

**Convert to Employee:**
- `ConvertToEmployeeDialog` — converts accepted candidate into active employee
- Auto-triggers onboarding workflow

### 11.5 Hiring Activity Log

Full audit trail of all hiring actions (`hiring_activity_log` table with `hiring_activity_action` enum covering 22 action types).

**Tables:** `jobs`, `job_stages`, `candidates`, `candidate_applications`, `assignment_templates`, `assignment_instances`, `assignment_type_options`, `hiring_interviews`, `interview_scorecards`, `hiring_offers`, `hiring_activity_logs`, `hiring_email_templates`, `org_pipelines`, `org_pipeline_stages`, `pipeline_stage_rules`

---

## 12. Module 10 — Chat & Messaging

### 12.1 Spaces (Channels)

**Route:** `/org/:orgCode/chat`

**Space types:** `collaboration` | `announcements` | `project`

**Access scopes:**
- `company` — all org members
- `offices` — specific offices
- `projects` — specific projects
- `members` — manually selected members
- `custom` — combined rules

**Access:** `public` (any member can join) | `private` (invite-only)

**Space Features:**
- Create, edit, archive spaces
- Manage members and admins
- Transfer admin ownership
- Pin resources (links, files) to spaces
- Browse and join public spaces

### 12.2 Direct Messages

- 1:1 or group conversations
- Separate from spaces
- Group admin management
- Transfer group admin

### 12.3 Messaging Features

| Feature | Description |
|---------|-------------|
| **Rich text** | Bold, italic, code, lists, links |
| **Mentions** | @member autocomplete with notification |
| **Reactions** | Emoji reactions on messages |
| **Threading** | Reply threads on any message |
| **Stars** | Star messages for later reference |
| **Read receipts** | Per-message read status |
| **Message search** | Full-text search within conversations |
| **Link previews** | Auto-unfurl URLs (YouTube, Spotify, Loom, Twitter, etc.) |
| **File attachments** | Upload and share files |
| **Image lightbox** | Preview images inline |

### 12.4 Advanced Chat Features

- **Quick Switcher** — keyboard shortcut to jump between spaces
- **Global Chat Search** — search across all conversations
- **Mentions View** — filtered view of all @mentions
- **Starred View** — all starred messages
- **Unread View** — all unread messages
- **Connection Status** — real-time connection indicator
- **Virtualized message list** — performance optimization for large chat histories
- **Chat favorites** — pin favorite conversations/spaces

### 12.5 Calling (Sendbird Calls)

- Voice and video calls within chat
- Incoming call notification dialog
- Active call overlay
- Call log in chat history

**Tables:** `chat_spaces`, `chat_space_members`, `chat_space_departments`, `chat_space_offices`, `chat_space_projects`, `chat_space_member_logs`, `chat_conversations`, `chat_participants`, `chat_messages`, `chat_message_reactions`, `chat_message_read_receipts`, `chat_message_stars`, `chat_attachments`, `chat_favorites`, `chat_mentions`, `chat_pinned_resources`, `chat_presence`

---

## 13. Module 11 — Social Feed & Announcements

### 13.1 Post Types

- **Updates** — general status updates / company news
- **Announcements** — formal announcements (separate type)
- **Kudos** — employee recognition (see Module 7.3)

### 13.2 Feed Features

- **Audience targeting:** offices, departments, projects (granular scoping)
- **Rich text content** with BlockNote editor
- **Media attachments** (images, videos)
- **Link previews** on external URLs
- **Polls** — multiple choice voting with results
- **Reactions** — emoji reactions per post
- **Comments** — threaded discussions with @mentions
- **Acknowledgments** — track who has read/acknowledged a post
- **AI writing assist** — generate/improve post content
- **Delete** with confirmation
- **Pinning** posts (announcements)

### 13.3 Post Visibility Rules (RLS)

Posts are visible to users who are members of the targeted office(s), department(s), or project(s). `can_view_post()` function enforces this.

**Tables:** `posts`, `post_media`, `post_comments`, `post_reactions`, `post_mentions`, `post_departments`, `post_offices`, `post_projects`, `post_polls`, `poll_options`, `poll_votes`, `post_acknowledgments`, `post_link_previews`, `updates`, `update_mentions`, `update_departments`, `update_offices`, `update_projects`, `feed_reactions`, `comment_reactions`, `comment_mentions`

---

## 14. Module 12 — Wiki / Knowledge Base

### 14.1 Structure

**Route:** `/org/:orgCode/wiki`

Wiki is organized in a hierarchical folder/page tree:
- Folders (can nest)
- Pages (rich text, collaborative editing)

### 14.2 Access Control

Per folder and per page, access can be scoped to:
- Specific org members
- Departments
- Offices
- Projects
- Organization-wide (default)

### 14.3 Wiki Features

- **Rich text editor** (BlockNote) with full formatting
- **Page versions** — full version history with diff support
- **Favorites** — bookmark pages
- **Comments** — per-page discussion thread
- **Search** — full-text search across wiki
- **Templates** — pre-built wiki page templates by category
  - Categories: `policies`, `sops`, `business_plans`, `hr_documents`, `compliance`, `operations`
- **AI-powered:** AI can index wiki content for Ask AI responses
- **Transfer ownership** — reassign wiki items between users
- **Bulk transfer** — move multiple wiki items at once

**Tables:** `wiki_folders`, `wiki_pages`, `wiki_page_versions`, `wiki_page_comments`, `wiki_favorites`, `wiki_folder_members`, `wiki_folder_departments`, `wiki_folder_offices`, `wiki_folder_projects`, `wiki_page_members`, `wiki_page_departments`, `wiki_page_offices`, `wiki_page_projects`, `template_wiki_folders`, `template_wiki_documents`, `knowledge_embeddings`

---

## 15. Module 13 — Tasks

### 15.1 Structure

**Route:** `/org/:orgCode/tasks`

Three-level hierarchy:
1. **Task Spaces** — top-level containers
2. **Task Lists** — within spaces
3. **Tasks** — individual work items

### 15.2 Task Fields

- Title, description (rich text)
- Status (configurable per space)
- Category (configurable per space)
- Due date
- Assignees (multiple)
- Priority
- Attachments
- Checklists (sub-items)
- Comments with @mentions

### 15.3 Views

- **List View** — table format with customizable columns
- **Board View** — Kanban by status

### 15.4 Task Features

- Real-time task updates via Supabase subscriptions
- Search and filter (by status, category, assignee)
- Task detail sheet with full editing
- Breadcrumb navigation for nested spaces
- Rename/delete lists
- Space management
- Activity log per task
- Task followers (subscribe to updates)
- Bulk operations (reassign, delete)

**Tables:** `task_spaces`, `task_lists`, `tasks`, `task_statuses`, `task_categories`, `task_checklists`, `task_comments`, `task_attachments`, `task_followers`, `task_activity_logs`

---

## 16. Module 14 — CRM

### 16.1 Contacts

**Route:** `/org/:orgCode/crm/contacts`

- Full contact database (name, email, phone, company, address, etc.)
- Custom fields per org (`crm_custom_fields`)
- Tagging system (`crm_tags`)
- Duplicate detection with AI
- Merge duplicate contacts

### 16.2 Companies

**Route:** `/org/:orgCode/crm/companies`

- Company profiles (name, website, industry, size, etc.)
- Link contacts to companies
- Custom fields per org
- Merge duplicate companies

### 16.3 Activity Timeline

- Log activities per contact/company (calls, emails, meetings, notes)
- Full interaction history
- Searchable and filterable

### 16.4 CRM Settings

- Configure custom fields
- Configure tags
- Pipeline configuration (shared with hiring or separate)

### 16.5 Scheduler (Meeting Booking)

- Create bookable event types (`scheduler_event_types`)
- Host assignment (`scheduler_event_hosts`)
- Public booking page for external parties
- Integration settings (`scheduler_integration_settings`)
- Bookings stored in `scheduler_bookings`

**Tables:** `crm_contacts`, `crm_companies`, `crm_activity_log`, `crm_custom_fields`, `crm_tags`, `scheduler_event_types`, `scheduler_event_hosts`, `scheduler_bookings`, `scheduler_integration_settings`

---

## 17. Module 15 — Calendar

### 17.1 Views

**Route:** `/org/:orgCode/calendar`

- **Month view**
- **Week view**
- **Day view**

### 17.2 Event Types Displayed

| Type | Source | Color |
|------|--------|-------|
| Leave | `leave_requests` | Red |
| Holidays | `office_leave_types` | Orange |
| Team Events | `calendar_events` | Blue |
| Birthdays | `employees` (masked) | Purple |
| Anniversaries | `employees` (masked) | Pink |
| Performance Reviews | `performance_reviews` | Green |

### 17.3 Calendar Features

- Multi-office event filtering
- Real-time event updates (Supabase subscription)
- Create/edit/delete events (Admin/HR only)
- Recurring event support with recurrence rule engine
- Filter by event type
- Date range filter (7/14/30 days, month, all)
- World clock panel alongside calendar

### 17.4 Privacy

- Birthday and anniversary data masked to `MM-DD` only (year hidden) via `get_birthday_calendar_data()` RPC function

**Tables:** `calendar_events`, `calendar_event_offices`

---

## 18. Module 16 — AI Assistant (Ask AI)

### 18.1 Conversation Interface

**Route:** `/org/:orgCode/ask-ai`

- Multi-turn AI conversations
- Conversation history (sidebar list)
- New conversation creation
- Mobile and desktop layouts

### 18.2 AI Knowledge Sources

Configurable in AI Knowledge Settings (Admin only). Sources:
- Wiki pages
- Chat messages
- Team directory
- Announcements/posts
- KPIs
- Calendar events
- Leave data
- Attendance data

**Indexing:** Content is vectorized and stored in `knowledge_embeddings`. `match_knowledge_embeddings()` RPC performs semantic search.

**Reindexing:** Scheduled and on-demand reindexing of all enabled sources.

### 18.3 Conversation Features

- Follow-up suggestions
- Source citations (shows which knowledge base items informed the answer)
- Internal notes on conversations
- Conversation sharing (private / team / specific members)
- Participant management
- Typing indicator
- Message regeneration
- Search within conversation

### 18.4 Global AI Assistant

**`GlobalAskAI.tsx`** — accessible from any page via button in navigation.
- Drawer/sheet interface
- Conversation history via localStorage
- Topic extraction for smart suggestions
- Routes to full Ask AI page for extended sessions

### 18.5 AI Usage Tracking

- Per-query token consumption tracked in `ai_usage_logs`
- Monthly summaries in `ai_usage_monthly_summary`
- Token balance system (`token_balances`, `token_packages`, `token_purchases`)
- Usage alerts when nearing limits
- `deduct_ai_tokens()` function for billing

**AI Features Across Platform:**
- `AIKPIAssist` — KPI generation
- `AIKPIInsights` — performance insights
- `AIReviewPrep` — review draft
- `AIWritingAssist` — content writing
- `AIKnowledgeSettings` — knowledge base config
- `ProfileAISummary` — employee profile summary
- `PositionAIDescription` — job description generation
- `ResumeParseButton` — CV parsing

**Tables:** `ai_conversations`, `ai_messages`, `ai_conversation_participants`, `ai_knowledge_settings`, `ai_content_index`, `ai_indexing_status`, `ai_usage_logs`, `ai_usage_monthly_summary`, `ai_internal_notes`, `knowledge_embeddings`, `token_balances`, `token_packages`, `token_purchases`, `token_usage_daily`, `kpi_ai_insights`

---

## 19. Module 17 — Inbox (Omnichannel)

### 19.1 Overview

**Route:** `/org/:orgCode/inbox`

Unified customer messaging inbox supporting multiple channels.

### 19.2 Supported Channels

- WhatsApp
- Telegram
- Messenger
- Instagram
- TikTok
- Email

### 19.3 Inbox Features

- Unified conversation list with status: `open` | `pending` | `snoozed` | `closed`
- Message direction: `inbound` | `outbound`
- Message types: text, image, video, document, audio, template, interactive, system, note
- Delivery status tracking: `pending` → `sent` → `delivered` → `read` → `failed`
- Macros (saved reply templates) for quick responses
- Contact management (`inbox_contacts`)
- Activity log per conversation
- AI-powered response suggestions (`inbox_ai_events`)
- Email: Gmail sync with thread mapping
- Webhook event processing

**Tables:** `inbox_channels`, `inbox_conversations`, `inbox_messages`, `inbox_contacts`, `inbox_macros`, `inbox_activity_log`, `inbox_ai_events`, `inbox_gmail_sync_state`, `inbox_gmail_thread_map`, `inbox_webhook_events`, `email_campaigns`, `email_delivery_log`, `email_suppressions`, `email_templates`, `sender_identities`, `campaign_recipients`

---

## 20. Module 18 — WhatsApp Business

### 20.1 Overview

Dedicated WhatsApp Business API integration for marketing and support.

### 20.2 Features

**Contacts:**
- WhatsApp contact database
- Opt-in/opt-out management (`wa_opt_in_status`: `opted_in` | `opted_out` | `pending`)
- Contact tagging

**Conversations:**
- Inbound/outbound messaging
- Conversation statuses: `open` | `assigned` | `resolved` | `closed`
- Saved replies (`wa_saved_replies`)
- Audit log of all actions

**Templates:**
- Template categories: `marketing` | `utility` | `authentication`
- Template statuses: `draft` → `pending` → `approved` / `rejected`
- WhatsApp BSP template management

**Campaigns:**
- Broadcast campaigns to contact lists
- Campaign statuses: `draft` → `scheduled` → `sending` → `sent` / `failed` / `cancelled`
- Campaign analytics (delivery rates, read rates)

**Automations:**
- Trigger types: `message_received` | `keyword` | `new_contact` | `tag_added` | `flow_submitted`
- Automation statuses: `draft` | `active` | `paused`

**Flows:**
- Interactive WhatsApp flows (multi-step forms/menus)
- Flow submission capture

**Sequences:**
- Drip messaging sequences

**Tables:** `wa_accounts`, `wa_contacts`, `wa_conversations`, `wa_messages`, `wa_templates`, `wa_campaigns`, `wa_automations`, `wa_flows`, `wa_flow_submissions`, `wa_sequences`, `wa_saved_replies`, `wa_audit_log`

---

## 21. Module 19 — Accounting & Finance

### 21.1 Overview

Full double-entry accounting system scoped per office/legal entity.

### 21.2 Chart of Accounts

Account types: `asset` | `liability` | `equity` | `revenue` | `expense`

### 21.3 Invoicing

- Create invoices for clients/contacts
- Line items with quantities, unit prices, tax
- Tax rates (`tax_rates`)
- Recurring invoices with recurrence rules
- Stripe payment link integration
- Invoice statuses: `draft` → `approved` → `sent` → `paid` / `partially_paid` / `overdue` / `voided`
- Payment tracking
- Credit notes

### 21.4 Bills (Accounts Payable)

- Vendor bill management
- Bill statuses: `draft` → `approved` → `paid` / `partially_paid` / `overdue` / `voided`
- Bill payment recording

### 21.5 Bank Reconciliation

- Bank statement imports
- Statement line statuses: `unmatched` → `matched` → `reconciled` / `excluded`
- Bank rules for auto-matching
- Bank accounts per org

### 21.6 Journals & Ledgers

- Manual journal entries
- Journal statuses: `draft` | `posted` | `reversed`
- Journal lines (debit/credit per account)
- Ledgers scoped by `accounting_scope_type`: `OFFICE_SINGLE` | `OFFICE_SET` | `ORG_WIDE`
- Accounting setup per office (`accounting_setups`)
- Ledger entries

### 21.7 Legal Entities & Tax

- Legal entity management
- Tax rate configuration
- Payroll integration (payroll costs posted to accounting)

**Tables:** `accounting_ledgers`, `chart_of_accounts`, `accounting_invoices`, `accounting_invoice_lines`, `accounting_invoice_payments`, `accounting_bills`, `accounting_bill_lines`, `accounting_bill_payments`, `accounting_contacts`, `bank_accounts`, `bank_statements`, `bank_statement_lines`, `bank_rules`, `journals`, `journal_lines`, `ledger_entries`, `credit_notes`, `tax_rates`, `legal_entities`, `accounting_setups`, `accounting_setup_offices`, `accounting_audit_events`

---

## 22. Module 20 — Client Portal

### 22.1 Overview

A dedicated, white-label portal for external clients/customers to interact with the organization. Recently fully implemented with both client-facing pages and a staff-side case management interface.

### 22.2 Authentication

- OTP-based login for external users (no org account required)
- Rate-limited OTP with 5-attempt lockout (15 min cooldown)
- Session management (`client_portal_sessions`)
- Audit logging (`client_portal_audit_logs`)
- Office-specific portal configuration (enable/disable per office)
- Master access codes for staff preview (`super_admin_master_codes`)

**Edge Functions:** `portal-send-otp`, `portal-verify-otp`, `portal-api`, `portal-admin`, `create-portal-session`, `portal-ai-assist`

### 22.3 Client-Facing Portal Pages

**Routes:** `/org/:orgCode/portal/*` (session-gated — no Supabase auth required)

| Route | Page | Description |
|-------|------|-------------|
| `/portal/login` | `PortalLoginPage` | OTP email login |
| `/portal/dashboard` | `PortalDashboardPage` | Case overview + quick actions |
| `/portal/cases/:caseId` | `PortalCasePage` | Case detail with threads, documents, tasks |
| `/portal/messages` | `PortalMessagesPage` | All message threads |
| `/portal/profile` | `PortalProfilePage` | Client profile management |

**Client-facing features:**
| Feature | Description |
|---------|-------------|
| **Cases** | Client submits and tracks service cases |
| **Threads** | Per-case messaging thread with staff |
| **Documents** | Shared document repository (upload + download) |
| **Tasks** | Tasks assigned to client with status tracking |
| **Notifications** | Real-time alerts on case updates |
| **AI Assistant** | AI assistant (`portal-ai-assist`) for client queries with confidence-threshold auto-reply |
| **Milestones** | Case milestone/step tracking |
| **Status History** | Full audit of case status changes |

### 22.4 Staff-Side Case Management (Settings)

**Route:** `/org/:orgCode/settings/client-portal`

Staff manage all client portal activity from a dedicated settings page with tabs:

| Tab | Component | Description |
|-----|-----------|-------------|
| **General** | `PortalGeneralSettings` | Branding, OTP config, AI settings |
| **Offices** | `PortalOfficeSettings` | Enable portal per office |
| **Cases** | `PortalCaseManagement` | View and manage all client cases |
| **Users** | `PortalUserSettings` | Client user accounts |
| **Audit Log** | `PortalAuditLog` | Access audit trail |

**`PortalCaseManagement` component features:**
- List all cases with status filter (open, in-progress, resolved, closed)
- Create cases on behalf of clients
- Case detail view with full timeline
- Staff-to-client messaging within threads
- AI "Suggest Reply" / "Summarize Thread" AI tools
- Document review and approval workflow
- Task creation assigned to client or staff
- Milestone management

### 22.5 Configuration Options

Configurable via `client_portal_settings`:
- Custom branding (logo, colors, welcome message)
- AI auto-reply toggle with confidence threshold
- OTP expiry duration
- Document versioning and approval workflow settings

**Tables:** `client_portal_settings`, `client_portal_users`, `client_portal_sessions`, `client_portal_otp_codes`, `client_portal_offices`, `client_portal_audit_logs`, `client_cases`, `client_case_milestones`, `client_case_status_history`, `client_threads`, `client_messages`, `client_documents`, `client_tasks`, `client_notifications`, `client_ai_interactions`

---

## 23. Module 21 — Telephony / IVR / Call Center

### 23.1 Overview

Integrated Twilio-powered telephony system for inbound/outbound calling, IVR menus, call queues, campaigns, and real-time monitoring.

**Provider:** Twilio (SIP trunking, PSTN, WebRTC)

### 23.2 Routes

| Route | Page | Description |
|-------|------|-------------|
| `/crm/calls` | `NumberMarketplacePage` | Browse/purchase phone numbers |
| `/crm/calls/numbers/:phoneId/ivr` | `IvrBuilderPage` | Visual IVR menu builder |
| `/crm/calls/usage` | `TelephonyUsagePage` | Usage stats and billing |
| `/crm/calls/recordings` | `CallRecordingsPage` | Recording library + playback |
| `/crm/calls/campaigns` | `CallCampaignsPage` | Outbound dial campaigns |
| `/crm/calls/queues` | `CallQueuesPage` | Call queue configuration |
| `/crm/calls/monitoring` | `CallMonitoringPage` | Live call monitoring dashboard |

### 23.3 Features

**Phone Numbers (Twilio Marketplace):**
- Browse available numbers by country/area code
- Provision numbers (`twilio-provision-number`)
- Release numbers (`twilio-release-number`)
- Search numbers (`twilio-search-numbers`)
- Org-level number management (`org_phone_numbers`)

**IVR (Interactive Voice Response):**
- Visual drag-and-drop IVR menu builder (`IvrBuilderPage`)
- IVR action handling via `twilio-ivr-action`
- Call queue routing (`call_queues`, `call_queue_members`)

**Outbound Calling:**
- Click-to-call from CRM contacts
- **Quick Dialer** — accessible from navigation bar
- Outbound call via `twilio-outbound-call`
- Real-time call monitoring via `twilio-monitor-call`

**Call Campaigns:**
- Outbound dial campaigns (`call_campaigns`)
- Campaign contact lists (`call_campaign_contacts`)
- Progressive/predictive dialing via `twilio-campaign-dial`

**Recordings:**
- Automatic call recording
- Recording webhook (`twilio-recording-webhook`)
- Recording library with playback (`call_recordings`)
- Recording settings per org (`call_recording_settings`)

**WebRTC Signaling:**
- Peer signaling data (`call_signaling`)
- Call participant tracking (`call_participants`)
- Active call sessions (`call_sessions`)

**Usage & Billing:**
- Per-call usage logging (`telephony_usage_logs`)
- Twilio webhook for call events (`twilio-webhook`)

**Settings:** `/org/:orgCode/settings/telephony` — Twilio API credentials, recording defaults, recording retention

**Edge Functions:** `twilio-provision-number`, `twilio-release-number`, `twilio-search-numbers`, `twilio-outbound-call`, `twilio-monitor-call`, `twilio-campaign-dial`, `twilio-ivr-action`, `twilio-recording-webhook`, `twilio-webhook`

**Tables:** `org_phone_numbers`, `call_sessions`, `call_participants`, `call_signaling`, `call_queues`, `call_queue_members`, `call_campaigns`, `call_campaign_contacts`, `call_recordings`, `call_recording_settings`, `telephony_usage_logs`

---

## 24. Module 22 — Org Settings & Administration

### 24.1 Organization Settings

**Route:** `/org/:orgCode/settings`

Tabs:
- **Organization** — name, logo, timezone, industry, size, work model
- **Offices** — office CRUD, location, schedules, leave types, attendance config
- **Departments** — department management
- **Positions** — position management with AI descriptions
- **Employment Types** — custom employment type configuration
- **Projects** — project management with lead assignment
- **KPI Settings** — update frequency, notification preferences
- **Workflows** — workflow template management (feature-gated)
- **Hiring** — pipeline stages, application form, email templates (feature-gated)
- **AI Knowledge** — knowledge source indexing configuration (feature-gated)
- **Billing** — plan, usage, invoices (owner only)

### 24.2 Office Management

Each office is an independent unit with:
- Name, location, timezone
- Office schedules (work hours per day)
- Leave types (with accrual rules)
- Attendance settings and exemptions
- QR codes for check-in
- Accounting ledger association
- Calendar events scoped to office
- Client portal configuration

### 24.3 Feature Flags

`organization_features` table enables/disables features per org. `is_feature_enabled()` function gates access. Route-level gating via `FeatureProtectedRoute` component.

**Tables:** `organizations`, `offices`, `departments`, `positions`, `employment_types`, `projects`, `organization_members`, `user_roles`, `organization_features`, `organization_coupons`, `push_subscriptions`, `notifications`

---

## 25. Module 23 — Billing & Subscriptions

### 25.1 Plans & Limits

- `subscription_plans` — define available plans with feature limits
- `plan_limits` — per-feature limits per plan (employees, storage, AI queries, etc.)
- `subscriptions` — org subscription record
- `check_feature_limit()` — enforces limits at DB level

### 25.2 Billing Features

- Current plan display
- Usage metrics vs limits (employees, storage, AI queries, leaves, attendance records)
- Invoice history
- Payment method management (`organization_payment_methods`)
- Billing contact information (`billing_contacts`)
- Stripe integration for payment processing
- Overage rate display

### 25.3 Coupons & Trials

- Coupon/promo code system (`coupons`, `organization_coupons`)
- Trial period management
- Dunning (payment recovery) management

**Tables:** `subscription_plans`, `subscriptions`, `plan_limits`, `payments`, `invoices`, `organization_payment_methods`, `billing_contacts`, `coupons`, `organization_coupons`, `usage_records`, `usage_alerts`

---

## 26. Module 24 — Super Admin

### 26.1 Overview

Platform-level administrative dashboard accessible only to `super_admin` role users.

### 26.2 Organization Management

- List all organizations with filters
- View org details (members, offices, billing, usage, activity)
- Edit org settings
- Manage org billing and plan changes
- Trial management (start, extend, expire)
- Dunning management
- Master access codes (`super_admin_master_codes`)

### 26.3 Analytics & Monitoring

| Dashboard | Description |
|-----------|-------------|
| **AI Analytics** | AI usage by org, feature adoption, query volumes |
| **Error Analytics** | Error frequency, severity, affected orgs |
| **Error Patterns** | Clustered error analysis, trend detection |
| **Activity Heatmap** | User activity visualization across platform |
| **Engagement Metrics** | Feature adoption rates, DAU/MAU |
| **Churn Risk** | Risk scoring per org with indicators |

### 26.4 Content Management

- Blog post management (create, edit, publish, SEO metadata)
- Blog keywords and tags
- Documentation/wiki template management
- Support article management (`support_articles`, `support_categories`)

### 26.5 AI Tools

- Bulk AI content generation for org templates
- AI test automation tools
- Coverage suggestion engine
- AI-assisted error resolution

### 26.6 Quality & Testing

- Visual regression detection (`visual_snapshots`)
- Test run management (`test_runs`, `test_results`)
- Test result filtering and history
- Error log investigation tools
- Linked tickets for bugs

### 26.7 Support System

- Support request management (`support_requests`)
- Priority levels: `low` | `medium` | `high` | `critical`
- Status: `new` → `triaging` → `in_progress` → `resolved` / `closed` / `wont_fix`
- Type: `bug` | `feature`
- Activity log and comments per request
- Screenshot capture and storage
- Error log linking

**Tables:** `super_admin_activity_logs`, `super_admin_master_codes`, `support_requests`, `support_request_comments`, `support_request_activity_logs`, `support_request_subscribers`, `support_articles`, `support_categories`, `support_screenshots`, `error_patterns`, `user_error_logs`, `coverage_reports`, `visual_snapshots`, `test_runs`, `test_results`, `security_test_runs`, `security_test_results`, `api_documentation`

---

## 27. Route Map

Complete list of all application routes.

### 27.1 Public / Marketing Routes (No Auth)

| Path | Component |
|------|-----------|
| `/` | Landing page |
| `/features` | Features page |
| `/about` | About page |
| `/pricing` | Pricing page |
| `/blog` | Blog listing |
| `/blog/:slug` | Blog post |
| `/careers` | Careers info |
| `/contact` | Contact page |
| `/terms`, `/privacy`, `/acceptable-use`, `/dpa`, `/cookies` | Legal pages |
| `/careers/:orgCode` | Public job board for org |
| `/careers/:orgCode/:jobSlug` | Public job detail |
| `/assignment/:token` | Token-gated assignment submission |
| `/f/:orgSlug/:formSlug` | Public form submission |
| `/s/:orgCode/scheduler/:eventSlug` | Public meeting booking |
| `/s/:orgCode/scheduler/cancel/:token` | Cancel booking |
| `/s/:orgCode/scheduler/reschedule/:token` | Reschedule booking |
| `/e/unsub/:token` | Email campaign unsubscribe |

### 27.2 Auth Routes

| Path | Component |
|------|-----------|
| `/auth` | Login (OTP / Google OAuth) |
| `/signup` | Org signup |
| `/join` | Join existing org |
| `/install` | App install |
| `/pending-approval` | Awaiting org approval |

### 27.3 Org-Scoped Routes (`/org/:orgCode/*`)

#### Core & HR

| Path | Module |
|------|--------|
| `/` | Home dashboard |
| `/team` | Employee directory |
| `/team/:id` | Employee profile |
| `/team/:id/attendance` | Employee attendance history |
| `/team/:id/reviews` | Employee performance reviews |
| `/team/offices` | Office management |
| `/team/bulk-import` | Bulk employee import |
| `/org-chart` | Organization chart |
| `/calendar` | Company calendar |
| `/leave` | Leave self-service |
| `/leave-history` | Org leave history |
| `/leave/import` | Bulk leave import |
| `/attendance-history` | Org attendance history |
| `/payroll` | Payroll management |
| `/my-payslips` | Employee payslips |
| `/onboarding` | Org onboarding wizard |
| `/onboarding/team` | Employee onboarding wizard |

#### Social & Collaboration

| Path | Module |
|------|--------|
| `/chat` | Team chat & spaces |
| `/wiki` | Knowledge base |
| `/wiki/edit/:pageId` | Wiki page editor |
| `/ask-ai` | AI assistant |
| `/tasks` | Task management |
| `/workflows` | Workflow instances |
| `/workflows/:workflowId` | Workflow detail |
| `/notifications` | Notifications center |
| `/notifications/preferences` | Notification preferences |

#### Performance & Analytics

| Path | Module |
|------|--------|
| `/growth` | KPI board |
| `/kpi-dashboard` | KPI dashboard |
| `/kpi/:kpiId` | KPI detail |
| `/kpi/bulk-create` | Bulk KPI creation |
| `/kpi/generation-history` | KPI AI generation history |

#### CRM (`/crm/*`)

| Path | Page |
|------|------|
| `/crm` | CRM dashboard |
| `/crm/contacts` | Contacts list |
| `/crm/contacts/:id` | Contact profile |
| `/crm/companies` | Companies list |
| `/crm/companies/:id` | Company profile |
| `/crm/scheduler` | Event scheduler |
| `/crm/scheduler/new` | Create event type |
| `/crm/scheduler/:id/edit` | Edit event type |
| `/crm/forms` | Forms list |
| `/crm/forms/new` | Create form |
| `/crm/forms/:formId/builder` | Form builder |
| `/crm/forms/:formId` | Form detail |
| `/crm/campaigns` | Email campaigns |
| `/crm/campaigns/new` | New campaign |
| `/crm/campaigns/templates` | Campaign templates |
| `/crm/campaigns/settings` | Campaign settings |
| `/crm/campaigns/:id` | Campaign setup |
| `/crm/campaigns/:id/builder` | Campaign builder |
| `/crm/campaigns/:id/report` | Campaign report |

#### Omnichannel Inbox (`/crm/inbox/*`)

| Path | Page |
|------|------|
| `/crm/inbox` | Unified inbox |
| `/crm/inbox/channels` | Channel management |
| `/crm/inbox/templates` | Message templates |
| `/crm/inbox/analytics` | Inbox analytics |

#### Telephony (`/crm/calls/*`)

| Path | Page |
|------|------|
| `/crm/calls` | Phone number marketplace |
| `/crm/calls/numbers/:phoneId/ivr` | IVR builder |
| `/crm/calls/usage` | Usage stats |
| `/crm/calls/recordings` | Recordings library |
| `/crm/calls/campaigns` | Call campaigns |
| `/crm/calls/queues` | Call queues |
| `/crm/calls/monitoring` | Live call monitoring |

#### WhatsApp (`/crm/whatsapp/*`)

| Path | Page |
|------|------|
| `/crm/whatsapp` | WhatsApp overview |
| `/crm/whatsapp/inbox` | WhatsApp inbox |
| `/crm/whatsapp/templates` | Message templates |
| `/crm/whatsapp/campaigns` | Campaigns list |
| `/crm/whatsapp/campaigns/new` | New campaign |
| `/crm/whatsapp/campaigns/:id` | Campaign report |
| `/crm/whatsapp/automations` | Automations |
| `/crm/whatsapp/flows` | WhatsApp flows |
| `/crm/whatsapp/contacts` | WhatsApp contacts |
| `/crm/whatsapp/sequences` | Message sequences |
| `/crm/whatsapp/settings` | WhatsApp settings |

#### Accounting (`/accounting/*`)

| Path | Page |
|------|------|
| `/accounting` | Accounting dashboard |
| `/accounting/setup` | Setup wizard |
| `/accounting/chart-of-accounts` | Chart of accounts |
| `/accounting/journals` | Journal entries |
| `/accounting/general-ledger` | General ledger |
| `/accounting/invoices` | Invoices list |
| `/accounting/invoices/new` | Create invoice |
| `/accounting/invoices/:invoiceId` | Invoice detail |
| `/accounting/invoices/:invoiceId/edit` | Edit invoice |
| `/accounting/bills` | Bills list |
| `/accounting/bills/new` | Create bill |
| `/accounting/bills/:billId` | Bill detail |
| `/accounting/bills/:billId/edit` | Edit bill |
| `/accounting/banking` | Bank accounts |
| `/accounting/bank-rules` | Bank reconciliation rules |
| `/accounting/reports` | Financial reports |
| `/accounting/reports/:reportId` | Report viewer |

#### Hiring (`/hiring/*`)

| Path | Page |
|------|------|
| `/hiring` | Hiring dashboard |
| `/hiring/jobs` | Job listings |
| `/hiring/jobs/new` | Create job |
| `/hiring/jobs/:jobSlug` | Job detail / pipeline |
| `/hiring/jobs/:jobSlug/edit` | Edit job |
| `/hiring/candidates` | Candidates list |
| `/hiring/candidates/:candidateId` | Candidate profile |
| `/hiring/applications/:applicationId` | Application detail |
| `/hiring/settings` | Hiring settings |
| `/hiring/settings/assignments/new` | Create assignment template |
| `/hiring/settings/assignments/:templateId/edit` | Edit assignment template |

#### Settings (`/settings/*`)

| Path | Page |
|------|------|
| `/settings` | Organization settings |
| `/settings/offices` | Office management |
| `/settings/projects` | Project management |
| `/settings/kpis` | KPI configuration |
| `/settings/workflows` | Workflow templates |
| `/settings/ai` | AI knowledge settings |
| `/settings/billing` | Billing & plan |
| `/settings/crm` | CRM settings |
| `/settings/hiring` | Hiring settings |
| `/settings/inbox` | Inbox settings |
| `/settings/telephony` | Telephony settings |
| `/settings/client-portal` | Client portal management |
| `/settings/workflow/:templateId` | Workflow template editor |

#### Client Portal (session-gated)

| Path | Audience |
|------|----------|
| `/portal/login` | External client login |
| `/portal/dashboard` | Client dashboard |
| `/portal/cases/:caseId` | Client case detail |
| `/portal/messages` | Client message threads |
| `/portal/profile` | Client profile |

### 27.4 Super Admin Routes (`/super-admin/*`)

| Path | Page |
|------|------|
| `/super-admin/analytics` | Platform analytics |
| `/super-admin/organisations` | All organizations |
| `/super-admin/organisations/:orgId` | Org detail |
| `/super-admin/users` | All users |
| `/super-admin/payments` | Payment management |
| `/super-admin/blog` | Blog management |
| `/super-admin/blog/new` | Create blog post |
| `/super-admin/blog/:postId/edit` | Edit blog post |
| `/super-admin/testing` | Testing tools |
| `/super-admin/customer-success` | Support requests |
| `/super-admin/customer-success/:requestId` | Request detail |
| `/super-admin/documentation` | API docs management |
| `/super-admin/error-logs` | Error log viewer |
| `/super-admin/error-logs/:errorId` | Error detail |
| `/super-admin/templates` | Org template management |
| `/super-admin/hiring-logs` | Hiring activity logs |
| `/super-admin/plans/new` | Create pricing plan |
| `/super-admin/plans/:planId/edit` | Edit pricing plan |

### 27.5 Support Routes

| Path | Page |
|------|------|
| `/support` | Support home |
| `/support/getting-started` | Getting started guide |
| `/support/faq` | FAQ |
| `/support/features` | Features documentation |
| `/support/features/:module` | Module documentation |
| `/support/features/:module/:slug` | Article detail |
| `/support/api` | API documentation |
| `/support/get-help` | Submit help request |

---

## 28. Edge Functions

197 Supabase Edge Functions (Deno/TypeScript) powering server-side logic.

### 28.1 AI & Content Generation (19)

| Function | Description |
|----------|-------------|
| `ai-chat-assist` | AI chat completions for Ask AI |
| `ai-writing-assist` | AI content writing helper |
| `ai-improve-subject` | Email subject line improvement |
| `ai-analyze-screenshot` | Screenshot analysis |
| `ai-suggest-screenshots` | Suggest app screenshots |
| `blocknote-ai-proxy` | AI proxy for BlockNote editor |
| `bulk-generate-kpis` | Batch KPI generation from AI |
| `bulk-generate-position-descriptions` | Batch position descriptions |
| `bulk-generate-employment-type-descriptions` | Employment type AI descriptions |
| `bulk-generate-wiki-content` | Batch wiki page generation |
| `bulk-generate-template-descriptions` | Template description generation |
| `call-ai-summary` | AI summary of call recordings |
| `generate-blog-posts` | Blog content generation |
| `generate-position-description` | Single position description |
| `generate-profile-summary` | Employee AI profile summary |
| `generate-review-draft` | Performance review AI draft |
| `generate-quote` | Quote generation |
| `generate-job-description` | Job posting description |
| `global-ask-ai` | Global AI assistant endpoint |

### 28.2 Authentication & Organization (13)

| Function | Description |
|----------|-------------|
| `send-otp` | Send OTP email |
| `verify-otp` | Verify OTP code |
| `sb-auth` | Supabase auth integration |
| `sb-sync-user` | Sync auth user to profile |
| `signup-organization` | New org registration |
| `approve-organization` | Super admin org approval |
| `reject-organization` | Super admin org rejection |
| `check-approval-status` | Check org approval status |
| `check-signup-email` | Email availability check |
| `delete-organization` | Delete org and all data |
| `get-auth-providers` | List enabled auth providers |
| `get-turnstile-config` | Cloudflare Turnstile config |
| `get-org-structure-templates` | Fetch org structure templates |

### 28.3 Team & Hiring (17)

| Function | Description |
|----------|-------------|
| `invite-team-member` | Send employee invite |
| `resend-invite` | Resend invite email |
| `delete-team-member` | Remove employee |
| `delete-orphaned-user` | Remove orphaned auth user |
| `list-orphaned-users` | Find orphaned auth users |
| `recover-orphaned-user` | Recover orphaned account |
| `get-invite-org-info` | Get org info for invite link |
| `suggest-positions` | AI position suggestions |
| `suggest-custom-department-positions` | Custom department positions |
| `suggest-org-structure` | AI org structure suggestions |
| `submit-public-application` | Public job application submission |
| `parse-resume` | AI CV/resume parsing |
| `convert-candidate-to-employee` | ATS → HRMS conversion |
| `send-bulk-hiring-email` | Bulk candidate email |
| `send-hiring-notification` | Hiring event notification |
| `send-offer-email` | Offer letter delivery |
| `generate-stage-email-templates` | AI email template generation |

### 28.4 Attendance & Leave (7)

| Function | Description |
|----------|-------------|
| `initialize-yearly-leave-balances` | Year-start balance setup |
| `migrate-leave-to-offices` | Leave type office migration |
| `notify-leave-decision` | Leave approval/rejection notification |
| `notify-leave-request` | New leave request notification |
| `process-attendance-adjustments` | Overtime → leave conversion |
| `backfill-not-checked-in` | Backfill missing check-in alerts |
| `capture-not-checked-in` | Daily not-checked-in capture |

### 28.5 Campaigns & Communications (15)

| Function | Description |
|----------|-------------|
| `send-campaign` | Send email campaign |
| `send-test-campaign-email` | Test campaign send |
| `process-scheduled-campaigns` | Scheduled campaign processor |
| `estimate-campaign-recipients` | Recipient count estimate |
| `track-campaign-event` | Email open/click tracking |
| `campaign-unsubscribe` | Handle unsubscribe |
| `custom-email` | General-purpose email send |
| `gmail-send` | Gmail API send |
| `gmail-sync` | Gmail inbox sync |
| `inbox-send` | Omnichannel outbound message |
| `inbox-webhook` | Incoming channel webhook |
| `inbox-ai-respond` | AI-assisted inbox reply |
| `send-contact-email` | CRM contact email |
| `wa-send-broadcast` | WhatsApp broadcast send |
| `resend-webhook` | Resend email webhook handler |

### 28.6 Client Portal (8)

| Function | Description |
|----------|-------------|
| `portal-send-otp` | Portal OTP generation + send |
| `portal-verify-otp` | Portal OTP verification |
| `portal-api` | Client portal data API |
| `portal-admin` | Staff portal management API |
| `portal-ai-assist` | AI assistant for portal clients |
| `create-portal-session` | Portal session creation |
| `generate-master-code` | Master access code for staff |
| `delete-master-code` | Revoke master access code |

### 28.7 Payments & Billing (6)

| Function | Description |
|----------|-------------|
| `stripe-webhook` | Stripe event handler |
| `create-checkout-session` | Stripe checkout |
| `charge-payment-method` | Charge stored payment method |
| `create-invoice-payment-link` | Stripe payment link for invoices |
| `process-dunning` | Failed payment retry logic |
| `process-trial-expirations` | Trial period management |

### 28.8 Scheduling & Calendar (10)

| Function | Description |
|----------|-------------|
| `create-scheduler-booking` | Create meeting booking |
| `cancel-scheduler-booking` | Cancel booking |
| `reschedule-scheduler-booking` | Reschedule booking |
| `get-scheduler-slots` | Available time slots |
| `send-scheduler-notification` | Booking confirmation/reminders |
| `google-calendar-auth` | Google Calendar OAuth |
| `google-calendar-proxy` | Google Calendar API proxy |
| `setup-employee-schedules` | Initialize work schedules |
| `setup-public-holidays` | Load public holidays |
| `generate-country-holidays` | AI holiday generation per country |

### 28.9 Telephony / Twilio (9)

| Function | Description |
|----------|-------------|
| `twilio-outbound-call` | Initiate outbound call |
| `twilio-webhook` | Twilio event handler |
| `twilio-ivr-action` | IVR menu action handler |
| `twilio-monitor-call` | Real-time call monitoring |
| `twilio-campaign-dial` | Campaign progressive dialing |
| `twilio-provision-number` | Purchase phone number |
| `twilio-release-number` | Release phone number |
| `twilio-search-numbers` | Search available numbers |
| `twilio-recording-webhook` | Recording event handler |

### 28.10 WhatsApp (5)

| Function | Description |
|----------|-------------|
| `wa-connect` | Connect WhatsApp account |
| `wa-webhook` | WhatsApp event handler |
| `wa-send` | Send WhatsApp message |
| `wa-template-sync` | Sync templates with BSP |
| `wa-run-automation` | Execute automation rules |

### 28.11 Knowledge & AI Indexing (10)

| Function | Description |
|----------|-------------|
| `index-ai-content` | Index content for AI |
| `index-knowledge` | Knowledge base indexing |
| `generate-embeddings` | Vector embedding generation |
| `auto-reindex-ai` | Scheduled knowledge reindexing |
| `generate-wiki-policy-templates` | AI wiki policy templates |
| `generate-wiki-sops` | AI SOP generation |
| `parse-document-content` | Document content extraction |
| `wiki-ask-ai` | Wiki-scoped AI queries |
| `generate-support-content` | AI support article generation |
| `improve-support-content` | AI support article improvement |

### 28.12 Notifications & Reminders (9)

| Function | Description |
|----------|-------------|
| `send-push-notification` | Web push notification |
| `send-chat-push-notification` | Chat message push |
| `send-checkin-reminder` | Attendance check-in reminder |
| `send-onboarding-reminders` | Employee onboarding nudges |
| `send-pending-invitations` | Pending invite reminders |
| `notify-team-onboarding-complete` | Onboarding completion notification |
| `notify-support-request-update` | Support ticket update |
| `post-acknowledgment-reminders` | Post acknowledgment reminders |
| `review-reminders` | Performance review reminders |

### 28.13 Forms & Public Submissions (5)

| Function | Description |
|----------|-------------|
| `form-public-submit` | Public form submission |
| `upload-assignment-file` | Assignment file upload |
| `send-assignment-otp` | Assignment OTP gate |
| `verify-assignment-otp` | Verify assignment OTP |
| `create-welcome-post` | Auto-create welcome post on join |

### 28.14 Payroll & Finance (1)

| Function | Description |
|----------|-------------|
| `calculate-payroll` | Payroll computation engine |

### 28.15 KPI & Analytics (3)

| Function | Description |
|----------|-------------|
| `generate-kpi-insights` | AI KPI performance insights |
| `start-kpi-generation` | Bulk KPI generation job |
| `suggest-kpi-content` | AI KPI suggestion |

### 28.16 Super Admin & Monitoring (10)

| Function | Description |
|----------|-------------|
| `analyze-error` | AI error root cause analysis |
| `notify-critical-error` | Critical error alerting |
| `run-security-tests` | Automated security test suite |
| `run-tests` | Automated test runner |
| `test-error-scenario` | Error scenario testing |
| `auto-capture-screenshots` | Visual regression capture |
| `capture-doc-screenshot` | Documentation screenshot |
| `capture-module-screenshots` | Module screenshot automation |
| `report-broken-link` | Broken link report |
| `scan-api-documentation` | API doc scanner |

### 28.17 Utility & Infrastructure (15)

| Function | Description |
|----------|-------------|
| `bulk-import-employees` | Bulk employee CSV import |
| `fetch-link-metadata` | URL metadata for link preview |
| `get-google-maps-key` | Maps API key |
| `get-vapid-public-key` | Push notification VAPID key |
| `daily-horoscope` | Daily horoscope generation |
| `prefetch-horoscopes` | Bulk horoscope prefetch |
| `save-org-structure-learning` | Save org structure ML data |
| `generate-coverage` | Test coverage generation |
| `fix-blog-seo` | Blog SEO improvement |
| `fix-test-with-ai` | AI test fix suggestions |
| `suggest-coverage-improvements` | Coverage gap suggestions |
| `generate-category-structure` | Category structure generation |
| `auto-close-expired-jobs` | Auto-close expired job postings |
| `update-user-email` | Update auth email |
| `get-help` | Help request submission |

---

## 29. Database Schema Summary

### 29.1 Schema Statistics

Derived from **478 migration files** (35,304 lines of SQL):

| Metric | Count |
|--------|-------|
| Total Tables | **322** |
| Custom Enums | **43** |
| Custom DB Functions | **142** |
| Triggers | **130+** |
| Tables with RLS Policies | **322** (all tables) |
| Indexed Tables | **229+** |

### 29.2 Table Count by Module

| Module | Tables |
|--------|--------|
| Accounting | 18 |
| AI / Knowledge | 12 |
| Attendance | 10 |
| Billing / Subscription | 10 |
| Calendar | 2 |
| Chat | 16 |
| Client Portal | 15 |
| CRM / Scheduler | 7 |
| Feed / Social | 20 |
| Hiring / ATS | 14 |
| HR / Employees | 14 |
| Inbox / Email | 14 |
| KPI / Performance | 10 |
| Leave | 8 |
| Onboarding / Templates | 14 |
| Payroll | 11 |
| Super Admin / Support / Monitoring | 20 |
| Tasks | 10 |
| Telephony | 7 |
| WhatsApp | 12 |
| Wiki | 14 |
| Workflow | 14 |
| Org / Settings / Auth / Misc | 20 |
| **Total** | **322** |

### 29.3 Key Enums

| Enum | Values |
|------|--------|
| `app_role` | `admin`, `hr`, `user`, `super_admin`, `owner`, `member` |
| `job_status` | `draft`, `submitted`, `approved`, `open`, `paused`, `closed` |
| `application_stage` | `applied`, `screening`, `assignment`, `interview_1..3`, `offer`, `hired`, `rejected` |
| `offer_status` | `draft`, `pending_approval`, `approved`, `sent`, `accepted`, `declined`, `expired` |
| `work_model` | `onsite`, `hybrid`, `remote` |
| `chat_space_type` | `collaboration`, `announcements`, `project` |
| `inbox_conversation_status` | `open`, `pending`, `snoozed`, `closed` |
| `accounting_invoice_status` | `draft`, `approved`, `sent`, `paid`, `partially_paid`, `overdue`, `voided` |
| `wiki_template_category` | `policies`, `sops`, `business_plans`, `hr_documents`, `compliance`, `operations` |
| `wa_campaign_status` | `draft`, `scheduled`, `sending`, `sent`, `failed`, `cancelled` |
| `support_request_priority` | `low`, `medium`, `high`, `critical` |
| `candidate_source` | `careers_site`, `internal`, `referral`, `manual`, `job_board`, `linkedin`, `other` |

### 29.4 Key RPC / Database Functions

| Function | Purpose |
|----------|---------|
| `has_role()` | Role-based access check |
| `is_org_member()` | Org membership verification |
| `is_manager_of_employee()` | Manager relationship |
| `can_view_employee_sensitive_data()` | HR/admin or self data access |
| `check_feature_limit()` | Plan-based feature enforcement |
| `get_birthday_calendar_data()` | Privacy-masked birthday data |
| `match_knowledge_embeddings()` | Semantic search for AI |
| `deduct_ai_tokens()` | AI usage billing |
| `get_unread_counts_batch()` | Efficient unread count retrieval |
| `get_last_messages_batch()` | Chat pagination |
| `create_workflow_from_template()` | Workflow instantiation |
| `calculate_prorated_leave_monthly()` | Prorated leave calculation |
| `get_employee_activity_timeline()` | Employee history |
| `record_remote_attendance()` | GPS check-in processing |
| `bulk_reassign_direct_reports()` | Org restructuring |
| `transfer_wiki_ownership()` | Wiki reassignment |
| `admin_exists()` | Bootstrap check for first admin |
| `calculate_kpi_rollup()` | Parent KPI aggregation |
| `calculate_trending_scores()` | Feed trending algorithm |
| `cleanup_expired_otps()` | OTP expiry housekeeping |
| `auto_generate_office_qr_code()` | QR provisioning trigger |
| `allocate_default_leave_balances()` | Auto-allocate leave on hire |
| `check_manager_circular_reference()` | Prevent circular manager chain |
| `create_ledger_entries_on_post()` | Double-entry accounting trigger |

### 29.5 Key Triggers (130+)

| Category | Examples |
|----------|---------|
| **Timestamp auto-update** | `update_[table]_updated_at` on every table |
| **Auto-provisioning** | QR codes on office create, space creator → admin, attendance settings on office create |
| **Validation** | Circular manager reference prevention |
| **Audit logging** | Activity log triggers on KPI, task, workflow, hiring entities |
| **AI indexing** | `on_ai_message_insert()` for knowledge base |
| **Accounting** | Ledger entries on journal post |
| **Auth** | `on_auth_user_created()` → profile auto-creation |
| **Leave** | `allocate_default_leave_balances()` on employee create |

---

## 30. Non-Functional Requirements

### 30.1 Performance

- **Virtualized lists** — `VirtualizedMessageList` for chat; `react-window` for large datasets
- **Code splitting** — all page components lazy-loaded via `React.lazy()`
- **React Query caching** — server state cached with configurable stale times
- **Batch API calls** — `get_last_messages_batch()`, `get_unread_counts_batch()` reduce round-trips
- **Supabase connection pooling** — via PgBouncer

### 30.2 Real-Time

- Supabase Realtime subscriptions on: chat messages, leave requests, attendance, WFH, calendar events, KPIs, notifications, feed reactions, workflow tasks
- Chat presence system (`chat_presence` table)

### 30.3 Mobile

- **PWA** — installable, offline support via Workbox service worker
- **Capacitor** — native iOS and Android builds
- **Mobile-optimized UI** — `useIsMobile()` hook drives layout switching; `MobileBottomNav`, `MobileMoreMenu`, `MobileSearch`, `PullToRefreshIndicator`
- **Push notifications** — web push via `push_subscriptions`; native push via Capacitor

### 30.4 Security

- **Row Level Security (RLS)** — enforced at database level on all tables
- **Passwordless auth** — OTP-based, no passwords stored
- **CAPTCHA** — Cloudflare Turnstile on auth after failed attempts
- **Token-gated public pages** — assignment submissions require token + email OTP
- **XSS prevention** — DOMPurify used for all user-generated HTML rendering
- **Audit trails** — activity logs on all sensitive entities
- **Error capture** — client errors logged to `user_error_logs`

### 30.5 Internationalization

- **Multi-timezone** — all timestamps stored UTC; displayed in user's office timezone
- **Multi-currency** — accounting and payroll support multiple currencies
- **India payroll engine** — statutory calculations for PF, ESI, PT, income tax
- **Date masking** — birthdays masked for privacy

### 30.6 Extensibility

- **Feature flags** — `organization_features` table enables per-org module activation
- **Custom fields** — CRM custom fields per org
- **Configurable pipelines** — hiring and CRM pipelines configurable per org
- **Custom leave types** — per-office leave type definitions
- **Workflow templates** — fully configurable process templates
- **Form builder** — custom forms for hiring application, client intake, etc.

### 30.7 Observability

- Client-side error capture with DB logging (`user_error_logs`)
- Error pattern clustering (`error_patterns`)
- Super admin error analytics dashboards
- API documentation system (`api_documentation`)
- User page visit tracking (`user_page_visits`)
- User activity logs (`user_activity_logs`)

---

*End of Document*
