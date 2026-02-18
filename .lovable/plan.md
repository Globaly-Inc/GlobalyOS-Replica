
# Add Candidate Directly from Pipeline View

## What's Being Built

A new **"Add Candidate"** button on the Pipeline tab of the Job Detail page that opens a Dialog allowing the recruiter to:
1. **Search existing candidates** in the org (by name or email) — to link them to this job without re-entering data
2. **Or add a brand new candidate** (name, email, phone) and immediately apply them

The dialog pre-selects the **currently viewed stage** in the Kanban board as the initial stage, but lets the user change it via a dropdown.

---

## Approach

### Where the button lives
The button goes in `JobDetail.tsx` — on the same row as the `<TabsList>` for the Pipeline/Description/Activity tabs. It only shows when the Pipeline tab is active (and the job is not a draft).

### New Component: `AddCandidateToPipelineDialog`
A new Dialog component at `src/components/hiring/pipeline/AddCandidateToPipelineDialog.tsx`.

**Step 1 — Search or create:**
- Search input that queries existing candidates via `useCandidates()` filtered by org, showing name + email results in a dropdown list
- "New candidate" mode toggled when the user types a name that doesn't match any existing candidate, or clicks "+ Create new candidate"

**Step 2 — Stage selection:**
- Dropdown showing all pipeline stages for this job (uses the `stages` prop already passed to `HiringKanbanBoard`)
- Defaults to the currently selected stage in the Kanban board

**On submit:**
- If **existing candidate** selected: calls `useCreateApplication` with `{ candidate_id, job_id, stage }`
- If **new candidate**: calls `useCreateCandidate` first, then `useCreateApplication` with the new candidate's ID and chosen stage

**Note:** `useCreateApplication` currently inserts without a `stage` field. We'll pass stage in the mutation so the application starts at the correct stage (the `candidate_applications` table has a `stage` column).

---

## Files to Create

### `src/components/hiring/pipeline/AddCandidateToPipelineDialog.tsx`
- Props: `open`, `onOpenChange`, `jobId`, `stages`, `defaultStage`
- State: `mode` (`search` | `create`), `searchQuery`, `selectedCandidate`, `newCandidateName/Email/Phone`, `selectedStage`
- Uses: `useCandidates` (filtered search), `useCreateCandidate`, `useCreateApplication`
- Layout:
  ```
  [Dialog Header: Add Candidate to Pipeline]
  
  Stage: [dropdown — Applied / Screening / Assignment ...]
  
  --- Search existing ---
  [Search input: name or email]
  [Results list — click to select]
  
  --- Or ---
  [+ Create new candidate]
    Name *, Email *, Phone (optional)
  
  [Cancel]  [Add Candidate →]
  ```

---

## Files to Modify

### `src/pages/hiring/JobDetail.tsx`
- Import the new `AddCandidateToPipelineDialog`
- Add `addCandidateOpen` state
- Wrap `<TabsList>` and the button in a `flex items-center justify-between` row
- The button: `<Button size="sm"><UserPlus /> Add Candidate</Button>` — only shown when `resolvedTab === 'pipeline' && !isDraft`
- Pass `job.id`, `stages`, and the currently viewed stage from `HiringKanbanBoard` as `defaultStage`

### `src/components/hiring/pipeline/HiringKanbanBoard.tsx`
- Since `JobDetail` needs to know the currently selected stage (to pre-fill the dialog), expose it via an `onStageChange` callback prop: `onStageChange?: (stage: ApplicationStage) => void`
- Call it inside `setSelectedStage`

### `src/services/useHiringMutations.ts` (`useCreateApplication`)
- The `CreateApplicationInput` interface already has no `stage` field — add `stage?: ApplicationStage` to `CreateApplicationInput` in `src/types/hiring.ts` and pass it through in the mutation insert

---

## Technical Details

### Stage pre-selection flow
```
JobDetail
  ├── tracks selectedStage via onStageChange callback from HiringKanbanBoard
  └── passes it as defaultStage to AddCandidateToPipelineDialog

AddCandidateToPipelineDialog
  ├── initializes its own stage state from defaultStage
  └── user can change before submitting
```

### Candidate search
- Uses `useCandidates({ search: query })` — the existing hook already supports search filtering
- Only shows candidates who are **not already** in this job (filters out `applications.map(a => a.candidate_id)`)
- Debounced 300ms

### Mutation sequence for new candidate
```typescript
1. const candidate = await createCandidate.mutateAsync({ name, email, phone })
2. await createApplication.mutateAsync({ candidate_id: candidate.id, job_id, stage })
```

### No database migration needed
The `candidate_applications` table already has a `stage` column. We just need to include `stage` in the insert payload (currently the mutation omits it, defaulting to `'applied'`). Adding `stage` to `CreateApplicationInput` is a TypeScript-only change.
