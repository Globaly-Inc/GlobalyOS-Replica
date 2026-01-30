
# Wiki Rich Text Editor - Implementation Complete

**Status:** ✅ Complete

### Components & Files Reviewed

| Component | Lines | Purpose |
|-----------|-------|---------|
| `WikiRichEditor.tsx` | 2,540 | WYSIWYG editor with toolbar, tables, code blocks, embeds |
| `WikiEditPage.tsx` | 441 | Full-screen edit mode with draft autosave |
| `WikiShareDialog.tsx` | 1,133 | Sharing with offices, departments, projects, members |
| `WikiContent.tsx` | 312 | Page viewer with version history, export |
| `WikiMembersWithAccess.tsx` | 461 | Member permission management |
| `useWikiPermissions.tsx` | 227 | Fine-grained permission checks |
| `useWiki.ts` | 637 | Domain service hooks for CRUD |
| `WikiRichEditor.test.tsx` | 305 | Unit tests for sanitization, URL linking |
| `wiki-ask-ai/index.ts` | 204 | AI Q&A edge function |

---

## What's Working Well

| Feature | Status | Notes |
|---------|--------|-------|
| HTML Sanitization | Working | DOMPurify with comprehensive ALLOWED_TAGS config |
| XSS Prevention | Working | Script tags, onclick handlers, javascript: URLs all stripped |
| Draft Autosave | Working | 2-second debounce to localStorage with recovery prompt |
| Version History | Working | Saves version on each edit with restore capability |
| Permission System | Working | `can_edit_wiki_item` RPC with role-based + member-based access |
| Multi-tenant Isolation | Working | All queries scoped by organization_id |
| Table Manipulation | Working | Add/delete rows/columns with visual controls |
| Code Blocks | Working | Syntax highlighting with Prism.js, 24+ languages |
| Image/File Upload | Working | Storage bucket integration with progress |
| Embed Support | Working | YouTube, Vimeo, Loom with responsive iframes |
| URL Auto-linking | Working | Converts typed URLs to clickable links |
| Keyboard Shortcuts | Working | Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K, Ctrl+Z/Y |
| Content Metrics | Working | Word count, character count, reading time |
| Sharing | Working | Offices, departments, projects, individual members |
| AI Ask Question | Working | Gemini-powered Q&A with org wiki context |

---

## Issues Found

### Critical Issues

| Issue | Impact | Component | Severity |
|-------|--------|-----------|----------|
| **WikiRichEditor is 2,540 lines** | Maintainability nightmare - very hard to extend, debug, or test | `WikiRichEditor.tsx` | High |
| **`ai-writing-assist` lacks token tracking** | No billing-grade visibility for AI usage | Edge function | High |
| **`wiki-ask-ai` records quantity but not tokens** | Missing prompt_tokens, completion_tokens | Edge function | High |

### Medium Priority Issues

| Issue | Impact | Component |
|-------|--------|-----------|
| No AI writing assist in Wiki editor | Missing standard productivity feature | WikiRichEditor.tsx |
| Missing accessibility labels on toolbar buttons | Screen reader users can't identify buttons | WikiRichEditor.tsx |
| Toolbar not keyboard-navigable | Power users can't tab through toolbar | WikiRichEditor.tsx |
| Console warning: Badge component ref issue | React warning in PendingLeaveApprovals | badge.tsx |
| 5 RLS policies flagged as "Always True" | Security linter warnings | Database |
| 5 functions missing search_path | Security linter warnings | Database functions |

### Low Priority / UX Improvements

| Issue | Impact | Component |
|-------|--------|-----------|
| No confirmation when deleting images/embeds | Accidental deletion possible | WikiRichEditor.tsx |
| Missing AI writing suggestion in Wiki | Could help with page drafting | WikiRichEditor.tsx |
| No autosave status in WikiRichEditor (only in WikiEditPage) | Unclear if content is safe | WikiRichEditor.tsx |

---

## Implementation Plan

### Phase 1: Add Token Tracking to Wiki AI Functions (MANDATORY)

**1A. Update `wiki-ask-ai` Edge Function**

Update the edge function to track tokens properly:
- Extract `usage` object from AI response (prompt_tokens, completion_tokens)
- Log to `ai_usage_logs` table with:
  - `organization_id`, `user_id`, `employee_id`
  - `feature_name: 'wiki_ask_ai'`, `action_name: 'ask_question'`
  - `model_name: 'google/gemini-2.5-flash'`
  - `prompt_tokens`, `completion_tokens`, `total_tokens`
  - `estimated_cost` (calculated from model pricing)
  - `latency_ms`, `success: true/false`

**1B. Update `ai-writing-assist` Edge Function**

Same token tracking pattern:
- Add Supabase client for logging
- Verify user authentication
- Track tokens per type (win, announcement, kudos, social)
- Log to `ai_usage_logs` table

### Phase 2: Add AI Writing Assist to Wiki Editor

Create a new component `WikiAIWritingAssist.tsx` that:
- Provides "Write with AI" and "Improve with AI" buttons
- Uses Gemini to generate/improve wiki content
- Respects admin AI feature toggles
- Logs usage with full token tracking

Integrate into WikiRichEditor toolbar as an optional feature.

### Phase 3: Improve Accessibility

**3A. Add aria-labels to toolbar buttons**
All toolbar buttons should have proper `aria-label` attributes matching their `title` attributes.

**3B. Add keyboard navigation**
Toolbar should be navigable with Tab/Shift+Tab, with visual focus indicators.

### Phase 4: Refactor WikiRichEditor (Future)

The 2,540-line file should eventually be split into:
- `WikiEditorToolbar.tsx` - Toolbar buttons and formatting
- `WikiEditorContent.tsx` - Editable content area
- `WikiTableControls.tsx` - Table manipulation UI
- `WikiCodeBlock.tsx` - Code block with syntax highlighting (already exists)
- `WikiImagePopover.tsx` - Image alignment and resize
- `WikiLinkPopover.tsx` - Link edit/remove

This is lower priority as it requires careful refactoring to maintain behavior.

---

## Files to Create/Modify

| File | Action | Priority | Changes |
|------|--------|----------|---------|
| `supabase/functions/wiki-ask-ai/index.ts` | Modify | High | Add token tracking to ai_usage_logs |
| `supabase/functions/ai-writing-assist/index.ts` | Modify | High | Add token tracking, auth verification |
| `src/components/wiki/WikiAIWritingAssist.tsx` | Create | Medium | AI writing assist component for Wiki |
| `src/components/wiki/WikiRichEditor.tsx` | Modify | Medium | Add AI assist button to toolbar, aria-labels |
| `src/test/components/WikiRichEditor.test.tsx` | Modify | Low | Add tests for new functionality |

---

## AI Opportunity Analysis

### Already Implemented (Working)
- **Wiki Ask AI**: Q&A powered by Gemini, searches wiki content for answers

### Recommended Additions

| Feature | Value | Implementation |
|---------|-------|----------------|
| **AI Writing Assist in Wiki** | High - helps users draft pages faster | Add button to toolbar, call ai-writing-assist |
| **AI Summarize Page** | Medium - quick overview of long pages | New action in WikiContent |
| **AI Translate Page** | Low - useful for multi-language orgs | Future consideration |

### AI Safeguards Already in Place
- Feature limits checked via `check_feature_limit` RPC
- Usage recorded via `record_usage` RPC
- Rate limiting (429 responses) handled
- Credit exhaustion (402 responses) handled
- Authentication required for all AI endpoints

---

## Token Tracking Implementation Details

### Current State
- `wiki-ask-ai`: Records `ai_queries` quantity but NOT token-level details
- `ai-writing-assist`: No tracking at all

### Required Schema (Already Exists)
```sql
-- ai_usage_logs table columns:
- organization_id, user_id, employee_id
- feature_name, action_name, model_name
- prompt_tokens, completion_tokens, total_tokens
- estimated_cost, latency_ms, success
- created_at
```

### Token Tracking Code Pattern
```typescript
const startTime = Date.now();
const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {...});
const data = await response.json();
const latencyMs = Date.now() - startTime;

// Extract usage from Lovable AI response
const usage = data.usage || {};
const promptTokens = usage.prompt_tokens || 0;
const completionTokens = usage.completion_tokens || 0;

// Log to ai_usage_logs
await supabase.from("ai_usage_logs").insert({
  organization_id: organizationId,
  user_id: user.id,
  employee_id: employee.id,
  feature_name: 'wiki_ask_ai',
  action_name: 'ask_question',
  model_name: 'google/gemini-2.5-flash',
  prompt_tokens: promptTokens,
  completion_tokens: completionTokens,
  total_tokens: promptTokens + completionTokens,
  estimated_cost: calculateCost(promptTokens, completionTokens),
  latency_ms: latencyMs,
  success: true,
});
```

---

## Security Observations

### Properly Implemented
- HTML sanitization via DOMPurify with allowlist
- XSS prevention (script tags, onclick, javascript: URLs blocked)
- Multi-tenant isolation via organization_id scoping
- Authentication verified in edge functions
- RLS policies use security definer functions

### Linter Warnings (Review Needed)
- 5 "RLS Policy Always True" warnings - likely on non-wiki tables
- 5 "Function Search Path Mutable" warnings - functions missing `SET search_path = public`

---

## Expected Outcome

After implementing these improvements:
1. **Full token tracking** for all Wiki AI operations with billing-grade visibility
2. **AI Writing Assist** available in Wiki editor for productivity boost
3. **Better accessibility** with proper aria-labels and keyboard navigation
4. **No new regressions** - existing behavior preserved
5. **Admin controls** respected for AI features
