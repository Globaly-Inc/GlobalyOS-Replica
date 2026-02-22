

## Service Categories: From Free-Text to Managed Categories

Currently, the Category field in Add Service dialog is a plain text input. We'll replace it with a proper category management system where organizations can select from predefined categories or create their own.

### Database Changes

**New table: `crm_service_categories`**
- `id` (uuid, PK)
- `organization_id` (uuid, FK to organizations, NOT NULL)
- `name` (text, NOT NULL)
- `slug` (text, NOT NULL)
- `description` (text, nullable)
- `icon` (text, nullable)
- `is_active` (boolean, default true)
- `sort_order` (integer, default 0)
- `is_default` (boolean, default false) -- marks system-seeded defaults
- `created_at` (timestamptz)

Unique constraint on `(organization_id, slug)` to prevent duplicate categories per org.

RLS policies: org members can read/insert/update/delete their own org's categories.

**Seed default categories per org via a database function**: When a new org is created (or on first access), default categories are inserted. These defaults are inspired by GlobalyApp's service categories and common CRM use cases:
- Visa Services
- Education / Courses
- Insurance
- Accommodation
- Health Services
- Financial Services
- Legal Services
- Translation Services
- Employment Services
- Other

Rather than a trigger on org creation, we'll use an "ensure defaults" approach -- the hook will call a DB function that inserts defaults only if the org has zero categories yet.

### Frontend Changes

**1. New hook: `useCRMServiceCategories`** (`src/services/useCRMServiceCategories.ts`)
- `useCRMServiceCategories()` -- fetches active categories for the current org
- `useCreateCRMServiceCategory()` -- creates a new category
- On first load, calls the "ensure defaults" RPC if no categories exist

**2. Update `AddServiceDialog.tsx`**
- Replace the free-text `Input` for category with a `Select` dropdown + "Create new" option
- When "Create new" is selected, show an inline input to type a new category name, which gets saved to `crm_service_categories` and then selected

**3. Update `ProductDetailPage.tsx`**
- Replace the free-text `Input` for category (in edit mode) with the same category `Select` component

**4. Update `ProductsPage.tsx`**
- Add a category filter dropdown that loads from `crm_service_categories`

**5. Update `useCRMServices.ts`**
- The `category` filter already works with text matching -- no change needed since `crm_services.category` will still store the category name as text (keeping it simple, no FK)

### Technical Details

- The `crm_services.category` column remains a text field (no schema change needed on that table)
- Categories are org-scoped, so each org manages their own list independently
- Default categories are seeded once per org via `ensure_crm_service_categories_defaults` RPC function
- The category name is stored as the value in `crm_services.category` (not the category ID), keeping backward compatibility with existing data
