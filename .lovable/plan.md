
# Plan: Redesign Churn Risk Indicators Card

## Design Analysis from Wireframe

The wireframe shows a cleaner, more structured layout with:

1. **Header Section**: "Churn Risk Indicators" title
2. **Summary Stats Row**: Three metric cards showing risk counts with trends
3. **High Risk Customers List**: Simple, scannable rows with avatar, org/owner name, and join date

---

## Proposed New Layout

```text
+----------------------------------------------------------+
|  Churn Risk Indicators                                    |
+----------------------------------------------------------+
|                                                          |
|  +----------------+  +----------------+  +---------------+ |
|  |      2         |  |      1         |  |      3        | |
|  |  High Risks    |  |  Medium Risks  |  |  Low Risks    | |
|  |  New this week |  |  New this week |  |  New this week| |
|  +----------------+  +----------------+  +---------------+ |
|                                                          |
|  High Risk Customers                                     |
|  +------------------------------------------------------+ |
|  | [T]  Test • Atul Bista              Joined 3 days ago| |
|  +------------------------------------------------------+ |
|  | [K]  Kundalini Dental • Sandip M.   Joined 27 Jan    | |
|  +------------------------------------------------------+ |
|                                                          |
+----------------------------------------------------------+
```

---

## Key Design Changes

| Current | Proposed |
|---------|----------|
| Detailed cards with multiple rows of info | Clean summary stats + simple list |
| Risk badge on each card | Summary counts by risk level at top |
| Plan, email, reason all shown | Simplified: just org name, owner, join date |
| No aggregate metrics | Three stat cards with counts and trends |

---

## UI Components

### 1. Summary Stats Grid (New)
Three stat cards showing:
- **High Risks**: Count + "New this week" or trend comparison
- **Medium Risks**: Count + trend
- **Low Risks**: Count + trend

Each card has:
- Large number (prominent)
- Risk level label
- Trend indicator (e.g., "+2 from last week" or "New this week")

### 2. High Risk Customers Section
Section header: "High Risk Customers"

Simple list items:
- **Avatar**: Circle with first letter of org name
- **Name**: "Org Name • Owner Name"
- **Join Date**: "Joined X days ago" or "Joined DD MMM YYYY"

Clicking a row still navigates to the org detail page.

---

## Technical Implementation

### File: `src/components/super-admin/ChurnRiskCard.tsx`

**Changes:**

1. **Add risk count aggregation**:
```typescript
const highRiskOrgs = atRiskOrgs.filter(o => o.riskLevel === 'high');
const mediumRiskOrgs = atRiskOrgs.filter(o => o.riskLevel === 'medium');
const lowRiskOrgs = atRiskOrgs.filter(o => o.riskLevel === 'low');
```

2. **New Summary Stats Row**:
```tsx
<div className="grid grid-cols-3 gap-4 mb-6">
  <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/20">
    <div className="text-3xl font-bold text-red-600">{highRiskOrgs.length}</div>
    <div className="text-sm font-medium">High Risks</div>
    <div className="text-xs text-muted-foreground">New this week</div>
  </div>
  {/* Similar for Medium and Low */}
</div>
```

3. **Simplified List Items**:
```tsx
<div className="space-y-2">
  <h4 className="text-sm font-semibold">High Risk Customers</h4>
  {highRiskOrgs.map((org) => (
    <div 
      key={org.id}
      onClick={() => handleCardClick(org.id)}
      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium">{org.name.charAt(0)}</span>
        </div>
        <span className="font-medium">
          {org.name} • {org.ownerName || 'No owner'}
        </span>
      </div>
      <span className="text-sm text-muted-foreground">
        Joined {formatRelativeOrDate(org.createdAt)}
      </span>
    </div>
  ))}
</div>
```

4. **Helper function for relative dates**:
```typescript
const formatRelativeOrDate = (dateStr: string) => {
  const days = differenceInDays(new Date(), new Date(dateStr));
  if (days <= 7) return `${days} days ago`;
  return format(new Date(dateStr), 'dd MMM yyyy');
};
```

---

## Visual Design Notes

- **Summary stat cards**: Use subtle background colors matching risk severity
  - High: Red tint (`bg-red-50` / `bg-red-950/20` dark mode)
  - Medium: Amber tint (`bg-amber-50` / `bg-amber-950/20`)
  - Low: Orange tint (`bg-orange-50` / `bg-orange-950/20`)
- **List items**: Clean borders, minimal padding, clear hover state
- **Avatar circles**: Show org initial, consistent size (32px)
- **Typography**: Large numbers (3xl), medium labels (sm), muted secondary text (xs)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/super-admin/ChurnRiskCard.tsx` | Complete redesign of the card layout |

