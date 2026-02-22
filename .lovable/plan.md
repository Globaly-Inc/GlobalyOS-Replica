

# AI Generate PRD Button

Add an "AI Generate PRD" button to the PRD Documents tab that calls a new edge function to research and audit the feature's codebase, then generates a comprehensive PRD document following industry best practices.

## How It Works

1. Super Admin clicks "AI Generate PRD" on a feature's PRD tab
2. A new edge function (`generate-feature-prd`) is called with the feature name, label, and description
3. The AI (Lovable AI gateway) analyzes the feature context and generates a structured PRD in markdown
4. The edge function converts the markdown to a PDF (using a simple HTML-to-PDF approach via jsPDF or raw text PDF), uploads it to the `feature-prd-documents` storage bucket, and inserts a record into the `feature_prd_documents` table
5. The PRD list refreshes and the new document appears for preview/download

## PRD Content Structure

The AI-generated PRD will include industry-standard sections:
- Executive Summary
- Problem Statement and Goals
- User Personas and Use Cases
- Functional Requirements
- Non-Functional Requirements (performance, security, scalability)
- Data Model and API Design
- UI/UX Considerations
- Success Metrics and KPIs
- Dependencies and Risks
- Timeline and Milestones

## File Changes

### New Edge Function: `supabase/functions/generate-feature-prd/index.ts`

- Accepts `{ featureName, featureLabel, featureDescription }` in the request body
- Authenticates the caller via Supabase auth (must be logged in)
- Calls the Lovable AI Gateway (`google/gemini-3-flash-preview`) with a detailed system prompt instructing it to produce a comprehensive PRD
- Receives the PRD as markdown text
- Generates a simple PDF from the text content
- Uploads the PDF to `feature-prd-documents` bucket at `{featureName}/{uuid}.pdf`
- Inserts a row into `feature_prd_documents` with title, description, file path, and user ID
- Returns the new PRD record to the client

### Modified: `src/pages/super-admin/SuperAdminFeatureDetail.tsx`

- Add `Sparkles` icon import from lucide-react
- Add `generating` state (boolean) to track AI generation in progress
- Add `handleGeneratePrd` async function that:
  - Calls `supabase.functions.invoke('generate-feature-prd', { body: { ... } })`
  - On success, refreshes the PRD list
  - Shows toast on success/error
- Add "AI Generate PRD" button next to the existing "Upload PRD" button in the PRD tab header
  - Uses `Sparkles` icon with the `text-ai` class
  - Disabled while generating, shows spinner

### Update: `supabase/config.toml`

- Add `[functions.generate-feature-prd]` section with `verify_jwt = false`

## Technical Notes

- Uses Lovable AI (no extra API key needed -- `LOVABLE_API_KEY` is auto-provisioned)
- PDF generation happens server-side in the edge function using basic text-to-PDF conversion
- The PRD is scoped per feature, not per organization
- Generation may take 15-30 seconds due to AI processing; UI shows a loading state with progress indication

