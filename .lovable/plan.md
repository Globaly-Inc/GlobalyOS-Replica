# Country-Specific Default Leave Days - Implementation Complete

## Summary

Implemented country-specific default leave days for template leave types with the following improvements:

---

## Completed Changes

### ✅ Priority 1 Fixes

1. **OfficeLeaveSettings.tsx** - Fixed template copy to use country-specific defaults
   - Now fetches office country and applies country overrides when copying templates

2. **OfficesStep.tsx** - Fixed race condition 
   - Added `customizedOffices` state to track manually edited leave types
   - Template defaults only apply to non-customized offices

3. **CountrySelector** - Added `excludeCountries` prop
   - Prevents duplicate country overrides in Super Admin UI

### ✅ Priority 2 Improvements

4. **Visual feedback in onboarding**
   - Toast notification when country changes: "Leave entitlements updated - Using [Country] default leave settings"
   - Info banner showing current country defaults: "Using 🇦🇺 Australia default leave entitlements"

5. **Country overrides sorted alphabetically**
   - TemplateLeaveTypesTab now sorts country defaults by name

6. **Flag emojis in filter dropdown**
   - Added flag emojis next to country names in the country filter

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/settings/OfficeLeaveSettings.tsx` | Updated `copyFromTemplates` to fetch country defaults and apply overrides |
| `src/components/onboarding/wizard/OfficesStep.tsx` | Added customization tracking, toast notifications, country info banner |
| `src/components/super-admin/templates/TemplateLeaveTypesTab.tsx` | Sorted overrides alphabetically, added flags to filter, exclude already-added countries |
| `src/components/ui/country-selector.tsx` | Added `excludeCountries` prop |

---

## User Experience

### Super Admin Flow
- Country overrides are sorted alphabetically for easy scanning
- Country selector filters out already-added countries
- Flag emojis in filter dropdown for visual consistency

### Organization Onboarding Flow
- Toast notification when country changes with updated leave defaults
- Info banner shows which country's defaults are being used
- Manual edits are preserved even if templates reload

### Post-Onboarding
- "Copy from Templates" now correctly applies country-specific defaults
