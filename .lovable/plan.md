
# Plan: Redesign Hiring Page Layout to Match Attendance Pattern

## Overview
Redesign the Hiring page (`HiringDashboard.tsx`) to follow the Attendance page layout pattern while keeping Hiring-specific content and icons. The changes focus on:
- Updated header with Hiring-relevant icon and subtitle
- Inline sticky sub-navigation (Analytics, Jobs, Candidates tabs)
- **Keep existing Stats Cards Grid unchanged**
- Remove separate `HiringSubNav` component

---

## Current State

**Hiring Dashboard:**
- Simple header with "Analytics" title
- Action buttons: Settings, Careers Site, Create Job
- Four stats cards (Total Candidates, Active Jobs, Hires, Time to Fill)
- Charts section below

**Separate Component:**
- `HiringSubNav.tsx` renders as a standalone bar in `Layout.tsx`

---

## Proposed Changes

### 1. Header Section Update

**Current:**
```
Analytics
Track recruitment performance and identify opportunities
```

**Proposed:**
```
[UserPlus Icon] Hiring
Manage job postings, candidates, and recruitment pipeline
```

- Icon: `UserPlus` (represents adding/recruiting people)
- Title: "Hiring" (main module name)
- Subtitle: Hiring-focused description

### 2. Inline Sticky Filter/Tab Bar

Add a sticky bar below the header (matching Attendance pattern) containing:

```
+------------------------------------------------------------------+
| [Analytics] [Jobs] [Candidates]  |  [Filters section placeholder] |
+------------------------------------------------------------------+
```

**Tab Configuration:**
| Tab | Icon | Route/State |
|-----|------|-------------|
| Analytics | TrendingUp | Default view (charts) |
| Jobs | Briefcase | Jobs list |
| Candidates | Users | Candidates list |

The tabs will:
- Use URL-based state syncing (query param `?tab=analytics|jobs|candidates`)
- Match the visual style from Attendance (button group with `secondary`/`ghost` variants)
- Be wrapped in a slate-colored sticky container with backdrop blur

### 3. Stats Cards Grid

**No changes** - Keep the existing four metric cards exactly as they are:
- Total Candidates
- Active Jobs
- Hires This Month
- Avg. Time to Fill

### 4. Content Area

Below the stats cards:
- **Analytics tab**: Show existing charts (Hiring Funnel, Source of Hire, Time to Fill Trend, Assignment Performance)
- **Jobs tab**: Embed `JobsList` component
- **Candidates tab**: Embed `CandidatesList` component

---

## File Changes

### Files to Modify

**1. `src/pages/hiring/HiringDashboard.tsx`**
- Update header: icon from none to `UserPlus`, title to "Hiring", subtitle to hiring-focused text
- Add `activeTab` state with URL sync
- Add inline sticky tab bar matching Attendance style
- Keep existing stats cards unchanged
- Conditionally render content based on active tab
- Lazy load Jobs and Candidates components when those tabs are active

**2. `src/components/Layout.tsx`**
- Remove `HiringSubNav` import and component usage (lines 8, 150-151)

### Files to Delete

**3. `src/components/hiring/HiringSubNav.tsx`**
- Remove entirely as functionality moves inline to dashboard

---

## Technical Details

### State Management
```tsx
// URL-synced tab state
const [searchParams, setSearchParams] = useSearchParams();
const tabParam = searchParams.get('tab') as 'analytics' | 'jobs' | 'candidates' | null;
const activeTab = tabParam || 'analytics';

const handleTabChange = (tab: string) => {
  const newParams = new URLSearchParams(searchParams);
  newParams.set('tab', tab);
  setSearchParams(newParams, { replace: true });
};
```

### Header Structure
```tsx
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
      <UserPlus className="h-5 w-5 md:h-6 md:w-6" />
      Hiring
    </h1>
    <p className="text-sm text-muted-foreground">
      Manage job postings, candidates, and recruitment pipeline
    </p>
  </div>
  {/* Action buttons remain on right side */}
</div>
```

### Sticky Tab Bar Structure
```tsx
<div className="sticky top-0 z-10 bg-purple-50/80 dark:bg-purple-950/20 backdrop-blur-sm pb-2 -mt-2 pt-2 rounded-lg">
  <div className="flex items-center gap-2 flex-wrap bg-slate-300 dark:bg-slate-700 px-[5px] py-[5px] rounded-lg">
    {/* Tab Toggle */}
    <div className="flex items-center gap-1 border rounded-lg p-1 bg-background">
      <Button 
        variant={activeTab === 'analytics' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handleTabChange('analytics')}
        className="gap-1.5 h-7"
      >
        <TrendingUp className="h-4 w-4" />
        <span className="hidden sm:inline">Analytics</span>
      </Button>
      <Button 
        variant={activeTab === 'jobs' ? 'secondary' : 'ghost'}
        ...
      >
        <Briefcase className="h-4 w-4" />
        <span className="hidden sm:inline">Jobs</span>
      </Button>
      <Button 
        variant={activeTab === 'candidates' ? 'secondary' : 'ghost'}
        ...
      >
        <Users className="h-4 w-4" />
        <span className="hidden sm:inline">Candidates</span>
      </Button>
    </div>
  </div>
</div>
```

---

## Route Handling

- `/hiring` -> Dashboard with Analytics tab (default)
- `/hiring?tab=jobs` -> Dashboard showing Jobs tab
- `/hiring?tab=candidates` -> Dashboard showing Candidates tab
- `/hiring/jobs` and `/hiring/candidates` routes can optionally redirect to the tabbed view or remain as standalone pages

---

## Summary

| Component | Action |
|-----------|--------|
| `HiringDashboard.tsx` | Update header (icon + subtitle), add inline tabs, conditional content rendering |
| `Layout.tsx` | Remove HiringSubNav import and usage |
| `HiringSubNav.tsx` | Delete |
| Stats Cards | **No changes** |
| Charts | Remain under Analytics tab |
