

## Fix: Activity Log Not Refreshing After Logging

### Root Cause

In `useCreateCRMActivity` (`src/services/useCRM.ts`), the `onSuccess` handler conditionally invalidates cache:

```js
if (vars.contact_id) qc.invalidateQueries({ queryKey: ['crm-activities', vars.contact_id] });
if (vars.company_id) qc.invalidateQueries({ queryKey: ['crm-activities', null, vars.company_id] });
```

Two problems:
1. In `LogActivityDialog`, `contactId || undefined` converts `null` to `undefined`, and `undefined` properties are stripped by JSON serialization -- so `vars.contact_id` may not exist in the mutation variables, causing the invalidation to be skipped.
2. If neither `contactId` nor `companyId` is provided, **no invalidation runs at all**.

### Fix

**File: `src/services/useCRM.ts`** (lines 263-266)
- Replace the conditional invalidation with a broad invalidation of all `crm-activities` queries:
```js
onSuccess: () => {
  qc.invalidateQueries({ queryKey: ['crm-activities'] });
},
```
This uses prefix matching to invalidate every cached `crm-activities` query regardless of the contact/company ID combination, ensuring the timeline always refreshes.

**File: `src/components/crm/LogActivityDialog.tsx`** (lines 44-45)
- Change `contactId || undefined` to `contactId ?? undefined` and same for `companyId` to avoid falsy coercion issues (though the broader invalidation fix above is the primary fix).

### Files Changed

| File | Change |
|------|--------|
| `src/services/useCRM.ts` | Simplify `onSuccess` to broadly invalidate all `crm-activities` queries |
| `src/components/crm/LogActivityDialog.tsx` | Use nullish coalescing (`??`) instead of `||` for contact/company IDs |

