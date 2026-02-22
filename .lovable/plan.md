

# Tabbed Feature Detail with PRD Documents

Split the feature detail left column into three tabs and add a new PRD (Product Requirements Document) system where Super Admins can view AI-generated PRD PDFs.

## Tab Structure

```text
+--------------------------------------------------+
| [Overview]  [Organizations]  [PRD Documents]      |
+--------------------------------------------------+
| Tab content area                                  |
+--------------------------------------------------+
```

- **Overview** tab: Contains the existing stats cards (Orgs Enabled, Total Orgs, Adoption %)
- **Organizations** tab: Contains the existing org access list with toggles
- **PRD Documents** tab: New feature -- lists AI-generated PRD PDFs with timestamps, allows viewing/downloading

## Database Changes

**New table: `feature_prd_documents`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| feature_name | text | Links to feature registry |
| title | text | PRD document title |
| description | text (nullable) | Brief summary |
| file_path | text | Path in storage bucket |
| file_name | text | Original file name |
| generated_at | timestamptz | When the PRD was generated |
| created_by | uuid (nullable) | User who triggered generation |
| created_at | timestamptz | Row creation time |

**New storage bucket: `feature-prd-documents`** (public read for authenticated users)

**RLS policies:**
- Select: Authenticated users can read all PRD documents
- Insert/Update/Delete: Restricted (super admin only via service role or custom policy)

## File Changes

**`src/pages/super-admin/SuperAdminFeatureDetail.tsx`**

1. Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from UI
2. Wrap the left column content in a `Tabs` component with three tabs
3. Move the Overview card into `TabsContent value="overview"`
4. Move the Organization Access card into `TabsContent value="organizations"`
5. Add new `TabsContent value="prd"` with:
   - List of PRD documents fetched from `feature_prd_documents`
   - Each item shows: title, description, generated date, and download/preview buttons
   - Upload button for Super Admin to manually upload PRD PDFs
   - Empty state when no PRDs exist
   - Click to preview using the existing `DocumentPreviewDialog` component

**`src/pages/super-admin/SuperAdminFeatureDetail.tsx` -- PRD tab content:**

- Fetches PRDs from `feature_prd_documents` where `feature_name` matches
- Displays as a list of cards with file info and timestamp
- "Upload PRD" button opens a file input (PDF only)
- Uploaded files go to `feature-prd-documents` storage bucket
- Preview button opens `DocumentPreviewDialog` (already exists in the codebase)
- Download button triggers direct download

## Technical Notes

- Reuses existing `DocumentPreviewDialog` component for PDF preview
- Storage bucket path convention: `{feature_name}/{uuid}.pdf`
- PRD documents are scoped per feature, not per organization
- The tab state defaults to "overview"
- Right sidebar (Feature Type, Subscription Tiers, Internal Notes) remains unchanged outside tabs
