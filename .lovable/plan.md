
## Auto-Resize Email Body Textarea (with 20-line scroll cap)

### What's Changing

The **Email Body** `<Textarea>` inside the Edit/Create Email Template dialog will change from a fixed flex-fill box to an auto-resizing field that:

- Starts small (matches the initial content height)
- Grows line-by-line as the user types
- Caps at **20 lines** (~480 px), then enables vertical scrolling

The dialog itself will also switch from a fixed `h-[85vh]` to a `max-h-[85vh]` so it shrinks when the content is short.

---

### Technical Details

**File:** `src/components/hiring/PipelineCard.tsx`

#### 1. Add a `useAutoResize` hook (inline, above the component)

A small `useEffect` on the textarea ref recalculates `height` on every value change:
```ts
const useAutoResize = (value: string) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';          // collapse first
    el.style.height = `${el.scrollHeight}px`; // expand to content
  }, [value]);
  return ref;
};
```

#### 2. Watch the body field value

```ts
const bodyValue = watch('body');
const bodyRef = useAutoResize(bodyValue ?? '');
```

#### 3. Merge the ref onto the Textarea

`register('body')` returns its own `ref`; we need to merge it:
```tsx
const { ref: registerRef, ...bodyProps } = register('body');
// ...
<Textarea
  id="tpl-body"
  {...bodyProps}
  ref={(el) => {
    registerRef(el);
    (bodyRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
  }}
  style={{ minHeight: '80px', maxHeight: '480px', overflowY: 'auto' }}
  className="resize-none font-mono text-sm"
/>
```

#### 4. Fix dialog & form layout

- `DialogContent`: change `h-[85vh] flex flex-col` → `max-h-[85vh] flex flex-col`
- Body wrapper `div`: remove `flex-1 min-h-0`, keep `space-y-1.5`
- `form`: change `flex flex-col flex-1 min-h-0` → `flex flex-col gap-4` (no longer needs to fill fixed height)

---

### Files to Change
- `src/components/hiring/PipelineCard.tsx` — textarea auto-resize logic + dialog/form layout adjustments
