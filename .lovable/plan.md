

## Remove Auto Assignment UI from Pipeline Card

Since assignments are now linked through position-connected templates (and the assignment link is available as an email placeholder), the "Auto Assignment" toggle in the pipeline stage configuration is redundant.

### Changes

**1. `src/components/hiring/PipelineCard.tsx`**
- Remove the entire "Auto Assignment" section (lines 740–762) — the `Zap` icon block with the `auto_assign_enabled` switch
- Remove the `hasAutoAssign` badge logic (line 411) used in the collapsed summary
- Remove `auto_assign_enabled` from the automation count check (line 905)

**2. `src/services/useHiringMutations.ts`**
- In `autoCreateAssignmentInstances`, remove Strategy 1 (lines 55–68) that checks `pipeline_stage_rules` for `auto_assign_enabled` + `auto_assignment_template_id`
- Keep only Strategy 2 (position-linked templates) as the sole method for finding templates on stage change

**3. `src/components/hiring/PipelineSettingsSection.tsx`**
- Remove `auto_assign_enabled` and `auto_assignment_template_id` from the rule defaults and upsert payloads (the DB columns remain but won't be used)

No database migration needed — the columns can stay unused without harm.

