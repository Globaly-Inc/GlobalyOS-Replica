

## Make Logo Navigate to Public Website Home

### Problem
The GlobalyOS logo in the app header (`Layout.tsx`, line 117-122) currently calls `navigate("/")`, which redirects authenticated users back to their org dashboard via `RootRedirect`. The user wants the logo to open the public website landing page instead.

### Solution

**1. Add a dedicated `/home` route for the public landing page** (`src/App.tsx`)
- Add `<Route path="/home" element={<Landing />} />` alongside the other public website routes
- This gives the landing page a stable URL accessible regardless of auth state

**2. Update the logo button in `src/components/Layout.tsx`** (line 118)
- Change `onClick={() => navigate("/")}` to `onClick={() => navigate("/home")}`

### Technical Details

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/home` route pointing to the `Landing` page component (next to existing public routes, around line 308) |
| `src/components/Layout.tsx` (line 118) | Change `navigate("/")` to `navigate("/home")` |

This keeps the existing `/` root behavior (org redirect for authenticated users) intact while giving the logo a direct path to the public landing page.
