
## Add Top Menu Bar to Public Job Detail Page

### What
Add the same header bar (organization logo on the left, "Go to Website" button on the right) from the Careers listing page to the Job Detail public page.

### Changes

**1. `src/services/useHiring.ts` -- `usePublicJob` function (line 699)**
- Add `logo_url` and `website` to the org query: `.select('id, name, slug, logo_url, website')`
- Pass the org data along with the job so it's accessible in the component (attach it as `organization` on the returned object)

**2. `src/pages/careers/JobDetailPublic.tsx`**
- Import `ArrowRight` icon from lucide-react
- Add the same sticky top menu bar above the existing blue hero header:
  ```
  |  [Logo/Name]              [Go to Website ->]  |
  ```
- Use `job.organization` data (logo_url, name, website) to populate the menu bar
- The menu bar will use the same structure as CareersPage: sticky, white background, border-bottom, `container mx-auto px-4` inner wrapper for alignment
- No changes to any other part of the page
