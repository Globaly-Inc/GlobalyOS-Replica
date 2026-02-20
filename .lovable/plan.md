

## Make IVR Builder Full-Page Without Navigation

### What changes

**1. Route: Remove Layout wrapper** (`src/App.tsx`)
- Add `withLayout={false}` to the IVR Builder route so it renders without the top nav, sub-nav, bottom nav, or any menu chrome.

**2. IVR Builder Page: Full viewport + mobile block** (`src/pages/crm/inbox/IvrBuilderPage.tsx`)
- Change the root container from `h-[calc(100vh-64px)]` to `h-screen` since there's no header offset.
- Add a mobile detection check using the existing `useIsMobile` hook.
- When on mobile, show a full-screen message telling the user the IVR Builder is only available on desktop, with a "Go Back" button.
- Update loading and error states to also use `h-screen`.

### Technical details

**File: `src/App.tsx` (line ~343)**
- Change the IVR route from default `OrgProtectedRoute` to `OrgProtectedRoute withLayout={false}`.

**File: `src/pages/crm/inbox/IvrBuilderPage.tsx`**
- Import `useIsMobile` from `@/hooks/use-mobile`.
- Early return a "desktop only" screen when `isMobile` is true.
- Root div: `h-screen` instead of `h-[calc(100vh-64px)]`.
- Loading/error skeletons already use `h-screen` so those are fine.

No database changes needed. No new files.

