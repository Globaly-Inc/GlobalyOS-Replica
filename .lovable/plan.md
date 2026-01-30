

# WikiRichTextEditor Performance Audit & Improvement Plan

## ✅ IMPLEMENTATION COMPLETE

All performance improvements have been implemented and tested:

- **Created** `src/lib/debounce.ts` - Type-safe debounce/throttle utilities with cancel/flush/pending methods
- **Modified** `WikiRichEditor.tsx` - Added 150ms debounce to triggerUpdate, 50ms debounce to updateActiveFormatting
- **Added** 14 new tests for debounce, throttle, and performance benchmarks
- **All 45 tests passing** - no regressions

### Expected Results
- 60-80% reduction in re-renders during typing
- Smoother typing experience on longer documents
- No breaking changes to existing functionality

---

## Audit Summary

I conducted a comprehensive review of the WikiRichTextEditor component and its ecosystem:

### Components & Files Reviewed

| Component | Lines | Purpose |
|-----------|-------|---------|
| `WikiRichEditor.tsx` | 2,585 | WYSIWYG editor with toolbar, tables, code blocks, embeds |
| `WikiEditPage.tsx` | 441 | Full-screen edit mode with draft autosave |
| `WikiAIWritingAssist.tsx` | 121 | AI writing assistance integration |
| `WikiContent.tsx` | 312 | Page viewer with version history, export |
| `useWiki.ts` | 637 | Domain service hooks for CRUD |
| `useWikiPermissions.tsx` | 227 | Fine-grained permission checks |
| `WikiRichEditor.test.tsx` | 305 | Unit tests for sanitization, URL linking |
| Edge Functions | 2 files | `wiki-ask-ai`, `ai-writing-assist` |

---

## What's Working Well

| Feature | Status | Notes |
|---------|--------|-------|
| HTML Sanitization | Excellent | DOMPurify with comprehensive allowlist - XSS prevention solid |
| Draft Autosave | Working | 2-second debounce to localStorage in WikiEditPage |
| Version History | Working | Saves version on each edit with restore capability |
| Permission System | Working | `can_edit_wiki_item` RPC with role-based + member-based access |
| Multi-tenant Isolation | Working | All queries scoped by organization_id |
| AI Token Tracking | Excellent | Both edge functions log detailed usage to `ai_usage_logs` |
| Content Metrics | Working | Word count, character count, reading time via `useMemo` |
| Keyboard Shortcuts | Working | Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+Z/Y |
| Accessibility | Good | All toolbar buttons have `aria-label` attributes |
| Code Syntax Highlighting | Working | Prism.js with 24+ languages |
| Feature Flag Protection | Working | AI features gated by `ask-ai` feature flag |

---

## Issues Found

### Critical Performance Issues

| Issue | Impact | Component | Severity |
|-------|--------|-----------|----------|
| **No debouncing on `triggerUpdate`** | Every keystroke triggers DOMPurify sanitization + parent re-render | `WikiRichEditor.tsx` | HIGH |
| **Content sanitization on every input** | Expensive DOMPurify.sanitize runs on each character typed | `WikiRichEditor.tsx:171-175` | HIGH |
| **WikiRichEditor is 2,585 lines** | Maintainability and bundle size concern | `WikiRichEditor.tsx` | MEDIUM |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| Many `useCallback` functions without proper memoization | Recreated on every render despite useCallback | WikiRichEditor.tsx |
| No virtualization for large content | Performance degrades with long documents | WikiRichEditor.tsx |
| `updateActiveFormatting` runs on every selection change | DOM traversal on every cursor move | WikiRichEditor.tsx |
| 5 RLS policies flagged as "Always True" | Security linter warnings | Database |
| 5 functions missing `search_path` | Security linter warnings | Database functions |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No loading indicator during file uploads on mobile | UX gap on slower connections | WikiRichEditor.tsx |
| Table controls may overlap content on narrow screens | Minor mobile UX issue | WikiRichEditor.tsx |
| Missing confirmation for bulk image deletions | Accidental deletion possible | WikiRichEditor.tsx |

---

## Root Cause Analysis: Performance

The main performance bottleneck is in the `handleInput` callback chain:

```text
User types character
       │
       ▼
handleInput() called on every keystroke
       │
       ▼
triggerUpdate() - NO DEBOUNCE
       │
       ▼
DOMPurify.sanitize() - EXPENSIVE (regex + DOM parsing)
       │
       ▼
onChange(html) - Re-renders parent component
       │
       ▼
useMemo(contentStats) - Re-calculates word count
```

This means every keystroke:
1. Runs DOMPurify sanitization (CPU intensive)
2. Triggers React state update in parent
3. Recalculates word/character counts

---

## Implementation Plan

### Phase 1: Add Debouncing to triggerUpdate (HIGH PRIORITY)

**File:** `src/components/wiki/WikiRichEditor.tsx`

Changes:
- Import `useMemo` for stable debounce function
- Create debounced version of `triggerUpdate` with 100-150ms delay
- Keep immediate sanitization for copy-paste safety but debounce the `onChange` call
- This single change will dramatically reduce re-renders

Implementation approach:
```typescript
// Create debounced trigger update
const debouncedTriggerUpdate = useMemo(
  () => debounce(() => {
    if (editorRef.current) {
      const html = DOMPurify.sanitize(editorRef.current.innerHTML, sanitizeConfig);
      onChange(html);
    }
  }, 150),
  [onChange]
);
```

### Phase 2: Optimize updateActiveFormatting (MEDIUM PRIORITY)

**File:** `src/components/wiki/WikiRichEditor.tsx`

Changes:
- Add debouncing to `updateActiveFormatting` (50ms)
- Only run formatting checks when selection actually changes
- Use `requestAnimationFrame` to batch DOM reads

### Phase 3: Add Performance Unit Tests (MEDIUM PRIORITY)

**File:** `src/test/components/WikiRichEditor.test.tsx`

New tests to add:
- Test that debouncing prevents excessive re-renders
- Benchmark sanitization timing for large content
- Test contentStats calculation efficiency
- Test that keyboard shortcuts don't cause lag

### Phase 4: Create Debounce Utility (SUPPORTING)

**File:** `src/lib/debounce.ts`

Create a reusable debounce utility:
- Type-safe debounce function
- Supports cancel and flush methods
- Consistent with project patterns

---

## Files to Create/Modify

| File | Action | Priority | Changes |
|------|--------|----------|---------|
| `src/lib/debounce.ts` | Create | High | Reusable debounce utility function |
| `src/components/wiki/WikiRichEditor.tsx` | Modify | High | Add debouncing to triggerUpdate and updateActiveFormatting |
| `src/test/components/WikiRichEditor.test.tsx` | Modify | Medium | Add performance-related tests |

---

## Technical Implementation Details

### Debounce Strategy

For the editor, we need two different debounce strategies:

1. **Content sync (triggerUpdate)**: 150ms debounce
   - Batches rapid keystrokes
   - Still responsive for paste operations
   - Prevents excessive sanitization

2. **Formatting state (updateActiveFormatting)**: 50ms debounce
   - Quick feedback for toolbar state
   - Prevents jank during rapid selection changes

### Code Pattern

```typescript
// src/lib/debounce.ts
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void; flush: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    lastArgs = args;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      if (lastArgs) fn.apply(this, lastArgs);
      timeoutId = null;
      lastArgs = null;
    }, delay);
  } as T & { cancel: () => void; flush: () => void };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = null;
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      fn(...lastArgs);
      timeoutId = null;
      lastArgs = null;
    }
  };

  return debounced;
}
```

---

## Security Observations

### Token Tracking - Excellent

Both AI edge functions implement proper billing-grade tracking:
- `wiki-ask-ai`: Tracks prompt_tokens, completion_tokens, estimated_cost, latency_ms
- `ai-writing-assist`: Same comprehensive tracking with error logging

### XSS Prevention - Excellent

DOMPurify configuration is comprehensive:
- Explicit allowlist of safe tags
- Script tags stripped
- onclick handlers removed
- javascript: URLs blocked

### RLS - Working

Wiki tables use proper organization isolation via RPC functions like `can_edit_wiki_item`.

### Linter Warnings (Non-Critical)

- 5 "Function Search Path Mutable" warnings - should be addressed separately
- 5 "RLS Policy Always True" warnings - need review but appear to be on non-wiki tables

---

## Expected Outcome

After implementing these improvements:

1. **60-80% reduction in re-renders** during typing due to debouncing
2. **Smoother typing experience** especially on longer documents
3. **Better mobile performance** with reduced CPU usage
4. **No regression in functionality** - all features preserved
5. **Improved test coverage** for performance-critical paths

---

## Risk Assessment

| Change | Risk Level | Mitigation |
|--------|------------|------------|
| Debounce triggerUpdate | Low | Use 150ms delay - still feels instant |
| Debounce updateActiveFormatting | Very Low | 50ms is imperceptible |
| Add debounce utility | None | New file, no existing code affected |
| Add tests | None | Additive only |

