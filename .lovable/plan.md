

## Show Internal Vacancies on Home Page Sidebar

### Overview
When a vacancy has "Show on internal job board" enabled and its status is `open`, it will appear as a card in the home page right sidebar (desktop) and in the mobile section, positioned below "On Leave Today." All org members will see these openings, encouraging internal mobility.

### New Component: `InternalVacanciesCard`
**File: `src/components/home/InternalVacanciesCard.tsx`**

A lazy-loaded card that:
- Fetches open jobs where `is_internal_visible = true` for the current org
- Displays each vacancy as a compact row with:
  - Job title (bold, clickable link to vacancy detail)
  - Department name and location/office as subtle metadata
  - Employment type badge (Full-time, Part-time, etc.)
  - Work model badge (Remote, Hybrid, On-site)
  - Posted date as relative time ("2 days ago")
- Header: Briefcase icon + "Open Positions" title with a count badge
- "View All" link to `/hiring` if more than 3 vacancies exist
- Shows max 3 vacancies in the sidebar; sorted by `published_at` descending (newest first)
- Empty state: card is hidden entirely (no "No openings" message), keeping the sidebar clean

### New Hook: `useInternalVacancies`
**File: `src/hooks/useInternalVacancies.ts`**

- Uses `useQuery` from TanStack React Query
- Query: `supabase.from('jobs').select('id, title, slug, employment_type, work_model, location, published_at, department:departments(name), office:offices(name, city)').eq('organization_id', orgId).eq('status', 'open').eq('is_internal_visible', true).order('published_at', { ascending: false }).limit(5)`
- Cache key: `['internal-vacancies', orgId]`
- Stale time: 5 minutes
- Returns `{ vacancies, isLoading }`

### Integration Points

**`src/components/home/HomeSidebar.tsx`:**
- Import and render `InternalVacanciesCard` below the "On Leave Today" card (line 175) and above "Upcoming Events" (line 178)
- Lazy-loaded with `Suspense` and `CardSkeleton` fallback

**`src/components/home/HomeMobileLeaveSection.tsx`:**
- Add `InternalVacanciesCard` below the "On Leave Today" card at the bottom of the mobile section

### Vacancy Card Click Behavior
- Clicking a vacancy title navigates to `/hiring/vacancies/:id` using `OrgLink`
- "View All" navigates to `/hiring` using `OrgLink`
- All links are internal SPA navigation (same tab)

### No Database Changes Required
- The `jobs` table already has `is_internal_visible` (boolean) and `status` columns
- RLS policies already scope queries to the user's organization
- No new tables or migrations needed

### Technical Details

**Query structure:**
```text
SELECT id, title, slug, employment_type, work_model, location, published_at,
       departments.name AS department,
       offices.name, offices.city AS office
FROM jobs
WHERE organization_id = :orgId
  AND status = 'open'
  AND is_internal_visible = true
ORDER BY published_at DESC
LIMIT 5
```

**Component hierarchy:**
```text
HomeSidebar
  +-- ... (existing cards)
  +-- On Leave Today card
  +-- InternalVacanciesCard (NEW - lazy loaded)
  +-- Upcoming Events card
  +-- ...
```

**UI design:**
- Card matches existing sidebar card style (p-6, rounded, same shadow)
- Briefcase icon in primary color for the header
- Each vacancy row: hover state with `bg-muted`, rounded-lg, p-2
- Badges use the same pill style as existing status badges
- Responsive: hidden on mobile via HomeSidebar (lg:block), separately rendered in HomeMobileLeaveSection for mobile

