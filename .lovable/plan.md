
## Placeholder Dropdown + Auto-Resize Email Body — All Email Dialogs

### What's Changing

Two email dialogs will be upgraded:
1. **`EmailTemplateDialog`** inside `PipelineCard.tsx` (Edit / Create stage email template)
2. **`BulkEmailDialog`** in `src/components/hiring/pipeline/BulkEmailDialog.tsx` (bulk send to candidates)

Both will get:
- A **searchable, scrollable "Placeholders" dropdown** placed to the left of the action buttons in `DialogFooter`, with a copy icon per item
- **Auto-resizing email body textarea** that grows line by line up to ~20 lines (480px), then scrolls

The inline hint text about placeholders in `PipelineCard.tsx` (under the Subject field) will be removed since the dropdown replaces it.

---

### Placeholder Variables

Both dialogs use the same set of template variables:

| Placeholder | Description |
|---|---|
| `{{candidate_name}}` | Full name |
| `{{candidate_first_name}}` | First name |
| `{{job_title}}` | Job title |
| `{{company_name}}` | Company name |
| `{{stage_name}}` | Current stage |
| `{{application_date}}` | Date applied |

---

### Technical Details

#### 1. Shared `PlaceholderDropdown` component (new file)

A standalone, reusable component extracted to `src/components/hiring/PlaceholderDropdown.tsx`:

```tsx
// Uses Popover + Command (cmdk) for searchable, scrollable list
// Each row: <code>{{variable}}</code> · description · <Copy icon button>
// Copy icon calls navigator.clipboard.writeText(key) + shows sonner toast "Copied!"
// Trigger: a Button labeled "Insert Placeholder ▾" or "Placeholders ▾"
```

Structure:
```
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">
      <ChevronDown /> Placeholders
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-80 p-0 z-[200]">
    <Command>
      <CommandInput placeholder="Search placeholders..." />
      <CommandList className="max-h-60 overflow-y-auto">
        <CommandEmpty>No placeholders found.</CommandEmpty>
        <CommandGroup>
          {PLACEHOLDERS.map(p => (
            <CommandItem key={p.key}>
              <code>{p.key}</code>
              <span>{p.description}</span>
              <Copy onClick={() => copyToClipboard(p.key)} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

Props:
- `onInsert?: (key: string) => void` — optional, for inserting at cursor in the body textarea
- The copy icon always copies to clipboard regardless

#### 2. Auto-resize hook — extracted to shared location

The `useAutoResize` hook currently lives inside `PipelineCard.tsx`. It will be duplicated inline in `BulkEmailDialog.tsx` as well (keeping it co-located to avoid a refactor of the whole file structure). The logic is identical:

```ts
const MAX_BODY_HEIGHT = 480;
const useAutoResize = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, MAX_BODY_HEIGHT);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > MAX_BODY_HEIGHT ? 'auto' : 'hidden';
  }, [value]);
  return ref;
};
```

#### 3. `EmailTemplateDialog` in `PipelineCard.tsx`

Changes:
- Remove the inline `<p className="text-xs text-muted-foreground">Use …</p>` hint under Subject
- In `DialogFooter`, add `<PlaceholderDropdown />` as the leftmost element, using `className="mr-auto"` to push it to the left while Cancel/Save stay on the right
- The auto-resize on the body textarea is already working — no change needed there

Footer layout:
```
[ Placeholders ▾ ]          [ Cancel ] [ Save Changes ]
```

#### 4. `BulkEmailDialog.tsx`

Changes:
- Add the `useAutoResize` hook at the top of the file
- Remove the existing `<Alert>` block that lists variables inline
- Convert the body `<Textarea>` from `rows={10}` (fixed) to auto-resize with ref-merging
- Replace the `<Alert>` with `<PlaceholderDropdown />` placed in `DialogFooter` on the left side
- Dialog stays `max-h-[90vh] overflow-y-auto`

---

### Files to Change

| File | Change |
|---|---|
| `src/components/hiring/PlaceholderDropdown.tsx` | **New file** — shared Popover+Command placeholder picker |
| `src/components/hiring/PipelineCard.tsx` | Remove inline hint, add `<PlaceholderDropdown>` in footer |
| `src/components/hiring/pipeline/BulkEmailDialog.tsx` | Add auto-resize, remove Alert block, add `<PlaceholderDropdown>` in footer |

