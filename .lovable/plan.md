

## Drag-and-Drop Stage Reordering + Pipeline-to-Job Linking

### Overview

Two features in one:
1. **Drag-and-drop reordering** for pipeline stages using the existing `@dnd-kit/sortable` library (already used elsewhere in the project)
2. **Link pipelines to job postings** by adding a `pipeline_id` column to the `jobs` table and a pipeline selector in the Job Create/Edit forms

---

### 1. Database Changes

**Add `pipeline_id` to the `jobs` table:**

```text
ALTER TABLE public.jobs
  ADD COLUMN pipeline_id UUID REFERENCES public.org_pipelines(id) ON SET NULL;
```

This is nullable so existing jobs continue to work with the default pipeline fallback.

---

### 2. Drag-and-Drop Stage Reordering (PipelineCard.tsx)

**What changes:**
- Wrap the stages list in `DndContext` + `SortableContext` from `@dnd-kit/sortable`
- Convert each stage row into a sortable item using `useSortable` (the `GripVertical` icon already exists as a visual hint)
- On drag end, calculate the new sort order and call a new `onReorderStages` callback
- The parent (`PipelineSettingsSection`) will handle the database update: batch-update `sort_order` for all affected stages

**New prop on PipelineCard:**
```text
onReorderStages: (pipelineId: string, orderedStageIds: string[]) => void
```

**New mutation in PipelineSettingsSection:**
- `reorderStagesMutation`: loops through the ordered IDs and updates `sort_order` for each stage in `org_pipeline_stages`

---

### 3. Pipeline Selector on Job Create/Edit

**JobCreate.tsx changes:**
- Add `pipeline_id` to form state (default: empty / auto-select default pipeline)
- Add a `Select` dropdown in the "Basic Information" card labeled "Hiring Pipeline"
- Fetch available pipelines using the existing `useOrgPipelines` hook (extracted to a shared location or inlined)
- Pass `pipeline_id` through to `createJob.mutateAsync`

**JobEdit.tsx changes:**
- Same pipeline selector, pre-populated with the job's current `pipeline_id`

**useCreateJob mutation:**
- Already spreads `...input` into the insert payload, so `pipeline_id` will flow through automatically with no mutation code changes needed

**HiringKanbanBoard.tsx:**
- When a job has a `pipeline_id`, fetch its custom stages from `org_pipeline_stages` to display in the sidebar instead of the hardcoded `DEFAULT_STAGES` -- this already partially works via the `stages` prop

---

### Files to Create/Modify

| File | Change |
|------|--------|
| New migration SQL | Add `pipeline_id` column to `jobs` table |
| `src/components/hiring/PipelineCard.tsx` | Add `@dnd-kit/sortable` for stage drag-and-drop reordering |
| `src/components/hiring/PipelineSettingsSection.tsx` | Add `reorderStagesMutation` and pass `onReorderStages` to PipelineCard |
| `src/pages/hiring/JobCreate.tsx` | Add pipeline selector dropdown |
| `src/pages/hiring/JobEdit.tsx` | Add pipeline selector dropdown (pre-filled) |
| `src/integrations/supabase/types.ts` | Auto-updated with new column |

### Technical Notes
- `@dnd-kit/core` and `@dnd-kit/sortable` are already installed and used in multiple places (ApplicationFormSettings, FavoritesSection, WorkflowKanbanBoard)
- The reorder mutation will use individual updates in a loop (simple, reliable) rather than a batch RPC
- Existing jobs without a `pipeline_id` will continue using the org's default pipeline as a fallback

