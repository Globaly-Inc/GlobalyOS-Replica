
# Plan: Enhanced Churn Risk Indicators with Detailed Data and Navigation

## Overview
Enhance the Churn Risk feature to provide actionable insights for decision-making. This includes enriching the risk cards with comprehensive data, enabling navigation to organisation profiles, and displaying risk indicators in the organisations list.

---

## What Will Be Built

### 1. Enhanced ChurnRiskCard with Detailed Data

Each at-risk organisation card will display:

| Data Point | Description |
|------------|-------------|
| Organisation Name | Current ✓ |
| Risk Level Badge | Current ✓ (High/Medium) |
| Reason | Current ✓ (e.g., "No activity in 14 days") |
| Last Activity Date | Current ✓ |
| **Active Users** | Count of users who were active in last 30 days |
| **Total Users** | Total employees/members in the org |
| **Plan/Tier** | Current subscription plan (free/pro/enterprise) |
| **Owner/Admin** | Primary contact name |
| **Owner Email** | For quick outreach |
| **Industry** | Organisation's industry |
| **Company Size** | Size category |
| **Created Date** | When they joined |
| **Recent vs Previous Activity** | Visual comparison (e.g., "42 → 12 page views") |
| **Activity Trend Arrow** | Visual indicator of direction |

### 2. Clickable Cards with Navigation

- Each organisation card becomes fully clickable
- Clicking navigates to: `/super-admin/organisations/{orgId}`
- Hover state with cursor pointer and subtle elevation
- External link icon hint on hover

### 3. Churn Risk Column in Organisation List

Add a new "Risk" column to the organisation tables showing:
- Risk badge (High/Medium/Low/Healthy)
- Sortable by risk level
- Tooltip with quick reason on hover

---

## Technical Implementation

### File: `src/components/super-admin/ChurnRiskCard.tsx`

**1. Expand the ChurnRiskOrg interface:**

```typescript
interface ChurnRiskOrg {
  id: string;
  name: string;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  lastActivity: string | null;
  activityDrop: number;
  // New fields:
  recentActivityCount: number;
  previousActivityCount: number;
  totalUsers: number;
  activeUsers: number;
  plan: string;
  ownerName: string | null;
  ownerEmail: string | null;
  industry: string | null;
  companySize: string | null;
  createdAt: string;
}
```

**2. Fetch additional org data:**
- Join/fetch from `organizations` table: plan, owner_name, owner_email, industry, company_size, created_at
- Count from `employees` or `organization_members` for total users
- Count active users (users with activity in last 30 days) from `user_page_visits`

**3. Add navigation using `useNavigate`:**

```typescript
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

// On card click:
onClick={() => navigate(`/super-admin/organisations/${org.id}`)}
```

**4. Enhanced card layout:**
- Two-column grid inside each card
- Left: Org info (name, owner, plan)
- Right: Activity metrics (users, trend)
- Bottom: Reason and dates

### File: `src/pages/super-admin/SuperAdminOrganisations.tsx`

**1. Create a shared churn risk hook:**

Create a new hook or utility to calculate churn risk that can be reused:

```typescript
// src/hooks/useChurnRisk.ts
export interface ChurnRiskData {
  organizationId: string;
  riskLevel: 'high' | 'medium' | 'low' | 'healthy';
  reason: string;
  daysSinceActivity: number;
  activityDropPercent: number;
}

export const useChurnRisk = (organizationIds: string[]) => {
  // Returns a Map<orgId, ChurnRiskData>
};
```

**2. Add Risk column to OrganizationsTable:**

```typescript
// New column in table header
<TableHead>Risk</TableHead>

// In table row
<TableCell>
  <ChurnRiskBadge 
    level={riskData?.riskLevel || 'healthy'} 
    reason={riskData?.reason}
  />
</TableCell>
```

**3. Create ChurnRiskBadge component:**

```typescript
const ChurnRiskBadge = ({ level, reason }: { level: string; reason?: string }) => {
  const badgeConfig = {
    high: { variant: 'destructive', icon: AlertTriangle },
    medium: { className: 'bg-amber-500/20 text-amber-700', icon: AlertCircle },
    low: { variant: 'secondary', icon: null },
    healthy: { className: 'bg-emerald-500/20 text-emerald-700', icon: CheckCircle },
  };
  // Render badge with tooltip showing reason
};
```

### File: `src/hooks/useChurnRisk.ts` (New File)

A reusable hook that:
1. Takes an array of organisation IDs
2. Fetches activity data for all in parallel
3. Calculates risk levels using the same logic as ChurnRiskCard
4. Returns a Map for O(1) lookup in tables
5. Caches results using React Query

---

## UI/UX Enhancements

### ChurnRiskCard Enhanced Layout

```text
┌─────────────────────────────────────────────────────────┐
│ [Logo] Acme Corp                        [High Risk] 🔗  │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ Owner: John Smith (john@acme.com)                       │
│ Plan: Pro  •  Industry: Technology  •  Size: 11-50      │
│                                                         │
│ ┌──────────────────┐  ┌──────────────────┐             │
│ │ 📊 Activity      │  │ 👥 Users         │             │
│ │ 42 → 12 (-71%)   │  │ 8 active / 24    │             │
│ │ ↓ Declining      │  │ total            │             │
│ └──────────────────┘  └──────────────────┘             │
│                                                         │
│ ⚠️ No activity in 18 days                               │
│ Last seen: 14 Jan 2026  •  Joined: Aug 2025            │
└─────────────────────────────────────────────────────────┘
```

### Organisation List Risk Column

```text
| Organisation | Code | Status | Plan | Users | Risk     | Owner    | Created     |
|--------------|------|--------|------|-------|----------|----------|-------------|
| Acme Corp    | acme | Active | Pro  | 24    | ⚠️ High  | J. Smith | 15 Aug 2025 |
| Beta Inc     | beta | Active | Free | 12    | ✓ Healthy| M. Jones | 22 Sep 2025 |
```

---

## Data Fetching Strategy

### For ChurnRiskCard (Enhanced)

```typescript
// Fetch orgs with additional data
const { data: orgs } = await supabase
  .from('organizations')
  .select(`
    id, name, plan, created_at,
    owner_name, owner_email, industry, company_size
  `);

// For each org, also get:
// 1. Total users (employees count)
// 2. Active users (distinct users in user_page_visits last 30 days)
// 3. Recent/Previous activity counts (existing logic)
```

### For Organisation List (Optimised)

Since the list can have many orgs, we'll:
1. Fetch all orgs first (existing)
2. Batch fetch activity data for displayed orgs
3. Calculate risk in frontend
4. Use React Query caching to avoid recalculating

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/super-admin/ChurnRiskCard.tsx` | Modify - Add details, navigation, enhanced UI |
| `src/hooks/useChurnRisk.ts` | Create - Shared churn risk calculation hook |
| `src/components/super-admin/ChurnRiskBadge.tsx` | Create - Reusable badge component |
| `src/pages/super-admin/SuperAdminOrganisations.tsx` | Modify - Add Risk column to tables |

---

## Edge Cases Handled

- New organisations with no activity yet → Show "New" label instead of risk
- Organisations with very low previous activity → Don't flag as risky if previous < 10
- Clicked card loads quickly with optimistic navigation
- Missing owner data → Display "N/A" gracefully
- Performance: Limit to top 10 at-risk orgs in card, but show all in list

