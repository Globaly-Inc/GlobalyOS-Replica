

# GlobalyOS Online Forms -- Full MVP Implementation Plan

## Summary

A no-code form builder module under CRM (`/org/:orgCode/crm/forms/...`) with drag-and-drop builder, conditional logic, formula calculations, public form rendering, submissions dashboard, share/embed, and optional Stripe payments.

---

## Architecture Overview

The forms module consists of:

- **Database**: 5 new tables (`forms`, `form_versions`, `form_submissions`, `form_submission_files`, `form_audit_logs`)
- **Edge Functions**: 3 new functions (`form-public-render`, `form-public-submit`, `form-stripe-checkout`)
- **Frontend**: ~30 new components under `src/components/forms/` and 5 new pages under `src/pages/crm/forms/`
- **Routes**: Org-scoped builder/list/detail + public form renderer

---

## Phase 1: Database Schema + Core Types

### Database Migration

```text
forms
  id (uuid PK)
  organization_id (uuid FK -> organizations)
  name (text)
  slug (text)
  status (text: draft | published | archived)
  published_version_id (uuid, nullable)
  settings (jsonb): access, password_hash, allowed_embed_domains[], open_at, close_at, rate_limit_policy, recaptcha_enabled, confirmation_message, redirect_url
  theme (jsonb): palette, typography, radius, shadows, custom_css
  created_by (uuid)
  created_at, updated_at (timestamptz)
  UNIQUE(organization_id, slug)

form_versions
  id (uuid PK)
  form_id (uuid FK -> forms)
  organization_id (uuid FK)
  version_number (int)
  layout_tree (jsonb): array of nodes (sections, fields, elements) with stable IDs
  logic_rules (jsonb): array of rule objects
  calculations (jsonb): formula definitions
  created_by (uuid)
  created_at (timestamptz)

form_submissions
  id (uuid PK)
  form_id (uuid FK -> forms)
  form_version_id (uuid FK -> form_versions)
  organization_id (uuid FK)
  answers (jsonb): { [fieldId]: value }
  computed (jsonb): { [calcId]: value }
  status (text: new | in_review | resolved | spam)
  assignee_user_id (uuid, nullable)
  tags (text[])
  notes (jsonb[])
  submitter_meta (jsonb): ip, user_agent, referrer, utm, domain
  payment (jsonb): provider, session_id, payment_intent_id, status, amount, currency
  submitted_at (timestamptz)
  created_at, updated_at (timestamptz)

form_submission_files
  id (uuid PK)
  submission_id (uuid FK)
  organization_id (uuid FK)
  field_id (text)
  storage_path (text)
  file_name (text)
  mime_type (text)
  file_size (bigint)
  created_at (timestamptz)

form_audit_logs
  id (uuid PK)
  form_id (uuid FK)
  organization_id (uuid FK)
  user_id (uuid)
  action (text): created, updated, published, deleted, settings_changed
  details (jsonb)
  created_at (timestamptz)
```

All tables will have RLS policies scoped by `organization_id` using the existing org membership pattern. The `form_submissions` table will also allow anonymous inserts for public form submissions (via edge function using service role).

### TypeScript Types

Create `src/types/forms.ts` with interfaces for:
- `Form`, `FormVersion`, `FormSubmission`, `FormField`, `FormElement`
- `LogicRule`, `LogicCondition`, `LogicAction`
- `FormulaDefinition`, `CalculatedValue`
- `FormTheme`, `FormSettings`
- Field types enum: `text`, `number`, `email`, `phone`, `dropdown`, `multi_select`, `checkbox`, `radio`, `date`, `file`, `formula`, `payment`
- Element types enum: `heading`, `subheading`, `paragraph`, `image`, `section`, `divider`

---

## Phase 2: Form Builder UI (Core)

### Routes (under `/org/:orgCode/crm/forms`)

| Route | Page | Description |
|-------|------|-------------|
| `/crm/forms` | FormsListPage | All forms with status filters |
| `/crm/forms/new` | FormBuilderPage | Create new form |
| `/crm/forms/:formId/builder` | FormBuilderPage | Edit existing form |
| `/crm/forms/:formId` | FormDetailPage | Submissions + analytics |

### Builder Layout (3-Panel)

```text
+------------------+----------------------------+-------------------+
|  Elements Panel  |     Canvas (Center)        |  Settings Panel   |
|  (240px)         |     (flex-1)               |  (320px)          |
|                  |                            |                   |
|  Search bar      |  Form title (editable)     |  Properties tab   |
|                  |                            |  Spacing tab      |
|  Basic Elements  |  Draggable field cards     |  Validation tab   |
|  - Heading       |  with grab handles         |  Logic tab        |
|  - Subheading    |                            |                   |
|  - Paragraph     |  Drop zones between        |                   |
|  - Image         |  elements                  |                   |
|  - Section       |                            |                   |
|  - Divider       |                            |                   |
|                  |                            |                   |
|  Fields          |                            |                   |
|  - Name          |                            |                   |
|  - Email         |                            |                   |
|  - Phone         |                            |                   |
|  - ... etc       |                            |                   |
|  + Custom Field  |                            |                   |
+------------------+----------------------------+-------------------+
|  [Theme]  [Preview]                    [Cancel]  [Save]  [Publish]|
+-------------------------------------------------------------------+
```

### Components

- `FormBuilderPage.tsx` -- orchestrator with state management
- `ElementsPalette.tsx` -- left panel with draggable element/field cards
- `FormCanvas.tsx` -- center panel with `@dnd-kit` sortable list
- `CanvasElement.tsx` -- renders each element/field in the canvas with selection, drag handle, delete
- `SettingsPanel.tsx` -- right panel with tabs
- `PropertiesTab.tsx` -- label, description, placeholder, column layout
- `SpacingTab.tsx` -- gap, padding controls
- `ValidationTab.tsx` -- required, min/max, regex, file constraints
- `LogicTab.tsx` -- per-field logic rule builder
- `FormBuilderToolbar.tsx` -- Theme, Preview, Cancel, Save, Publish buttons
- `ThemeDialog.tsx` -- color pickers, typography, radius
- `PreviewDialog.tsx` -- full-screen preview of the form

### State Management

Use React state (useReducer) for the builder, with:
- `layoutTree: FormNode[]` -- ordered array of elements/fields
- `selectedNodeId: string | null`
- `theme: FormTheme`
- `settings: FormSettings`
- Undo/redo stack (20 steps) via action history

---

## Phase 3: Logic Engine + Calculations

### Logic Rule Model

```text
LogicRule {
  id: string
  conditions: LogicCondition[]  // AND or OR group
  conditionOperator: 'and' | 'or'
  actions: LogicAction[]
}

LogicCondition {
  fieldId: string
  comparator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'is_empty' | 'is_not_empty'
  value: any
}

LogicAction {
  type: 'show' | 'hide' | 'require' | 'unrequire' | 'set_value'
  targetFieldId: string
  value?: any  // for set_value
}
```

### Logic Evaluator

Pure function `evaluateLogicRules(rules, currentValues)` returns a map of field states:
- `{ [fieldId]: { visible: boolean, required: boolean, setValue?: any } }`

### Formula Engine

- Parser for expressions like `SUM(field_a, field_b) * 1.1`
- Supported functions: `SUM`, `MIN`, `MAX`, `IF`, `ROUND`, `ABS`, `DATE_DIFF`
- Dependency graph to determine evaluation order
- `evaluateFormulas(formulas, fieldValues)` returns `{ [calcId]: computedValue }`

### Logic Rule Builder UI

- `LogicRuleBuilder.tsx` -- add/remove conditions, choose field/comparator/value, choose action
- `FormulaEditor.tsx` -- text input with field reference autocomplete
- `CalculatedSummaryBlock.tsx` -- invoice-like display element for the canvas

---

## Phase 4: Publish, Share, Embed

### Publish Flow

- Clicking "Publish" creates a new `form_version` snapshot (deep copy of current `layoutTree`, `logicRules`, `calculations`)
- Sets `forms.published_version_id` to the new version
- Sets `forms.status` to `published`

### Public Form Route

- `/f/:orgSlug/:formSlug` -- public route (no auth required)
- `PublicFormPage.tsx` -- fetches published version via edge function, renders form
- Mobile-first, fast-loading, minimal JS
- Confirmation screen after submit

### Share Dialog

- `ShareFormDialog.tsx`
  - Copy public link
  - Access controls: public / password-protected
  - Open/close date window
  - Embed snippets: iframe, responsive, popup modal
  - Domain allowlist for embedding

### Edge Function: `form-public-render`

- `GET` with `orgSlug` + `formSlug` params
- Returns published version layout, theme, settings (no auth required)
- Checks access controls (password, date window, domain)

### Edge Function: `form-public-submit`

- `POST` with form answers + submitter meta
- Validates answers server-side against field validation rules
- Runs calculations server-side
- Stores submission
- Rate limiting (per IP, configurable)
- Honeypot field check
- If payment field present, creates Stripe checkout session and returns URL

---

## Phase 5: Submissions Dashboard

### Submissions Table

- `FormSubmissionsTable.tsx` -- filterable table showing all submissions
- Columns: submitted date, status, key field values (first 3 fields), payment status
- Filters: date range, status, search keyword
- Bulk actions: export CSV, change status, assign

### Submission Viewer

- `SubmissionViewerDialog.tsx` -- full submission detail in a dialog
- Shows all answers, computed values, payment info
- Status change, tags, notes, assignment

### Analytics Summary

- `FormAnalyticsCard.tsx` -- views, starts, completions, drop-off rate
- Simple counters stored via `form_audit_logs` or computed from submissions

### Export

- CSV export via client-side generation (using existing patterns)
- Include all field values + computed + metadata

---

## Phase 6: Stripe Payment Integration

### Payment Field

- New field type `payment` in the builder
- Settings: fixed amount or "from calculation" (reference a formula field)
- Currency selector

### Checkout Flow

- When form has a payment field:
  1. Public submit creates a pending submission
  2. Edge function `form-stripe-checkout` creates a Stripe Checkout Session
  3. User redirected to Stripe Checkout
  4. On success, submission updated to `paid`
  5. Uses existing `stripe-webhook` edge function pattern for verification

### Edge Function: `form-stripe-checkout`

- Creates Stripe Checkout Session with `mode: 'payment'`
- Amount from fixed value or calculated total
- Success/cancel URLs redirect back to form confirmation page
- Webhook updates `form_submissions.payment.status`

---

## Phase 7: Navigation + Feature Flag + Final Wiring

### Navigation

- Add "Forms" to the CRM sub-navigation (`CRMSubNav.tsx`)
- Feature-flag gated (add `forms` to `FeatureName` type and `useFeatureFlags`)
- Add routes to `App.tsx` under the CRM section

### Storage Bucket

- Create `form-uploads` storage bucket for file field submissions
- RLS policies for org-scoped access

### Audit Logging

- Log form create, edit, publish, delete, settings changes
- Displayed in form detail page

---

## Files to Create (New)

| File | Purpose |
|------|---------|
| `src/types/forms.ts` | All form-related TypeScript types |
| `src/services/useForms.ts` | Data hooks (CRUD, submissions) |
| `src/services/useFormBuilder.ts` | Builder state management (useReducer) |
| `src/lib/formLogicEngine.ts` | Logic rule evaluator (pure functions) |
| `src/lib/formFormulaEngine.ts` | Formula parser and evaluator |
| `src/pages/crm/forms/FormsListPage.tsx` | Forms list |
| `src/pages/crm/forms/FormBuilderPage.tsx` | Builder orchestrator |
| `src/pages/crm/forms/FormDetailPage.tsx` | Submissions + analytics |
| `src/pages/public/PublicFormPage.tsx` | Public form renderer |
| `src/components/forms/ElementsPalette.tsx` | Left panel elements |
| `src/components/forms/FormCanvas.tsx` | Center drag/drop canvas |
| `src/components/forms/CanvasElement.tsx` | Individual canvas element |
| `src/components/forms/SettingsPanel.tsx` | Right panel container |
| `src/components/forms/PropertiesTab.tsx` | Field properties |
| `src/components/forms/SpacingTab.tsx` | Spacing controls |
| `src/components/forms/ValidationTab.tsx` | Validation rules |
| `src/components/forms/LogicTab.tsx` | Per-field logic rules |
| `src/components/forms/LogicRuleBuilder.tsx` | Logic condition builder |
| `src/components/forms/FormulaEditor.tsx` | Formula input |
| `src/components/forms/FormBuilderToolbar.tsx` | Top toolbar |
| `src/components/forms/ThemeDialog.tsx` | Theme editor |
| `src/components/forms/PreviewDialog.tsx` | Form preview |
| `src/components/forms/ShareFormDialog.tsx` | Share/embed dialog |
| `src/components/forms/FormSubmissionsTable.tsx` | Submissions list |
| `src/components/forms/SubmissionViewerDialog.tsx` | Submission detail |
| `src/components/forms/FormAnalyticsCard.tsx` | Analytics summary |
| `src/components/forms/PublicFormRenderer.tsx` | Renders form fields for public page |
| `src/components/forms/CalculatedSummaryBlock.tsx` | Invoice-like summary |
| `src/components/forms/PaymentFieldSettings.tsx` | Payment field config |
| `supabase/functions/form-public-render/index.ts` | Public form data endpoint |
| `supabase/functions/form-public-submit/index.ts` | Public submission endpoint |
| `supabase/functions/form-stripe-checkout/index.ts` | Stripe checkout for forms |

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add form routes |
| `src/hooks/useFeatureFlags.tsx` | Add `forms` feature flag |
| `src/components/FeatureProtectedRoute.tsx` | (auto via type change) |
| `src/components/crm/CRMSubNav.tsx` | Add Forms nav item |
| `src/services/index.ts` | Export form services |
| `supabase/config.toml` | Add edge function entries |

---

## Implementation Order

1. **Phase 1**: Database migration + types (foundation)
2. **Phase 2**: Builder UI with drag/drop (core experience)
3. **Phase 3**: Logic engine + calculations (pure functions + UI)
4. **Phase 4**: Publish + public form + share/embed
5. **Phase 5**: Submissions dashboard
6. **Phase 6**: Stripe payment field
7. **Phase 7**: Navigation wiring + feature flag + audit logs

Each phase builds on the previous one. Due to the size, implementation will span multiple messages, starting with Phases 1-2 (database + builder UI).

