

## Fix: Tags Input Not Working in Task Detail Page

### Root Cause
The tag input in `TaskDetailPage.tsx` (line 350-354) has several UX issues making it appear non-functional:

1. **Too narrow** — `w-20` (80px) leaves almost no space to type when tags are present
2. **Invisible styling** — `border-none shadow-none focus-visible:ring-0` makes the input undetectable
3. **Focus loss on re-render** — After `updateTask.mutateAsync` succeeds, query invalidation (`['task', id]`) causes a re-render that resets focus away from the input

### Fix (in `src/components/tasks/TaskDetailPage.tsx`, lines 341-356)

Replace the plain `Input` with a proper interactive tag management approach:

1. **Widen the input** — change `w-20` to `w-28 min-w-[70px]` and add a subtle bottom border so users can see it
2. **Add a visible "+" button** as a fallback to submit (not just Enter key)
3. **Use `autoFocus` after adding** — after `handleAddTag`, use a ref to re-focus the input after the mutation completes, preventing focus loss on re-render
4. **Wrap the `handleAddTag` logic** to call `setNewTag('')` before awaiting `handleFieldUpdate`, so the input clears immediately and stays responsive

### Specific Code Changes

| Area | Change |
|------|--------|
| Add an `inputRef` (`useRef<HTMLInputElement>`) | Re-focus after tag add via `setTimeout(() => inputRef.current?.focus(), 50)` |
| Input styling (line 353) | Replace `w-20 border-none shadow-none px-1 focus-visible:ring-0` with `w-28 min-w-[70px] border-b border-dashed border-muted-foreground/30 shadow-none px-1 focus-visible:ring-1 rounded-none` |
| `handleAddTag` (lines 124-130) | Optimistically clear `newTag`, then update, then re-focus the input via ref |

