

## Hide Internal Vacancies Card on Mobile

The `InternalVacanciesCard` currently appears in `HomeMobileLeaveSection.tsx`, which is the mobile-only section (wrapped in `lg:hidden`). To hide it on mobile, we simply remove the `InternalVacanciesCard` from that component.

### Change

**File: `src/components/home/HomeMobileLeaveSection.tsx`**
- Remove the `<Suspense>` wrapper and `<InternalVacanciesCard />` at the bottom of the component (lines 12 and 56-58)
- Remove the lazy import for `InternalVacanciesCard` (line 12)
- The card will still appear on desktop via `HomeSidebar`

This is a single, small deletion -- no other files affected.

