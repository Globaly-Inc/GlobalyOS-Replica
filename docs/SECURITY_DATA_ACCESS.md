# GlobalyOS Data Access Security Guide

## Overview

This document defines the security rules for accessing employee data in GlobalyOS. Following these patterns ensures that sensitive PII (Personally Identifiable Information) is never exposed to unauthorized users, even via browser DevTools or API inspection.

---

## Golden Rules

### 1. NEVER Query Sensitive Fields Directly from Tables

❌ **Prohibited:**
```typescript
// VULNERABLE - exposes salary to all org members
const { data } = await supabase
  .from('employees')
  .select('id, salary, date_of_birth')
  .eq('organization_id', orgId);
```

✅ **Approved:**
```typescript
// SECURE - uses RPC with field-level masking
import { getEmployeeForViewer } from '@/lib/secureDataAccess';
const data = await getEmployeeForViewer(employeeId);
```

### 2. Use Secure Views and RPC Functions

All employee data access MUST go through:
- **`employee_directory` view** - for lists (excludes sensitive fields)
- **`get_employee_for_viewer()` RPC** - for full profiles (masks fields based on viewer)
- **`get_position_history_for_viewer()` RPC** - for career history (masks salary)
- **`get_birthday_calendar_data()` RPC** - for birthdays (returns MM-DD only, not full DOB)

---

## Sensitive Field Classification

| Tier | Fields | Access Level |
|------|--------|--------------|
| **1 - Public** | name, avatar, position, department, office, join_date, email | All org members |
| **2 - Personal** | phone, personal_email, DOB, address, emergency contacts | Self + HR + Admin + Manager |
| **3 - Financial** | salary, remuneration, tax_number, id_number, bank_details | Self + HR + Admin ONLY |

---

## Approved Data Access Patterns

### Employee Lists / Directory

```typescript
import { getEmployeeDirectory } from '@/lib/secureDataAccess';

// For employee lists, team views, org charts
const employees = await getEmployeeDirectory(organizationId, 'active');
```

Or use the view directly:
```typescript
const { data } = await supabase
  .from('employee_directory')
  .select('id, full_name, position, department, avatar_url')
  .eq('organization_id', orgId);
```

### Full Employee Profile (with permissions)

```typescript
import { getEmployeeForViewer } from '@/lib/secureDataAccess';

// Returns all fields, with sensitive data masked based on viewer's role
const employee = await getEmployeeForViewer(employeeId);

// employee.salary will be NULL if viewer is not self/HR/admin
// employee.date_of_birth will be NULL if viewer is not self/HR/admin/manager
```

### Position/Career History

```typescript
import { getPositionHistoryForViewer } from '@/lib/secureDataAccess';

// Returns history with salary masked for unauthorized viewers
const history = await getPositionHistoryForViewer(employeeId);
```

### Birthday Calendar

```typescript
import { getBirthdayCalendarData } from '@/lib/secureDataAccess';

// Returns birthday_month_day (MM-DD) instead of full date_of_birth
const data = await getBirthdayCalendarData(organizationId);

// data[0].birthday_month_day = "05-20" (not "1990-05-20")
```

---

## Prohibited Patterns

### ❌ Direct Table Queries with Sensitive Fields

```typescript
// NEVER DO THIS
await supabase.from('employees').select('salary, date_of_birth, tax_number');
await supabase.from('position_history').select('salary');
```

### ❌ Exposing Full DOB for Calendar Features

```typescript
// NEVER DO THIS for birthday displays
await supabase.from('employees').select('date_of_birth');
// Use get_birthday_calendar_data() instead
```

### ❌ Trusting UI to Hide Data

```typescript
// The UI may hide data, but API response still exposes it!
// This is NOT secure:
{showSalary && <span>{employee.salary}</span>}
// Must also prevent salary from being in the API response
```

---

## Security Verification Checklist

Before submitting code that accesses employee data:

1. [ ] Does the code query `employees` table directly?
   - If yes, does it include any Tier 2 or Tier 3 fields?
   - If yes, replace with appropriate RPC function

2. [ ] Does the code query `position_history` table directly?
   - If yes, does it include `salary`?
   - If yes, replace with `get_position_history_for_viewer()`

3. [ ] Is the data for a calendar/birthday feature?
   - If yes, use `get_birthday_calendar_data()` instead of direct query

4. [ ] Check browser DevTools Network tab
   - API responses should NOT contain sensitive data for unauthorized viewers

---

## Implementation Details

### Database Functions

All secure RPC functions use `SECURITY DEFINER` with proper permission checks:

```sql
-- Example: get_birthday_calendar_data
CREATE FUNCTION public.get_birthday_calendar_data(org_id uuid)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is org member
  IF NOT is_org_member(auth.uid(), org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.id,
    to_char(e.date_of_birth, 'MM-DD') AS birthday_month_day,  -- Masked!
    ...
  FROM employees e
  WHERE e.organization_id = org_id;
END;
$$;
```

### Role-Based Access Control

Access is determined by database functions:
- `has_role(user_id, role)` - checks user roles (admin, hr, owner, member)
- `is_org_member(user_id, org_id)` - verifies organization membership
- `get_current_employee_id()` - gets viewer's employee ID for manager checks

---

## Adding New Secure Data Access

When adding new features that need employee data:

1. **Identify the data tier** (Public, Personal, or Financial)
2. **Choose the appropriate pattern:**
   - Public: Use `employee_directory` view
   - Personal/Financial: Create/use an RPC with field-level masking
3. **Add to `secureDataAccess.ts`** utility if it's a common pattern
4. **Update this documentation** with the new pattern
5. **Add tests** to verify the masking works

---

## Related Files

- `src/lib/secureDataAccess.ts` - Utility functions for secure data access
- `src/test/security/employees-sensitive-data.test.ts` - Security tests
- Database functions: `get_employee_for_viewer`, `get_position_history_for_viewer`, `get_birthday_calendar_data`
