

# UI/UX Review: Country-Specific Default Leave Days Implementation

## Summary

After reviewing all user flows in the implementation, I've identified several UI/UX improvements and missing features that would enhance the overall experience for both Super Admins and organization users.

---

## Issues & Improvements

### 1. Super Admin UI - Template Leave Types Tab

**Current State**: The country overrides section works but has some UX gaps.

**Improvements Needed**:

| Issue | Solution |
|-------|----------|
| No visual feedback for country defaults being applied | Add a tooltip or info message showing "These defaults will be applied during onboarding based on office location" |
| Country selector shows all countries even if already added | Filter out countries that already have an override |
| No sorting of country overrides | Sort by country name alphabetically for easier scanning |
| Missing flag emojis in the filter dropdown | Add flag emojis next to country names in the filter dropdown for visual consistency |
| No bulk actions for country defaults | Add "Remove All Overrides" button for cleanup |

---

### 2. Onboarding - OfficesStep

**Current State**: Country-specific defaults are fetched and applied when country changes, but the UX could be clearer.

**Improvements Needed**:

| Issue | Solution |
|-------|----------|
| No visual indicator that leave defaults changed due to country | Show a subtle toast or inline notification: "Leave entitlements updated for [Country]" |
| Leave types reset completely when country changes | Ask for confirmation if user has customized leave days before resetting |
| No indication of which countries have special defaults | Add an info icon with tooltip: "This office uses country-specific leave entitlements" |
| Template defaults loading race condition | The `useEffect` that re-applies template defaults (lines 386-398) overwrites ALL customizations when templates load - should only apply to non-customized values |

---

### 3. LeaveTypesCustomizer Component

**Current State**: Compact and functional but missing some features.

**Missing Features**:

| Feature | Description |
|---------|-------------|
| Custom leave types removed | The code references `customTypes` and `addCustomType` but the UI for adding custom leave types was removed |
| No description or help text | Users don't know what each leave type means |
| No visual distinction for country-applied defaults | Could show a small country flag or badge when defaults come from country templates |

---

### 4. Post-Onboarding - OfficeLeaveSettings

**Current State**: The "Copy from Templates" button doesn't use country-specific defaults.

**Bug Found** (lines 251-299): 
```typescript
// Current code fetches templates but doesn't include country_defaults
const { data: templates, error } = await supabase
  .from('template_leave_types')
  .select('*')  // Missing country_defaults join!
  .or('country_code.is.null,country_code.eq.')
  .eq('is_active', true)
  .order('sort_order');
```

This means copying templates post-onboarding won't apply country-specific defaults.

**Fix Required**: Update to use the same logic as `useCopyTemplatesToOffice` service.

---

### 5. Missing Features

#### A. Country Defaults Preview
- Super Admins should be able to preview what an organization in a specific country would see
- Add a "Preview for Country" dropdown that shows the effective leave days

#### B. Bulk Import/Export
- No way to bulk import country defaults (e.g., from CSV)
- Useful for setting up 50+ country overrides quickly

#### C. Audit Trail
- No logging of when country defaults were changed
- Important for compliance in regulated industries

#### D. Default Days Validation
- No validation that country-specific days don't exceed reasonable limits
- Could add min/max boundaries per leave type

---

## Recommended Changes

### Priority 1 (High Impact)

1. **Fix OfficeLeaveSettings.tsx** - Add country defaults to template copy function
2. **Fix race condition in OfficesStep** - Preserve user customizations when templates load
3. **Add country already-added filter** - Prevent duplicate country overrides

### Priority 2 (Medium Impact)

4. **Add visual feedback in onboarding** - Toast when country defaults apply
5. **Sort country overrides alphabetically** - Easier to scan
6. **Add flag emojis to filter dropdown** - Visual consistency

### Priority 3 (Nice to Have)

7. **Restore custom leave types UI** - Allow adding organization-specific types
8. **Add "Preview for Country" feature** - Super Admin preview mode
9. **Add confirmation dialog** - When changing country resets customized values

---

## Technical Implementation Notes

### Fix 1: OfficeLeaveSettings.tsx `copyFromTemplates`

Update to fetch country defaults and pass office country:

```typescript
const copyFromTemplates = async () => {
  // Get office country
  const { data: officeData } = await supabase
    .from('offices')
    .select('country')
    .eq('id', office.id)
    .single();
  
  const countryCode = officeData?.country;
  
  // Fetch templates WITH country defaults
  const { data: templates } = await supabase
    .from('template_leave_types')
    .select(`
      *,
      country_defaults:template_leave_type_country_defaults(
        country_code, 
        default_days
      )
    `)
    .is('country_code', null)
    .eq('is_active', true)
    .order('sort_order');
  
  // Apply country-specific defaults
  templates.map(t => {
    const countryOverride = countryCode && t.country_defaults
      ? t.country_defaults.find(cd => cd.country_code === countryCode)
      : null;
    
    return {
      ...t,
      default_days: countryOverride?.default_days ?? t.default_days,
    };
  });
};
```

### Fix 2: OfficesStep.tsx race condition

Add a "customized" flag to track user changes:

```typescript
const [userCustomizedLeaveTypes, setUserCustomizedLeaveTypes] = useState<Set<number>>(new Set());

// Only update leave types if not customized by user
useEffect(() => {
  if (templateDefaults.size > 0 && offices.length > 0) {
    setOffices(prevOffices => prevOffices.map((office, officeIndex) => {
      if (userCustomizedLeaveTypes.has(officeIndex)) {
        return office; // Preserve user customizations
      }
      // ... rest of logic
    }));
  }
}, [templateDefaults]);
```

### Fix 3: Filter already-added countries

```tsx
// In TemplateLeaveTypesTab.tsx
const availableCountries = COUNTRIES.filter(
  c => !countryDefaults.some(cd => cd.country_code === c.code)
);
```

---

## Visual Mockups

### Improvement: Country Override with Flag in Table

```text
| Name            | Category | Default Days           | Status | Actions
|-----------------|----------|------------------------|--------|--------
| Annual Leave    | Paid     | 20 days               | Active | [✏️][🗑️]
|                 |          | 🇦🇺 +20 🇬🇧 +28 🇩🇪 +24 |        |
```

### Improvement: Onboarding Feedback

```text
+-- Leave Settings (Head Office - Australia) ----------------+
| [ℹ️ Using Australian statutory leave entitlements]         |
|                                                            |
| Year Starts: [Jan 1 ▼]                        [Toggle ✓]  |
|                                                            |
| ✓ Annual Leave        [paid]    [20] days   🇦🇺            |
| ✓ Sick/Personal Leave [paid]    [10] days                 |
+------------------------------------------------------------+
```

