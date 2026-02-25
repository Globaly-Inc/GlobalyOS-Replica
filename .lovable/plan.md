

## Fix: Show selected assignee's name and avatar in the Assignee button

### Problem
Line 129 shows `'Assigned'` as static text when an employee is picked. The user wants to see the actual employee's name and avatar instead.

### Change — single file: `src/components/tasks/AddTaskDialog.tsx`

1. Import and call `useEmployees` to get the employee list.
2. Look up the selected employee: `employees.find(e => e.id === assigneeId)`.
3. Replace the button content (line 128-130) to render:
   - **When no assignee**: show "Unassigned"
   - **When assignee selected**: show avatar + employee name (no "Assigned" text)

```tsx
// Button content becomes:
{selectedEmployee ? (
  <div className="flex items-center gap-2">
    <Avatar className="h-5 w-5">
      <AvatarImage src={selectedEmployee.profiles?.avatar_url || undefined} />
      <AvatarFallback className="text-[8px]">
        {selectedEmployee.profiles?.full_name?.charAt(0)}
      </AvatarFallback>
    </Avatar>
    <span className="truncate">{selectedEmployee.profiles?.full_name}</span>
  </div>
) : 'Unassigned'}
```

The unused `assigneeLabel` state (line 30) will also be removed since it is no longer needed.

