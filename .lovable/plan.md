
# Wiki Templates Management System for Super Admin

## Overview

This feature adds a new **Wiki Templates** tab to the Super Admin Templates Management system. Super Admins will be able to create, manage, and AI-generate wiki document templates that are then available to all organizations in their Wiki module.

---

## Template Categories

Wiki templates will be organized into the following categories:

| Category | Examples |
|----------|----------|
| **Policies** | Leave policies, Code of Conduct, Data Privacy, Remote Work, Anti-Harassment |
| **SOPs** | Business category-specific standard operating procedures |
| **Business Plans** | Strategic plans, Annual plans, Department-specific plans |
| **HR Documents** | Employee handbooks, Onboarding guides, Performance review guidelines |
| **Compliance** | Country-specific regulatory documents, GDPR, OSHA |
| **Operations** | Process documentation, Quality assurance, Safety procedures |

---

## Database Design

### New Table: `template_wiki_documents`

```text
id                    UUID PRIMARY KEY
category              TEXT (policies, sops, business_plans, hr_documents, compliance, operations)
subcategory           TEXT (e.g., 'leave', 'code_of_conduct', 'onboarding')
name                  TEXT NOT NULL
description           TEXT
content               TEXT (HTML content)
business_category     TEXT (null for universal, or specific like 'Healthcare')
country_code          TEXT (null for global, or 'US', 'UK', etc.)
icon_name             TEXT (lucide icon name)
tags                  TEXT[] (searchable tags)
sort_order            INTEGER
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

### New Table: `template_wiki_folders`

```text
id                    UUID PRIMARY KEY
name                  TEXT NOT NULL
parent_id             UUID (self-referential for nesting)
description           TEXT
icon_name             TEXT
business_category     TEXT (null for universal)
country_code          TEXT (null for global)
sort_order            INTEGER
is_active             BOOLEAN DEFAULT true
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
```

---

## Super Admin UI Components

### 1. New Tab in Templates Management

Add a "Wiki Templates" tab to the existing `SuperAdminTemplates.tsx` page:

**File:** `src/pages/super-admin/SuperAdminTemplates.tsx`
- Add new tab with `FileText` icon
- Render `TemplateWikiTab` component

### 2. Wiki Templates Tab Component

**File:** `src/components/super-admin/templates/TemplateWikiTab.tsx`

Features:
- Category filter dropdown (Policies, SOPs, Business Plans, etc.)
- Business category filter (from existing `BUSINESS_CATEGORIES`)
- Country filter (similar to Leave Types tab)
- Data table with columns: Name, Category, Business Type, Country, Status, Actions
- Add/Edit/Delete functionality

### 3. Wiki Template Editor Dialog

**File:** `src/components/super-admin/templates/WikiTemplateEditor.tsx`

Form fields:
- Name
- Category (dropdown)
- Subcategory
- Description
- Business category (optional, for industry-specific)
- Country (optional, for country-specific)
- Content (rich text editor using existing `WikiRichEditor`)
- Tags (comma-separated or chip input)
- Icon picker
- Active toggle

### 4. AI Wiki Template Tools

**File:** `src/components/super-admin/templates/AIWikiTemplateTools.tsx`

Three AI generation tools:
1. **Generate Policy Templates** - Create standard policies for selected countries
2. **Generate SOPs by Industry** - Create industry-specific procedures
3. **Generate Missing Content** - Fill content for templates with empty content

---

## Edge Functions for AI Generation

### 1. Generate Wiki Policy Templates

**File:** `supabase/functions/generate-wiki-policy-templates/index.ts`

Input:
- `policy_types`: array of policy types (leave, conduct, privacy, etc.)
- `country_code`: optional country for country-specific policies
- `business_category`: optional industry for industry-specific policies

Output:
- Creates template records with AI-generated content

### 2. Generate Wiki SOPs by Industry

**File:** `supabase/functions/generate-wiki-sops/index.ts`

Input:
- `business_category`: target industry
- `sop_types`: array of SOP types (optional, generates defaults if not provided)

Output:
- Industry-specific SOP templates with procedural content

### 3. Bulk Generate Wiki Template Content

**File:** `supabase/functions/bulk-generate-wiki-content/index.ts`

Input:
- `template_ids`: array of template IDs needing content

Output:
- Updates templates with AI-generated detailed content

---

## Wiki Page Integration

### Enhanced Templates Dialog

**File:** `src/components/wiki/WikiTemplatesDialog.tsx`

Changes:
- Fetch templates from database instead of hardcoded array
- Add category tabs/filters
- Show industry-specific templates based on org's business category
- Show country-specific templates based on org's country
- Combine database templates with built-in templates

### New Hook for Wiki Templates

**File:** `src/hooks/useWikiTemplates.ts`

Features:
- Fetch templates from `template_wiki_documents`
- Filter by organization's industry and country
- Merge with local built-in templates
- Cache with React Query

---

## Implementation Order

| Phase | Components |
|-------|------------|
| **Phase 1** | Database tables + RLS policies |
| **Phase 2** | Super Admin UI (tab, editor, table) |
| **Phase 3** | AI generation edge functions |
| **Phase 4** | AI tools UI components |
| **Phase 5** | Wiki page integration (enhanced dialog + hook) |

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/migrations/xxx_wiki_templates.sql` | Database tables + RLS |
| `src/components/super-admin/templates/TemplateWikiTab.tsx` | Main tab component |
| `src/components/super-admin/templates/WikiTemplateEditor.tsx` | Create/edit dialog |
| `src/components/super-admin/templates/AIWikiTemplateTools.tsx` | AI generation tools |
| `supabase/functions/generate-wiki-policy-templates/index.ts` | Policy generation |
| `supabase/functions/generate-wiki-sops/index.ts` | SOP generation |
| `supabase/functions/bulk-generate-wiki-content/index.ts` | Bulk content fill |
| `src/hooks/useWikiTemplates.ts` | Frontend template fetching |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/super-admin/SuperAdminTemplates.tsx` | Add Wiki Templates tab |
| `src/components/super-admin/templates/AITemplateTools.tsx` | Add wiki AI tools |
| `src/components/wiki/WikiTemplatesDialog.tsx` | Fetch from database + enhanced UI |

---

## Security Considerations

- Super Admin-only access for template management (existing pattern)
- Templates are read-only for organizations (no write policies)
- All organizations can SELECT from template tables
- AI generation functions protected by Super Admin check

---

## Expected Outcome

1. Super Admins can create and manage a library of wiki document templates
2. AI can bulk-generate policy documents by country and industry
3. Organizations see relevant templates when creating new wiki pages
4. Templates are categorized and filterable for easy discovery
