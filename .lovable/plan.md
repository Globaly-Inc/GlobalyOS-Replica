

## Hide "View Pipeline" for Draft Vacancies

### Change

**File: `src/pages/hiring/JobsList.tsx` (around line 224)**

Wrap the "View Pipeline" button in a conditional so it only renders when `job.status !== 'draft'`. For draft vacancies, show a "View Details" button instead (or just hide the pipeline button entirely, keeping the three-dot menu).

```tsx
{job.status !== 'draft' ? (
  <Button variant="outline" size="sm" asChild>
    <OrgLink to={`/hiring/jobs/${job.slug}`}>
      <Eye className="h-4 w-4 mr-1" />
      View Pipeline
    </OrgLink>
  </Button>
) : (
  <Button variant="outline" size="sm" asChild>
    <OrgLink to={`/hiring/jobs/${job.slug}`}>
      <Eye className="h-4 w-4 mr-1" />
      View Details
    </OrgLink>
  </Button>
)}
```

This keeps draft vacancies navigable (via "View Details") while making it clear there is no pipeline until the vacancy is published.

