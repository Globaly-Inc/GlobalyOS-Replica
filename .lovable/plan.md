

# CRM Pipeline/Workflow Management System

## Overview

This is a major feature that transforms the existing HR-only workflow system into a universal CRM Pipeline management system. The new system will support contact-centric workflows (service applications, opportunities, lead management) with configurable stage requirements, win/loss tracking, and agent portal integration.

## Current State Analysis

The existing codebase has two separate workflow systems:
1. **HR Workflows** (`workflow_templates`, `workflow_stages`, `employee_workflows`) - tied to employees, used for onboarding/offboarding
2. **CRM Service Applications** (`service_applications`) - basic status-based tracking with no pipeline/stage concept

The new system needs to unify these into a **CRM Pipeline** concept that is contact-centric rather than employee-centric, with rich stage requirements.

---

## Architecture: New Tables

### Core Pipeline Tables

| Table | Purpose |
|-------|---------|
| `crm_pipelines` | Pipeline definitions (e.g., "Visa Application Pipeline", "Lead Pipeline") |
| `crm_pipeline_stages` | Stages within a pipeline, with sort order, color, and win/lost designation |
| `crm_stage_requirements` | Requirements per stage (tasks, documents, fields, forms, notes/questions) |
| `crm_deals` | Deal/Application instances - the active record moving through a pipeline |
| `crm_deal_services` | Junction table linking deals to one or more services |
| `crm_deal_requirements` | Instance-level requirement completion tracking per deal |
| `crm_deal_notes` | Notes and question-answer threads on a deal |
| `crm_deal_documents` | Document uploads per deal |
| `crm_deal_tasks` | Tasks generated from stage requirements, assigned to team/contact/agent |
| `crm_deal_activity_log` | Audit trail of all actions on a deal |
| `crm_deal_fees` | Product fees attached to a deal |
| `crm_deal_fee_instalments` | Fee instalment schedule |

### Key Design Decisions

**Pipeline vs Workflow naming**: Using "Pipeline" for the CRM system to differentiate from HR Workflows. The UI will call them "Pipelines" for admin config and "Deals/Applications" for active instances.

**Stage requirement types** (stored in `crm_stage_requirements`):
- `task` - A checklist task that must be completed
- `document` - A required document upload
- `field` - A required data field (e.g., date of birth, passport number)
- `form` - A linked form that must be submitted
- `note_question` - A question that must be answered as a note

**Requirement target audience** (`target_role`):
- `assignee` - The team member assigned to the deal
- `contact` - The CRM contact (client)
- `agent` - The partner/agent

**Stage types**:
- `normal` - Regular processing stage
- `win` - Success/completion stage (admin marks one stage as win)
- `lost` - Closed/lost (not a stage - tracked via deal status + reason)

---

## Database Schema (Migration)

```text
crm_pipelines
  id, organization_id, name, description, is_default,
  service_required (bool - false = opportunity/lead pipeline),
  sort_order, created_by, created_at, updated_at

crm_pipeline_stages
  id, pipeline_id, organization_id, name, description,
  color, sort_order, stage_type ('normal' | 'win'),
  auto_advance (bool), created_at, updated_at

crm_stage_requirements
  id, stage_id, pipeline_id, organization_id,
  requirement_type ('task' | 'document' | 'field' | 'form' | 'note_question'),
  title, description, is_required (bool),
  target_role ('assignee' | 'contact' | 'agent'),
  config (jsonb - field name, form_id, doc template, etc.),
  sort_order, created_at

crm_deals
  id, organization_id, pipeline_id, current_stage_id,
  contact_id (FK crm_contacts), company_id (FK crm_companies),
  assignee_id (FK employees), agent_partner_id (FK crm_partners),
  agent_user_id (FK partner_users),
  title, status ('active' | 'won' | 'lost' | 'cancelled'),
  priority ('low' | 'medium' | 'high'),
  lost_reason, lost_notes,
  expected_close_date, actual_close_date,
  deal_value, currency,
  source ('staff' | 'agent' | 'client_portal' | 'form'),
  created_by, created_at, updated_at

crm_deal_services
  id, deal_id, service_id, organization_id, created_at

crm_deal_requirements
  id, deal_id, stage_requirement_id, organization_id,
  status ('pending' | 'completed' | 'skipped' | 'waived'),
  completed_by, completed_at,
  response_data (jsonb - for fields/forms/notes),
  created_at, updated_at

crm_deal_notes
  id, deal_id, organization_id,
  author_type ('staff' | 'agent' | 'contact' | 'system'),
  author_id, content, is_internal (bool),
  requirement_id (nullable - links to a note_question requirement),
  created_at

crm_deal_documents
  id, deal_id, organization_id,
  requirement_id (nullable), file_name, file_path,
  file_type, file_size,
  uploaded_by_type ('staff' | 'agent' | 'contact'),
  uploaded_by, status ('pending' | 'approved' | 'rejected'),
  reviewer_notes, created_at

crm_deal_tasks
  id, deal_id, organization_id, stage_id,
  requirement_id (nullable),
  title, description,
  assignee_id (FK employees), assignee_type,
  target_role ('assignee' | 'contact' | 'agent'),
  status ('pending' | 'in_progress' | 'completed' | 'skipped'),
  due_date, completed_by, completed_at,
  sort_order, created_at, updated_at

crm_deal_activity_log
  id, deal_id, organization_id,
  action_type, actor_type, actor_id,
  entity_type, entity_id,
  old_value (jsonb), new_value (jsonb),
  description, created_at

crm_deal_fees
  id, deal_id, organization_id,
  fee_name, fee_type_id (nullable FK to system fee types),
  amount, currency, tax_amount, discount_amount,
  status ('pending' | 'invoiced' | 'paid' | 'waived'),
  created_at, updated_at

crm_deal_fee_instalments
  id, deal_fee_id, organization_id,
  instalment_number, amount, due_date,
  status ('pending' | 'paid' | 'overdue'),
  paid_at, created_at
```

### RLS Policies
All tables will have RLS enabled with `TO authenticated` policies using `is_org_member()` for SELECT and role-based checks for mutations. An explicit `anon` deny policy on each table.

### Indexes
Composite indexes on `(organization_id, pipeline_id)`, `(organization_id, contact_id)`, `(organization_id, status)`, `(deal_id, stage_requirement_id)` for high-traffic queries.

---

## UI Implementation Plan

### Phase 1: Admin Pipeline Configuration

**Location**: Settings > Pipelines (new settings sub-nav item)

- **Pipeline List**: Card-based list of pipelines with name, stage count, service required toggle
- **Pipeline Detail Page**: 
  - Pipeline info (name, description, service_required toggle)
  - Stages list with drag-to-reorder, color picker, and "Mark as Win stage" toggle
  - Per-stage expandable section showing requirements
  - Add Requirement dialog with type selector (Task, Document, Field, Form, Note/Question) and target role picker

### Phase 2: Deals/Applications Kanban + List

**Location**: CRM > Deals (new CRM sub-nav tab alongside Contacts, Products, Partners)

- **Kanban Board** (default view): Stages as columns, deal cards with contact name, value, assignee avatar, days-in-stage indicator. Drag-and-drop to move between stages.
- **List View** toggle: Table with filters (pipeline, status, assignee, date range, agent)
- **Start Deal dialog**: Select pipeline, contact, optional service(s), assignee, agent
- **Deal Detail Page** (full page, two-column layout):
  - Left: Deal header (title, contact, pipeline badge, stage indicator), tabbed content:
    - **Requirements**: Grouped by stage, showing completion status with actions
    - **Notes**: Threaded notes with internal/external toggle
    - **Documents**: Upload, review (approve/reject), link to requirements
    - **Tasks**: Task list with status, assignee, due dates
    - **Fees**: Fee table with instalment schedule
    - **Activity Log**: Full audit trail
  - Right sidebar: Deal info card (assignee, agent, contact, services, value, dates), stage progress indicator, quick actions

### Phase 3: Deal Close Flow

- **Win**: Move to win stage triggers a completion dialog (optional notes, actual close date)
- **Lost/Cancelled**: "Close Deal" dropdown with reason picker (predefined + custom), notes field
- **Reopen**: Allow reopening lost deals back to a selected stage

### Phase 4: Agent Portal Integration

- Extend existing agent portal to show deals where `agent_partner_id` matches
- Agent can view deal progress, upload documents, add notes, complete agent-targeted requirements
- Agent can start new deals for their customers

---

## Files to Create/Modify

### New Files (~25 files)

**Types:**
- `src/types/crm-pipeline.ts` - All pipeline/deal type definitions

**Services:**
- `src/services/useCRMPipelines.ts` - Pipeline CRUD hooks
- `src/services/useCRMDeals.ts` - Deal CRUD, stage movement, filtering hooks
- `src/services/useCRMDealMutations.ts` - Deal mutations (notes, docs, tasks, fees, requirements)

**Settings UI:**
- `src/pages/settings/SettingsPipelines.tsx` - Pipeline settings page
- `src/components/pipelines/PipelineSettings.tsx` - Pipeline list/management
- `src/components/pipelines/PipelineDetailSettings.tsx` - Pipeline detail with stages and requirements
- `src/components/pipelines/StageRequirementDialog.tsx` - Add/edit stage requirement dialog

**CRM Deal UI:**
- `src/pages/crm/DealsPage.tsx` - Deals list/kanban page
- `src/pages/crm/DealDetailPage.tsx` - Deal detail page
- `src/components/deals/DealKanbanBoard.tsx` - Kanban board component
- `src/components/deals/DealKanbanCard.tsx` - Kanban card component
- `src/components/deals/DealListView.tsx` - Table list view
- `src/components/deals/StartDealDialog.tsx` - Create new deal dialog
- `src/components/deals/DealRequirementsTab.tsx` - Requirements completion UI
- `src/components/deals/DealNotesTab.tsx` - Notes panel
- `src/components/deals/DealDocumentsTab.tsx` - Documents panel
- `src/components/deals/DealTasksTab.tsx` - Tasks panel
- `src/components/deals/DealFeesTab.tsx` - Fees and instalments panel
- `src/components/deals/DealActivityLog.tsx` - Activity log
- `src/components/deals/DealSidebar.tsx` - Right sidebar with deal info
- `src/components/deals/CloseDealDialog.tsx` - Win/Lost/Cancel dialog
- `src/components/deals/DealStageProgress.tsx` - Visual stage progress indicator

### Modified Files

- `src/components/crm/CRMSubNav.tsx` - Add "Deals" tab
- `src/components/settings/SettingsSubNav.tsx` - Add "Pipelines" entry
- Route configuration - Add new routes for pipeline settings and deal pages
- Agent portal pages - Add deal tracking views

---

## Industry Best Practices Incorporated

1. **Stage Gate Criteria**: Each stage has configurable exit requirements that must be met before progressing - following industry-standard stage-gate methodology
2. **Weighted Pipeline**: Deal value and stage tracking enable revenue forecasting
3. **Activity-Based Selling**: Every action is logged for coaching and compliance
4. **Multi-channel Source Tracking**: Deals track whether they came from staff, agent, portal, or form submission
5. **SLA Monitoring**: Days-in-stage tracking enables bottleneck detection
6. **Role-Based Requirements**: Different requirements for different stakeholders (staff vs client vs agent) mirrors real-world process delegation
7. **Opportunity-to-Deal Conversion**: Service-optional pipelines support lead/opportunity management that converts to service deals

## Implementation Sequence

Given the scope, this will be implemented in phases:
1. Database migration (all tables, RLS, indexes)
2. Admin pipeline configuration UI
3. Deal kanban board + list view
4. Deal detail page with all tabs
5. Close deal flow (win/lost)
6. Agent portal integration

