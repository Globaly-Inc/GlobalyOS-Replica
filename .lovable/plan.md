
# Plan: Fix Churn Risk Indicators - Adjust Risk Detection Logic

## Analysis Summary

After investigating the database and code, I found that the Churn Risk feature is working correctly, but **no organizations currently meet the risk criteria**:

| Organization | Age (days) | Recent Activity | Previous Activity | Status |
|-------------|------------|-----------------|-------------------|--------|
| Alpha Venture Plus | 2 | 0 | 0 | Skipped (too new) |
| Geshan.com.np | 2 | 0 | 0 | Skipped (too new) |
| Aayushma & Associates | 3 | 36 | 0 | Skipped (too new) |
| Test | 3 | 0 | 0 | Skipped (too new) |
| Rudolph | 4 | 24 | 0 | Skipped (too new) |
| Kundalini Dental Clinic | 6 | 53 | 0 | Skipped (too new) |
| Grace International Group | 8 | 922 | 0 | Skipped (too new) |
| GlobalyHub | 52 | 15,146 | 11,277 | Healthy (activity UP) |

**Key findings:**
- 7 of 8 organizations are less than 14 days old and get skipped
- GlobalyHub has **growing** activity (+34%), so it's healthy
- The 14-day minimum age threshold is too strict for a new platform

---

## Proposed Fixes

### 1. Lower the Minimum Organization Age Threshold

Change from 14 days to **7 days** so newer organizations can be evaluated earlier.

### 2. Add Detection for Inactive New Organizations

Organizations with **zero activity in their first week** should show as at-risk (potential churn before they even start using the platform).

### 3. Add "Low Activity" Risk Detection

Flag organizations that have very low activity relative to their user count (e.g., less than 1 page visit per user per week).

### 4. Show "New" Organizations Separately

Instead of just skipping new organizations, show them in a separate section as "Onboarding" so you can monitor their activation.

---

## Technical Implementation

### File: `src/components/super-admin/ChurnRiskCard.tsx`

**Changes to risk calculation logic:**

```typescript
// Change threshold from 14 to 7 days
const orgAge = differenceInDays(now, new Date(org.created_at));
if (orgAge < 7) continue; // Reduced from 14

// NEW: Detect inactive new organizations (7-14 days old with zero activity)
if (orgAge >= 7 && orgAge < 14 && recent === 0) {
  riskLevel = 'high';
  reason = 'No activity since signup';
}

// NEW: Detect low engagement (active org but low usage)
if (riskLevel === 'healthy' && totalUsers > 0) {
  const visitsPerUser = recent / totalUsers;
  if (visitsPerUser < 5 && recent < 20) { // Less than 5 visits per user in 30 days
    riskLevel = 'low';
    reason = 'Low user engagement';
  }
}
```

### File: `src/hooks/useChurnRisk.ts`

**Update the shared hook with matching logic:**

```typescript
const calculateRiskLevel = (
  recentCount: number,
  previousCount: number,
  daysSinceActivity: number,
  orgAgeInDays: number
): { level: RiskLevel; reason: string } => {
  // New orgs (less than 7 days old) get a "new" label
  if (orgAgeInDays < 7) {
    return { level: 'new', reason: 'New organisation' };
  }

  // NEW: Inactive new org (7-14 days old with no activity)
  if (orgAgeInDays >= 7 && orgAgeInDays < 14 && daysSinceActivity >= 999) {
    return { level: 'high', reason: 'No activity since signup' };
  }

  // Rest of existing logic...
};
```

---

## Expected Results After Fix

With the adjusted thresholds, the following organizations would now show risk indicators:

| Organization | New Risk Level | Reason |
|-------------|----------------|--------|
| Grace International Group (8 days) | Evaluate normally | Will be assessed with regular criteria |
| Kundalini Dental Clinic (6 days) | New | Just below 7-day threshold |
| Organizations with 0 activity after 7 days | High | "No activity since signup" |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/super-admin/ChurnRiskCard.tsx` | Lower age threshold, add new risk detection logic |
| `src/hooks/useChurnRisk.ts` | Sync the shared hook with same logic changes |
