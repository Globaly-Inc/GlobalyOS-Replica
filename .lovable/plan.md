
# Plan: Auto-save Super Admin Analytics Filters & Chart Settings

## Overview
Implement automatic persistence of all filter and chart view settings on the Super Admin Analytics page. Changes will be saved to localStorage automatically and restored on page reload. Settings will only reset when the user explicitly clears filters.

---

## What Will Be Saved

The following settings will be automatically persisted:

### Filter Settings
- Selected organisations
- Selected users  
- Date preset (last 7 days, last 30 days, etc.)
- Custom date range (start & end dates)

### Chart View Settings
- Organisation Growth: view mode (days/week/month) + cumulative toggle
- Users Growth: view mode + cumulative toggle
- Activities Over Time: view mode + cumulative toggle

### UI Preferences
- Expanded/collapsed module sections

---

## Implementation Approach

### 1. Create a Super Admin-specific Persistence Hook

Since the existing `usePersistedFilters` hook is organisation-scoped (uses `currentOrg.id` in the storage key), I'll create a new approach that works for Super Admin context where there's no "current org".

**Storage Key:** `super_admin_analytics_filters`

### 2. State Structure to Persist

```typescript
interface SuperAdminAnalyticsState {
  // Filter states
  selectedOrgs: string[];
  selectedUsers: string[];
  datePreset: DatePreset;
  customStartDate: string | null; // ISO string for storage
  customEndDate: string | null;
  
  // Chart view modes
  orgViewMode: ViewMode;
  userViewMode: ViewMode;
  activityViewMode: ViewMode;
  
  // Cumulative toggles
  showOrgCumulative: boolean;
  showCumulative: boolean;
  showActivitiesCumulative: boolean;
  
  // UI state
  openModules: string[];
}
```

### 3. Auto-save Behaviour

- Use a `useEffect` hook that watches all state values
- Debounce saves to avoid excessive localStorage writes (300ms delay)
- Save automatically whenever any setting changes
- No manual "save" button needed

### 4. Load on Mount

- On component mount, check localStorage for saved state
- Merge saved values with defaults (handle missing/new fields gracefully)
- Convert date strings back to Date objects

### 5. Clear Filters Behaviour

- When user clicks "X" to clear organisation/user filters, only those specific values reset
- To fully reset all settings, user can manually clear from browser or we can add an optional "Reset all" action

---

## Technical Changes

### File: `src/pages/super-admin/SuperAdminAnalytics.tsx`

1. **Add new state management logic:**
   - Create a custom hook `useSuperAdminAnalyticsState` or inline logic
   - Load initial state from localStorage with defaults fallback
   - Save state changes with debouncing

2. **Modify existing `useState` initialisers:**
   - Replace hardcoded defaults with values loaded from localStorage
   
3. **Add save effect:**
   ```typescript
   useEffect(() => {
     const timeoutId = setTimeout(() => {
       localStorage.setItem(STORAGE_KEY, JSON.stringify({
         selectedOrgs,
         selectedUsers,
         datePreset,
         customStartDate: customStartDate?.toISOString() || null,
         customEndDate: customEndDate?.toISOString() || null,
         orgViewMode,
         userViewMode,
         activityViewMode,
         showOrgCumulative,
         showCumulative,
         showActivitiesCumulative,
         openModules,
       }));
     }, 300);
     return () => clearTimeout(timeoutId);
   }, [/* all state dependencies */]);
   ```

4. **Add load logic on mount:**
   ```typescript
   const loadSavedState = () => {
     try {
       const saved = localStorage.getItem(STORAGE_KEY);
       if (saved) return JSON.parse(saved);
     } catch (e) {
       console.error('Failed to load analytics state:', e);
     }
     return null;
   };
   ```

---

## User Experience

| Action | Result |
|--------|--------|
| Change any filter/setting | Automatically saved (debounced 300ms) |
| Refresh page | All settings restored |
| Clear specific filter (X button) | Only that filter resets, others remain |
| Change view mode on chart | Saved automatically |
| Toggle cumulative | Saved automatically |
| Expand/collapse modules | Saved automatically |

---

## Edge Cases Handled

- **Invalid saved data**: Falls back to defaults
- **New settings added later**: Missing keys use defaults
- **Date parsing errors**: Falls back to default dates
- **Large storage**: State is small, no size concerns
