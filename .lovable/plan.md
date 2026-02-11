

# Add Top Menu Bar with Organization Logo to Careers Page

## What Changes
A sticky top menu bar (100px height) will be added to the public Careers page (`/careers/:orgCode`), displaying the organization's logo centered in the middle. If no logo is set, the organization name will be shown as a fallback.

## Technical Approach

### File: `src/pages/careers/CareersPage.tsx`

1. **Add a query to fetch org details** -- A small `useQuery` call will fetch `name` and `logo_url` from the `organizations` table using the `orgCode` (slug) param. This reuses the same public access pattern already used by `usePublicJobs`.

2. **Add the menu bar** -- Insert a sticky `<header>` element before the Hero Section:
   - Height: `h-[100px]`
   - Sticky positioning: `sticky top-0 z-50`
   - White background with bottom border: `bg-white border-b`
   - Logo centered: `flex items-center justify-center`
   - Logo image constrained to `max-h-16 object-contain`
   - Fallback: Organization name in bold text if no logo URL exists
   - Further fallback: `Building2` icon if org data is still loading

3. **Layout structure after change:**
   ```text
   div (min-h-screen)
   +-- header (sticky, top-0, z-50, h-[100px], bg-white, border-b)
   |   +-- Logo image (centered) OR org name fallback
   +-- Hero Section (existing)
   +-- Search bar (existing)
   +-- Jobs list (existing)
   +-- Footer (existing)
   ```

4. **Imports needed:** Add `useQuery` from `@tanstack/react-query` and `supabase` client import.

### No database changes required
The `organizations` table already has `logo_url` and `name` columns, and the existing RLS policies allow public reads by slug (same pattern used by `usePublicJobs`).

