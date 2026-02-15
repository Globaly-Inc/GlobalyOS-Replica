

## Custom Pipeline Management

### What We're Building

A full pipeline management system where users can create multiple hiring pipelines (e.g., "Engineering Pipeline", "Sales Pipeline"), customize stage names, add/remove stages, and delete entire pipelines when they have no candidates.

### Database Changes

**New table: `org_pipelines`**

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Pipeline identifier |
| organization_id | UUID FK | Tenant isolation |
| name | TEXT | e.g. "Engineering Pipeline" |
| is_default | BOOLEAN | One default pipeline per org |
| sort_order | INT | Display ordering |
| created_at / updated_at | TIMESTAMPTZ | Timestamps |

**New table: `org_pipeline_stages`**

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID PK | Stage identifier |
| organization_id | UUID FK | Tenant isolation |
| pipeline_id | UUID FK | Parent pipeline |
| stage_key | application_stage ENUM | Underlying stage type (for compatibility) |
| name | TEXT | Custom display name (e.g. "Technical Screen" instead of "Screening") |
| color | TEXT | Stage color |
| sort_order | INT | Ordering within pipeline |
| is_active | BOOLEAN | Soft delete |

Both tables will have RLS policies scoped by organization_id.

### UI Changes to PipelineSettingsSection

The current section will be restructured into two parts:

```
Pipeline Settings
┌──────────────────────────────────────────────────────────┐
│ [+ Add Pipeline]                                         │
│                                                          │
│ ┌─ Engineering Pipeline ──────── [Edit Name] [Delete] ─┐│
│ │ Stages:                                               ││
│ │  1. Applied         [Rename] [Delete]                 ││
│ │  2. Technical Screen [Rename] [Delete]                ││
│ │  3. Interview 1     [Rename] [Delete]                 ││
│ │  4. Offer           [Rename] [Delete]                 ││
│ │  5. Hired           [Rename] [Delete]                 ││
│ │  [+ Add Stage]                                        ││
│ └───────────────────────────────────────────────────────┘│
│                                                          │
│ ┌─ Sales Pipeline ─────────────── [Edit Name] [Delete] ─┐│
│ │ ...                                                   ││
│ └───────────────────────────────────────────────────────┘│
│                                                          │
│ Pipeline Stage Rules (automation accordion, as before)   │
└──────────────────────────────────────────────────────────┘
```

**Key interactions:**
- **Add Pipeline**: Creates a new pipeline with default stages (Applied, Screening, ... Hired)
- **Edit pipeline name**: Inline editable text field
- **Add stage**: Select from available stage types (from the application_stage enum) and give it a custom name
- **Rename stage**: Inline edit the display name
- **Delete stage**: Only allowed if no candidates are currently at that stage in any job using this pipeline; shows confirmation dialog
- **Delete pipeline**: Only allowed if no jobs reference it or no candidates exist in it; shows confirmation dialog

### Files to Create/Modify

1. **Migration SQL** -- Create `org_pipelines` and `org_pipeline_stages` tables with RLS
2. **`src/components/hiring/PipelineSettingsSection.tsx`** -- Split into pipeline management (top) + automation rules (bottom, unchanged)
3. **`src/components/hiring/PipelineCard.tsx`** (new) -- Reusable card for a single pipeline showing its stages with edit/delete controls

### Technical Notes

- The `stage_key` column in `org_pipeline_stages` ties back to the existing `application_stage` enum, keeping compatibility with the rest of the hiring system (kanban board, application detail, etc.)
- Custom stage names will be stored in these new tables; existing code using `APPLICATION_STAGE_LABELS` continues to work as a fallback
- Delete checks will query the `applications` table to see if any candidates are at that stage before allowing deletion
- A default pipeline is auto-created for the org with all 8 standard stages if none exists

