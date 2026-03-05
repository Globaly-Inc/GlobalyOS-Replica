

## Plan: Bidirectional CRM-Tasks Integration (Ideas 1 + 5)

### Part A: Link Tasks to CRM Contacts, Companies, and Deals

**1. Extend `RelatedToPopover.tsx`**
- Add `contact`, `company`, and `deal` to `ENTITY_TYPES`
- Create three new list components: `ContactList`, `CompanyList`, `DealList`
  - `ContactList`: query `crm_contacts` by org, display `first_name last_name`
  - `CompanyList`: query `crm_companies` by org, display `name`
  - `DealList`: query `crm_deals` by org, display `title`
- Update `EntityList` switch to route to these new components
- Update the `EntityType` union type accordingly

**2. Show CRM info card on `TaskDetailPage.tsx`**
- When `related_entity_type` is `contact`, `company`, or `deal`, render a small info card below the "Related to" badge
- Card shows key fields (name, email, phone, company for contacts; name, industry for companies; title, stage, value for deals) with a link to the CRM profile page
- Create a new `RelatedEntityCard.tsx` component that accepts `entityType` and `entityId`, fetches the relevant data (`useCRMContact`, `useCRMCompany`, or `useCRMDeal`), and renders the compact card
- Also update the `relatedLabel` display to show the entity name instead of just the type

### Part B: "Tasks" Tab on CRM Contact and Company Profile Pages

**3. Create `CRMLinkedTasks.tsx` component**
- Accepts `entityType` (`contact` | `company` | `deal`) and `entityId`
- Queries `tasks` table where `related_entity_type = entityType` and `related_entity_id = entityId`, scoped by org
- Displays a simple task list (title, status badge, priority, assignee avatar, due date)
- Clicking a task navigates to the task's space/list view
- Includes an "Add Task" button that opens `AddTaskDialog` with `related_entity_type` and `related_entity_id` pre-filled

**4. Update `AddTaskDialog.tsx`**
- Accept optional `defaultRelatedEntityType` and `defaultRelatedEntityId` props
- Pre-set `related_entity_type` / `related_entity_id` on the created task when provided

**5. Add "Tasks" tab to `CRMContactProfile.tsx`**
- The right column currently shows only the Activity Timeline
- Wrap it in a `Tabs` component with two tabs: "Activity" (existing timeline) and "Tasks" (new `CRMLinkedTasks`)

**6. Add "Tasks" tab to `CRMCompanyProfile.tsx`**
- Already has `Tabs` with "Contacts" and "Activity"
- Add a third "Tasks" tab rendering `CRMLinkedTasks` for the company

### Files Changed

| File | Change |
|------|--------|
| `src/components/tasks/RelatedToPopover.tsx` | Add contact, company, deal entity types and list components |
| `src/components/tasks/RelatedEntityCard.tsx` | New — compact CRM info card for task detail |
| `src/components/tasks/TaskDetailPage.tsx` | Render `RelatedEntityCard` when linked to CRM entity |
| `src/components/crm/CRMLinkedTasks.tsx` | New — task list for a CRM entity with add capability |
| `src/components/tasks/AddTaskDialog.tsx` | Accept optional related entity defaults |
| `src/pages/CRMContactProfile.tsx` | Add Tabs with Activity + Tasks |
| `src/pages/CRMCompanyProfile.tsx` | Add Tasks tab |

No database changes required — `tasks.related_entity_type` and `tasks.related_entity_id` columns already exist.

