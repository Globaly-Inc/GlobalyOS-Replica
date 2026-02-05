

# Team Member Cards Redesign

## Summary

Replace the current list-style team member rows with rectangular cards in a 3-column grid layout, with a full-height avatar on the left and name/position/department stacked on the right. Remove schedule badge and related data fetching.

## Suggested UI

```text
+--------------------------------------+  +--------------------------------------+  +--------------------------------------+
|  +------+                            |  |  +------+                            |  |  +------+                            |
|  |      |  Aakriti Manandhar         |  |  |      |  Aayushma Shrestha         |  |  |      |  Abhilekh Singh             |
|  | Ava- |  Customer Success Assoc.   |  |  | Ava- |  People & Culture Officer  |  |  | Ava- |  Customer Success Assoc.    |
|  | tar  |  Customer Success          |  |  | tar  |  HR & Operations           |  |  | tar  |  Customer Success           |
|  +------+                            |  |  +------+                            |  |  +------+                            |
+--------------------------------------+  +--------------------------------------+  +--------------------------------------+

+--------------------------------------+  +--------------------------------------+  +--------------------------------------+
|  +------+                            |  |  +------+                            |  |  +------+                            |
|  |      |  Akanshya Malla            |  |  |      |  Alija Rai                 |  |  |      |  Aman Awale                 |
|  | Ava- |  Customer Rel. Officer     |  |  | Ava- |  Assoc. DevOps Engineer    |  |  | Ava- |  Digital Marketing Officer  |
|  | tar  |  Customer Success          |  |  | tar  |  Software Engineering      |  |  | tar  |  Digital Marketing          |
|  +------+                            |  |  +------+                            |  |  +------+                            |
+--------------------------------------+  +--------------------------------------+  +--------------------------------------+
```

- Online indicator dot on avatar (bottom-right green dot)
- Hover effect on each card for interactivity
- Responsive: 1 col on mobile, 2 on tablet, 3 on desktop

## Changes to `src/components/offices/OfficeTeamList.tsx`

### 1. Remove Schedule-Related Code

- Remove `has_schedule` from the `Employee` interface
- Remove the `employee_schedules` query (lines 62-67)
- Remove schedule mapping logic (lines 69-72)
- Remove `Calendar`, `Clock` icon imports
- Remove the `Badge` import and the schedule `Badge` element (lines 171-183)
- Remove `cn` import (no longer needed)

### 2. Replace List with 3-Column Grid

Change the employee container from `<div className="space-y-2">` to:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
```

### 3. New Card Markup per Employee

```tsx
<button
  key={employee.id}
  onClick={() => navigateOrg(`/team/${employee.id}`)}
  className="flex items-stretch gap-3 p-3 rounded-lg border bg-card hover:shadow-md hover:bg-muted/30 transition-all text-left"
>
  <div className="relative flex-shrink-0 flex items-center">
    <Avatar className="h-12 w-12">
      <AvatarImage src={employee.avatar_url || undefined} />
      <AvatarFallback>
        {employee.full_name.split(' ').map(n => n[0]).join('')}
      </AvatarFallback>
    </Avatar>
    {onlineStatuses[employee.id] && (
      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
    )}
  </div>
  <div className="flex flex-col justify-center min-w-0 gap-0.5">
    <span className="font-medium text-sm truncate">{employee.full_name}</span>
    <span className="text-xs text-muted-foreground truncate">{employee.position}</span>
    <span className="text-xs text-muted-foreground/70 truncate">{employee.department}</span>
  </div>
</button>
```

### 4. Update Loading Skeleton

Update the skeleton to match the grid layout:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
  {[1, 2, 3].map((i) => (
    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
      <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
    </div>
  ))}
</div>
```

## File Modified

| File | Changes |
|------|---------|
| `src/components/offices/OfficeTeamList.tsx` | Grid layout, card design, remove schedule badge + query |

