

## Fix: Assignment Stage Email + Candidate Access Error

### Problem 1: No email sent when moved to Assignment stage

In `useUpdateApplicationStage` (line 370-437 of `useHiringMutations.ts`), the only email trigger is for `rejected` stage (line 417). There is **no logic** to:
- Auto-create an `assignment_instance` when a candidate moves to the `assignment` stage
- Trigger the `assignment_sent` email after that

**Fix**: After a successful stage update to `assignment`, look up `pipeline_stage_rules` for the job to find the `auto_assignment_template_id`. If found and `auto_assign_enabled` is true, auto-create an `assignment_instance` for the candidate, then trigger the `assignment_sent` email. If no rule exists, fall back to finding position-linked templates (same logic as `useAssignmentTemplatesForPosition`) and create instances for all matching templates.

### Problem 2: Candidate gets error when accessing assignment link

The edge functions `send-assignment-otp` and `verify-assignment-otp` search for `assignment_instances` matching `template_id` + candidate email. If no instance was auto-created (because Problem 1 exists), there's nothing to find → "No assignment found for this email" error.

This is a **direct consequence of Problem 1**. Once we auto-create assignment instances on stage change, the OTP flow will find them correctly.

### Implementation Plan

**File: `src/services/useHiringMutations.ts`** — `useUpdateApplicationStage` mutation

After the stage update succeeds and stage is `assignment`:
1. Fetch the application's `job_id` from the response
2. Query `pipeline_stage_rules` for that job + org where `stage_key = 'assignment'` and `auto_assign_enabled = true`
3. If a rule with `auto_assignment_template_id` exists, fetch the template details
4. If no rule, fall back to position-linked templates (query `assignment_templates` where `position_ids` contains the position matching the job title)
5. For each matching template, create an `assignment_instance` with a generated `secure_token`, default deadline (template's `default_deadline_hours`), and link to `candidate_application_id`
6. Trigger `assignment_sent` email for each created instance

**File: `supabase/functions/send-assignment-otp/index.ts`** — Minor robustness fix

No changes needed if Problem 1 is fixed. The existing template-mode lookup will find the auto-created instances.

### Technical Details

```
Stage change to "assignment"
  → Query pipeline_stage_rules for auto_assignment_template_id
  → OR fall back to position-linked templates
  → Create assignment_instance(s) for each template
  → Trigger assignment_sent email per instance
  → Candidate receives email with template public link
  → Candidate visits link → OTP flow finds their instance → works
```

### Files to Modify

| File | Change |
|------|--------|
| `src/services/useHiringMutations.ts` | Add auto-create instance + email trigger on assignment stage |

