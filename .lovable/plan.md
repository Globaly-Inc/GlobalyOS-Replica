
# Country-Specific Default Leave Days in Templates

## Overview

Add the ability for Super Admins to configure country-specific default leave days per leave type template. These defaults will automatically be applied during organization onboarding when offices are set up based on their country.

---

## Architecture

The solution uses a **country overrides table** linked to global leave type templates, rather than duplicating entire leave type records per country.

```text
+------------------------+         +------------------------------------+
| template_leave_types   |  1:N    | template_leave_type_country_defaults|
+------------------------+ ------> +------------------------------------+
| id                     |         | id                                  |
| name                   |         | template_leave_type_id (FK)         |
| country_code (null=    |         | country_code                        |
|   global)              |         | default_days                        |
| default_days (global   |         | created_at                          |
|   fallback)            |         +------------------------------------+
| ...                    |
+------------------------+
```

---

## Implementation Details

### 1. Database Migration

Create a new table `template_leave_type_country_defaults`:

```sql
CREATE TABLE public.template_leave_type_country_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_leave_type_id UUID NOT NULL 
    REFERENCES public.template_leave_types(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  default_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_leave_type_id, country_code)
);

-- RLS policies
ALTER TABLE public.template_leave_type_country_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template country defaults"
ON public.template_leave_type_country_defaults FOR SELECT USING (true);

CREATE POLICY "Super admins can manage template country defaults"
ON public.template_leave_type_country_defaults FOR ALL 
USING (public.is_super_admin());

-- Index for lookups
CREATE INDEX idx_template_country_defaults_type 
ON public.template_leave_type_country_defaults(template_leave_type_id);
```

---

### 2. Super Admin UI Updates

**File: `src/components/super-admin/templates/TemplateLeaveTypesTab.tsx`**

#### 2a. Add Interface and State

```typescript
interface CountryDefault {
  id?: string;
  country_code: string;
  default_days: number;
}

// Add state for country defaults
const [countryDefaults, setCountryDefaults] = useState<CountryDefault[]>([]);
const [showAddCountry, setShowAddCountry] = useState(false);
const [newCountryCode, setNewCountryCode] = useState("");
const [newCountryDays, setNewCountryDays] = useState(0);
```

#### 2b. Update Query to Fetch Country Defaults

```typescript
const { data: leaveTypes = [], isLoading } = useQuery({
  queryKey: ["template-leave-types", countryFilter],
  queryFn: async () => {
    let query = supabase
      .from("template_leave_types")
      .select(`
        *,
        country_defaults:template_leave_type_country_defaults(*)
      `)
      .order("country_code", { nullsFirst: true })
      .order("sort_order");
    // ... filtering logic
  },
});
```

#### 2c. Show Override Count in Table

Add a badge next to default_days showing count of country overrides:

```tsx
<TableCell>
  {type.default_days}
  {type.country_defaults?.length > 0 && (
    <Badge variant="outline" className="ml-2 text-xs">
      +{type.country_defaults.length} 🌍
    </Badge>
  )}
</TableCell>
```

#### 2d. Add Country Overrides Section in Edit Dialog

New section after "Default Days" field:

```text
+-- Country-Specific Default Days ------------------------+
| These override the default days for specific countries  |
|                                                         |
| 🇦🇺 Australia       [20] days  [🗑️]                    |
| 🇬🇧 United Kingdom  [28] days  [🗑️]                    |
| 🇮🇳 India           [12] days  [🗑️]                    |
|                                                         |
| [+ Add Country Override]                                |
+---------------------------------------------------------+

When "Add" clicked:
| [Country Selector ▼]  [Days Input] [✓] [✗]              |
```

#### 2e. Update Save Mutation

After saving/updating the leave type, sync country defaults:

```typescript
// After leave type save succeeds
if (editingType?.id) {
  // Get existing defaults
  const { data: existing } = await supabase
    .from("template_leave_type_country_defaults")
    .select("id, country_code")
    .eq("template_leave_type_id", editingType.id);
  
  // Delete removed ones
  const currentCodes = countryDefaults.map(c => c.country_code);
  const toDelete = existing?.filter(e => !currentCodes.includes(e.country_code));
  if (toDelete?.length) {
    await supabase
      .from("template_leave_type_country_defaults")
      .delete()
      .in("id", toDelete.map(d => d.id));
  }
  
  // Upsert current ones
  for (const cd of countryDefaults) {
    await supabase
      .from("template_leave_type_country_defaults")
      .upsert({
        template_leave_type_id: editingType.id,
        country_code: cd.country_code,
        default_days: cd.default_days,
      }, { onConflict: "template_leave_type_id,country_code" });
  }
}
```

---

### 3. Onboarding Integration

**File: `src/components/onboarding/wizard/OfficesStep.tsx`**

#### 3a. Fetch Templates with Country Defaults on Mount

When the OfficesStep loads, fetch global templates with their country defaults:

```typescript
const [templateDefaults, setTemplateDefaults] = useState<Map<string, Map<string, number>>>(new Map());

useEffect(() => {
  const fetchTemplates = async () => {
    const { data } = await supabase
      .from('template_leave_types')
      .select(`
        name,
        default_days,
        country_defaults:template_leave_type_country_defaults(country_code, default_days)
      `)
      .is('country_code', null)
      .eq('is_active', true);
    
    if (data) {
      const map = new Map<string, Map<string, number>>();
      data.forEach(t => {
        const countryMap = new Map<string, number>();
        countryMap.set('_global', t.default_days || 0);
        t.country_defaults?.forEach(cd => {
          countryMap.set(cd.country_code, cd.default_days);
        });
        map.set(t.name, countryMap);
      });
      setTemplateDefaults(map);
    }
  };
  fetchTemplates();
}, []);
```

#### 3b. Update Leave Types When Office Country Changes

When an office's country is changed (via address selection), update its leave type defaults:

```typescript
const handleAddressValueChange = (index: number, addressValue: AddressValue) => {
  setOffices(offices.map((office, i) => {
    if (i !== index) return office;
    
    const countryCode = addressValue.country;
    
    // Update leave types with country-specific defaults
    const updatedLeaveTypes = (office.leave_types || []).map(lt => {
      const templateMap = templateDefaults.get(lt.name);
      if (!templateMap) return lt;
      
      // Use country-specific default if available, otherwise global
      const countryDefault = templateMap.get(countryCode);
      const globalDefault = templateMap.get('_global');
      
      return {
        ...lt,
        default_days: countryDefault ?? globalDefault ?? lt.default_days,
      };
    });
    
    return {
      ...office,
      // ... existing address updates
      leave_types: updatedLeaveTypes,
    };
  }));
};
```

#### 3c. Initialize New Offices with Country Defaults

Update `getDefaultOfficeLeaveTypes` and `addOffice` to consider templates:

```typescript
const getDefaultOfficeLeaveTypes = (countryCode?: string): OfficeLeaveTypeConfig[] => {
  return getDefaultLeaveTypesConfig().map(lt => {
    const templateMap = templateDefaults.get(lt.name);
    let defaultDays = lt.default_days;
    
    if (templateMap && countryCode) {
      const countryDefault = templateMap.get(countryCode);
      const globalDefault = templateMap.get('_global');
      defaultDays = countryDefault ?? globalDefault ?? lt.default_days;
    }
    
    return {
      name: lt.name,
      category: lt.category,
      default_days: defaultDays,
      is_enabled: lt.is_enabled,
    };
  });
};
```

---

### 4. Post-Onboarding Template Copy

**File: `src/services/useOfficeLeaveTypes.ts`**

Update `useCopyTemplatesToOffice` to apply country-specific defaults:

```typescript
// Fetch templates with country defaults
const { data: templates } = await supabase
  .from('template_leave_types')
  .select(`
    *,
    country_defaults:template_leave_type_country_defaults(
      country_code, 
      default_days
    )
  `)
  .eq('is_active', true)
  .is('country_code', null)
  .order('sort_order');

// When inserting, check for country override
templates.map(t => {
  const countryOverride = t.country_defaults?.find(
    cd => cd.country_code === countryCode
  );
  
  return {
    office_id: officeId,
    organization_id: currentOrg.id,
    name: t.name,
    // Apply country-specific default if available
    default_days: countryOverride?.default_days ?? t.default_days,
    // ... other fields
  };
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| **Database Migration** | Create `template_leave_type_country_defaults` table with RLS |
| `src/components/super-admin/templates/TemplateLeaveTypesTab.tsx` | Add country overrides UI section, fetch with join, upsert on save |
| `src/components/onboarding/wizard/OfficesStep.tsx` | Fetch template defaults on mount, apply country-specific defaults when country changes |
| `src/components/onboarding/wizard/LeaveTypesCustomizer.tsx` | Accept optional `countryCode` prop for dynamic defaults (minor update) |
| `src/services/useOfficeLeaveTypes.ts` | Update `useCopyTemplatesToOffice` to use country overrides |

---

## User Experience Flow

### Super Admin Flow
1. Navigate to Templates → Leave Types
2. Click edit on "Annual Leave" (Global)
3. See global default of 20 days
4. Click "+ Add Country Override"
5. Select "Australia" and enter 20 days
6. Select "United Kingdom" and enter 28 days
7. Save changes
8. Table now shows "20 (+ 2 🌍)" indicating 2 country overrides

### Organization Onboarding Flow
1. User reaches Offices step
2. First office auto-filled with org address (e.g., Australia)
3. Leave types automatically show Australian defaults (e.g., Annual Leave = 20 days)
4. User adds second office in UK
5. UK office leave types automatically show UK defaults (e.g., Annual Leave = 28 days)
6. User can still manually adjust any values before saving

---

## Visual Preview

### Super Admin Edit Dialog
```text
+------------------------------------------------------------+
|                    Edit Leave Type                    [X]  |
+------------------------------------------------------------+
| Country: [Global (All Countries) ▼]  Category: [Paid ▼]   |
|                                                            |
| Name: [Annual Leave                                   ]    |
| Description: [Standard vacation leave...              ]    |
|                                                            |
| +-- Default Settings ------------------------------------+ |
| | Default Days: [20]  Min Advance: [2]  Max Neg: [0]    | |
| +--------------------------------------------------------+ |
|                                                            |
| +-- Country-Specific Default Days -----------------------+ |
| | Override the default days for specific countries       | |
| |                                                        | |
| | 🇦🇺 Australia           [20] days     [🗑️]            | |
| | 🇬🇧 United Kingdom      [28] days     [🗑️]            | |
| | 🇩🇪 Germany             [24] days     [🗑️]            | |
| | 🇮🇳 India               [12] days     [🗑️]            | |
| |                                                        | |
| | [+ Add Country Override]                               | |
| +--------------------------------------------------------+ |
|                                                            |
|                              [Cancel]  [Save Changes]      |
+------------------------------------------------------------+
```

### Onboarding Office Leave Types (Country-Aware)
```text
+-- Leave Settings (Australia Office) -----------------------+
| Year Starts: [Jan 1 ▼]                        [Toggle ✓]  |
|                                                            |
| ✓ Annual Leave        [paid]    [20] days   <- AU default |
| ✓ Sick/Personal Leave [paid]    [10] days                 |
| ✓ Long Service Leave  [paid]    [ 0] days                 |
| ✓ Substitute Leave    [paid]    [ 0] days                 |
| ✓ Unpaid Leave        [unpaid]  [ 0] days                 |
+------------------------------------------------------------+

+-- Leave Settings (UK Office) ------------------------------+
| Year Starts: [Apr 1 ▼]                        [Toggle ✓]  |
|                                                            |
| ✓ Annual Leave        [paid]    [28] days   <- UK default |
| ✓ Sick/Personal Leave [paid]    [10] days                 |
| ...                                                        |
+------------------------------------------------------------+
```
