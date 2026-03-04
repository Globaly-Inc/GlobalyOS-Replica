

## Candidate Profile Page Redesign

### Summary
Restructure the `ApplicationDetail.tsx` page to match the `TeamMemberProfile.tsx` layout pattern: a full-width profile header card at the top, followed by a two-column layout with activity logs on the left (1/3) and position-based application details on the right (2/3).

### Current State
- Current page has a simple header with back button + name + dropdown menu
- Layout is 2/3 main content (tabs: Overview, Assignments, Interviews, Offer, Activity) + 1/3 sidebar (candidate info card + quick actions)
- Activity log is buried inside a tab

### New Layout

```text
+------------------------------------------------------------+
| [← Back]                    [Schedule Interview] [Create   |
|                              Offer] [Convert] [More ▾]     |
+------------------------------------------------------------+
| PROFILE HEADER CARD (full width, matches TeamMemberProfile) |
| ┌──────┐  Name  [Active badge] [Internal badge]            |
| │Avatar│  Applied for Product Manager · Source: careers_site|
| │ 80px │  ✉ email  📞 phone                                |
| └──────┘  📍 location · 🔗 LinkedIn · Stage: [Selector]    |
+------------------------------------------------------------+
|                                                            |
| LEFT (1/3)              │  RIGHT (2/3)                     |
| ┌─────────────────────┐ │ ┌──────────────────────────────┐ |
| │ Activity Log        │ │ │ Tabs: [Product Manager] [+]  │ |
| │ (scrollable, all    │ │ │                              │ |
| │  hiring activity    │ │ │ Applied: 17 days ago         │ |
| │  for this candidate)│ │ │ Stage: Applied → ...         │ |
| │                     │ │ │                              │ |
| │ • Stage changed     │ │ │ ┌──── CV/Resume Card ─────┐ │ |
| │ • Interview sched.  │ │ │ └────────────────────────┐ │ |
| │ • Assignment sent   │ │ │ ┌── Assignments Card ────┐ │ |
| │ • Offer created     │ │ │ └────────────────────────┘ │ |
| │ • ...               │ │ │ ┌── Interviews Card ─────┐ │ |
| │                     │ │ │ └────────────────────────┘ │ |
| │                     │ │ │ ┌── Offer Card ──────────┐ │ |
| │                     │ │ │ └────────────────────────┘ │ |
| ├─────────────────────┤ │ └──────────────────────────────┘ |
| │ Candidate Details   │ │                                  |
| │ (Personal Details   │ │                                  |
| │  card like Team     │ │                                  |
| │  profile: phone,    │ │                                  |
| │  email, location,   │ │                                  |
| │  salary expectation,│ │                                  |
| │  linkedin, etc.)    │ │                                  |
| └─────────────────────┘ │                                  |
+------------------------------------------------------------+
```

### Header Actions (top-right, matching TeamMemberProfile pattern)
- **Schedule Interview** button
- **Create Offer** button
- **Convert to Employee** button (shown when offer accepted)
- **More** dropdown: Send Email, Move Stage, Reject, Download CV

### Profile Header Card
- Large avatar (h-28 w-28) with initials fallback
- Candidate name (bold, text-2xl)
- Status badges: Active/Rejected/Hired + Internal Candidate badge
- Applied position as link + source badge
- Contact info row: email, phone, location, LinkedIn
- Stage selector inline (like the current one but in the header)

### Left Column (1/3) - Two Cards
1. **Activity Log Card** - Full chronological activity feed (stage changes, interviews scheduled, assignments sent, offers created, emails sent, notes added). Uses the existing `useHiringActivityLog` hook with enhanced rendering showing actor avatars and richer formatting. No scroll area cap - shows all activity.

2. **Candidate Details Card** - Personal info (phone, email, location, salary expectation, LinkedIn, portfolio URL, source, applied date, cover letter excerpt, rating). Matches the Personal Details card style from TeamMemberProfile.

### Right Column (2/3) - Position Tabs
- Tab for each position the candidate has applied to (using `candidate_applications` filtered by `candidate_id`)
- Each tab shows:
  - Application summary (applied date, current stage, status)
  - CV/Resume card with upload and parse
  - Assignments card (templates + submissions)
  - Interviews card (collapsible, with meeting links and notes)
  - Offer card (with send/status)
- A "+" button to add another position (opens a dialog to select from open jobs)

### Technical Implementation

**Files to modify:**
- `src/pages/hiring/ApplicationDetail.tsx` - Complete rewrite of the layout

**New hooks/queries needed:**
- Query to fetch all applications for the same candidate (for multi-position tabs): filter `candidate_applications` by `candidate_id`

**Key patterns to replicate from TeamMemberProfile:**
- Header card: `Card className="p-4 overflow-hidden"` with flex layout
- Back button row with action buttons on the right
- Two-column grid: `grid grid-cols-1 lg:grid-cols-3 gap-4`
- Card sections with `px-5 py-4 bg-card border-b` headers and icon + title pattern
- Activity items with avatar circles and relative timestamps

**Data flow:**
- Use existing `useHiringApplication` for current application
- Add new query for sibling applications (same candidate, different jobs)
- Existing `useHiringActivityLog`, `useAssignmentInstances`, `useInterviews`, `useOffer` remain unchanged
- All dialogs (ScheduleInterview, CreateOffer, SendOffer, ConvertToEmployee, AssignmentPreview) remain as-is

