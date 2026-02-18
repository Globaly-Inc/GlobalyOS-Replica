
## Add "Reopen" Button to Closed Vacancies

### What the user asked
When a job has `status === 'closed'`, add a Reopen button in the header toolbar. Clicking it opens a small dialog where the recruiter can set a new **Start Date** and **Closing Date** before re-opening the vacancy.

### Why no schema changes are needed
- `target_start_date` and `application_close_date` already exist on the `jobs` table.
- `UpdateJobInput` already accepts both fields along with `status`.
- `useUpdateJob` mutation already handles all writes.

### User flow

```text
[Closed vacancy page]
  → Header toolbar shows: [Reopen] [Delete]
  → Click "Reopen"
  → Dialog opens:
      - Title: "Reopen Vacancy"
      - Date picker: Start Date (optional)
      - Date picker: Application Closing Date (optional)
      - [Cancel]  [Reopen Vacancy] buttons
  → On confirm: status → 'open', dates saved, toast shown
```

### Technical plan

**File changed: `src/pages/hiring/JobDetail.tsx`**

1. Add new state variables:
   ```ts
   const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
   const [reopenStartDate, setReopenStartDate] = useState('');
   const [reopenCloseDate, setReopenCloseDate] = useState('');
   const [isReopening, setIsReopening] = useState(false);
   ```

2. Pre-populate dates when dialog opens — seed from existing job values so the recruiter can see and tweak them:
   ```ts
   const handleReopenClick = () => {
     setReopenStartDate((job as any).target_start_date?.split('T')[0] || '');
     setReopenCloseDate((job as any).application_close_date?.split('T')[0] || '');
     setReopenDialogOpen(true);
   };
   ```

3. Submit handler calls the existing mutation:
   ```ts
   const handleReopenConfirm = async () => {
     setIsReopening(true);
     await updateJob.mutateAsync({
       jobId: job.id,
       input: {
         status: 'open',
         target_start_date: reopenStartDate || null,
         application_close_date: reopenCloseDate || null,
       },
     });
     setReopenDialogOpen(false);
   };
   ```

4. Add the **Reopen** button to the header toolbar — visible only when `isClosed`:
   ```tsx
   {isClosed && (
     <Tooltip>
       <TooltipTrigger asChild>
         <Button size="sm" variant="outline" onClick={handleReopenClick}>
           <Play className="h-4 w-4" />
           Reopen
         </Button>
       </TooltipTrigger>
       <TooltipContent>Reopen vacancy</TooltipContent>
     </Tooltip>
   )}
   ```

5. Add the dialog at the bottom of the JSX (alongside the existing Delete dialog):
   - Uses the existing `Dialog` / `DialogContent` components already imported
   - Uses the existing `DatePicker` component from `@/components/ui/date-picker`
   - Two date pickers stacked vertically with labels
   - Cancel and "Reopen Vacancy" buttons

### What is NOT changing
- No database migrations
- No new hooks
- No changes to the public career page or candidates list
- The `Edit` button remains hidden when `isClosed` (existing behaviour stays)
