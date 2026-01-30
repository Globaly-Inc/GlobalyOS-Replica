
# Comprehensive Implementation Plan: GlobalyOS Platform Optimization

## Overview

This plan addresses all issues identified in the platform audit across 10 priority tiers, organized by impact and risk.

---

## Current State Summary

| Area | Status |
|------|--------|
| VirtualizedMessageList | ✅ Already integrated (verified in ConversationView.tsx L814) |
| EditorToolbar | ❌ Created but NOT integrated - 300 lines of inline JSX remain |
| Chat Hook Modularization | ❌ 21 files still import from `@/services/useChat` instead of `@/services/chat` |
| Oversized Files | ⚠️ Home.tsx (1,118 lines), Layout.tsx (744 lines), WikiRichEditor.tsx (2,624 lines) |
| Request Tracing | ❌ No X-Request-ID header correlation |
| Test Coverage | ⚠️ Security tests exist, but critical path tests missing (OTP verify, leave request, attendance) |

---

## TIER 1: NOW (Critical - This Sprint)

### Task 1.1: Integrate EditorToolbar into WikiRichEditor
**Problem**: The memoized `EditorToolbar` component (309 lines) exists but WikiRichEditor still renders ~300 lines of inline toolbar buttons, causing re-renders on every keystroke.

**Files to Modify**:
- `src/components/wiki/WikiRichEditor.tsx`

**Implementation**:
```text
1. Add import: import { EditorToolbar } from './editor/EditorToolbar';

2. Create stable callback object with useMemo:
   const toolbarCallbacks = useMemo(() => ({
     onToggleHeading: toggleHeading,
     onTextSizeChange: handleTextSizeChange,
     onTextSizeBlur: handleTextSizeBlur,
     onExecCommand: execCommand,
     onFormatBlock: formatBlock,
     onInsertLink: () => setLinkDialogOpen(true),
     onInsertImage: () => imageInputRef.current?.click(),
     onInsertFile: () => fileInputRef.current?.click(),
     onInsertCodeBlock: insertCodeBlock,
     onInsertTable: insertTable,
     onInsertDivider: insertDivider,
     onInsertEmbed: () => setEmbedDialogOpen(true),
     onUndo: handleUndo,
     onRedo: handleRedo,
     onAIGenerated: handleAIGenerated,
     onSaveSelection: saveSelection,
   }), [/* stable deps */]);

3. Replace lines 1871-2174 (inline toolbar JSX) with:
   <EditorToolbar
     activeHeading={activeHeading}
     activeTextSize={activeTextSize}
     textSizeInput={textSizeInput}
     isUploading={isUploading}
     editorValue={value}
     organizationId={organizationId}
     isCommandActive={isCommandActive}
     {...toolbarCallbacks}
   />
```

**Impact**: Eliminates toolbar re-renders on every keystroke, reduces WikiRichEditor by ~300 lines

**Effort**: 2 hours

---

### Task 1.2: Move sanitizeConfig to Module Scope
**Problem**: `sanitizeConfig` object (lines 72-87 in WikiRichEditor.tsx) is defined inside component, recreating on every render.

**Files to Modify**:
- `src/components/wiki/WikiRichEditor.tsx`

**Implementation**:
```text
1. Move sanitizeConfig outside the component (before line 72)
2. Rename to SANITIZE_CONFIG (constant naming convention)
3. Update all references in the file
```

**Impact**: Negligible performance gain but cleaner code

**Effort**: 10 minutes

---

### Task 1.3: Update plan.md to Reflect Reality
**Problem**: `.lovable/plan.md` says VirtualizedMessageList is "NOT DONE" but it IS integrated (verified at L814).

**Files to Modify**:
- `.lovable/plan.md`

**Implementation**: Update Phase 2 status to reflect VirtualizedMessageList IS integrated.

**Effort**: 5 minutes

---

## TIER 2: NEXT (High Priority - Next Sprint)

### Task 2.1: Migrate useChat.ts Imports to Modular Hooks
**Problem**: 21 files still import from `@/services/useChat` instead of the new modular `@/services/chat`. This creates:
- Duplicate code in bundle
- Maintenance confusion
- Prevents deprecation of the 2,456-line monolith

**Files to Modify** (21 files):
```text
src/components/chat/MessageComposer.tsx
src/components/chat/AddSpaceMembersDialog.tsx
src/components/TopNav.tsx
src/components/chat/UnreadView.tsx
src/components/chat/FavoritesSection.tsx
src/components/chat/TransferGroupAdminDialog.tsx
src/components/chat/CreateSpaceDialog.tsx
src/components/chat/ChatRightPanel.tsx
src/components/chat/ChatSidebar.tsx
src/components/chat/SpaceMembersDialog.tsx
src/components/chat/NewChatDialog.tsx
src/components/chat/MobileChatHome.tsx
src/components/chat/BrowseSpacesDialog.tsx
src/components/chat/ConversationView.tsx
src/components/chat/QuickSwitcher.tsx
src/components/chat/SpaceSettings.tsx
src/components/chat/ThreadView.tsx
src/components/chat/MentionsView.tsx
src/components/chat/StarredView.tsx
src/components/chat/ChatRightPanelEnhanced.tsx
src/pages/Chat.tsx
```

**Implementation**:
```text
For each file:
1. Change: import { ... } from "@/services/useChat"
   To:      import { ... } from "@/services/chat"

2. Verify all hooks are exported from src/services/chat/index.ts
   (barrel export already exists for backward compatibility)
```

**Post-Migration**:
- Add deprecation notice to `useChat.ts` header
- Consider removing duplicate hook definitions from `useChat.ts` (keep only re-exports)

**Impact**: Cleaner imports, smaller bundle after tree-shaking

**Effort**: 3 hours

---

### Task 2.2: Split Home.tsx into Sub-Components
**Problem**: Home.tsx is 1,118 lines - too large for maintenance and testing.

**Current Structure Analysis**:
```text
Lines 1-130: Imports and interfaces
Lines 134-400: State and data fetching logic
Lines 400-700: Helper functions and effects
Lines 700-1118: JSX rendering
```

**Proposed Split**:
```text
src/pages/Home.tsx                    (~200 lines) - Main orchestration
src/components/home/HomeHeroSection.tsx     - Weather/Horoscope/WorldTime widgets
src/components/home/HomeSidebar.tsx         - Right sidebar cards
src/components/home/HomeMainContent.tsx     - Feed and filters
src/hooks/useHomeData.ts                    - Data fetching logic
```

**Implementation**:
```text
1. Extract useHomeData hook with:
   - peopleOnLeave, upcomingTeamLeave, upcomingBirthdays, etc.
   - checkEmployeeProfile, loadLeaveData, loadUpcomingEvents functions

2. Extract HomeHeroSection:
   - Weather, Horoscope, WorldTime widget switcher
   - Time display and greeting

3. Extract HomeSidebar:
   - Birthday/Anniversary cards
   - Calendar events
   - Team leave preview

4. Home.tsx becomes thin orchestrator importing sub-components
```

**Impact**: Easier testing, faster code reviews, better separation

**Effort**: 4-5 hours

---

### Task 2.3: Add Request Tracing Headers
**Problem**: No correlation between frontend and backend requests. When errors occur in edge functions, there's no way to trace them back to the originating frontend request.

**Files to Modify**:
- `src/integrations/supabase/client.ts` - Cannot modify (auto-generated)
- Alternative: Create request wrapper utility

**Implementation**:
```text
1. Create src/lib/requestTracing.ts:

   export function generateRequestId(): string {
     return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   }

   export function createTracedFetch(originalFetch: typeof fetch): typeof fetch {
     return async (input, init) => {
       const requestId = generateRequestId();
       const headers = new Headers(init?.headers);
       headers.set('X-Request-ID', requestId);
       
       // Store in breadcrumbs for error context
       addBreadcrumb('api_request', { requestId, url: input.toString() });
       
       return originalFetch(input, { ...init, headers });
     };
   }

2. Initialize in App.tsx or errorCapture.ts:
   window.fetch = createTracedFetch(window.fetch);

3. Update edge functions to log X-Request-ID:
   const requestId = req.headers.get('X-Request-ID') || 'unknown';
   console.log(`[${requestId}] Processing request...`);
```

**Impact**: Full request traceability for debugging

**Effort**: 3 hours

---

### Task 2.4: Add Critical Path Integration Tests
**Problem**: Security tests exist but critical user flows lack test coverage.

**Test Files to Create**:
```text
src/test/flows/auth-otp.test.ts       - OTP verification flow
src/test/flows/leave-request.test.ts  - Create/approve/reject leave
src/test/flows/attendance.test.ts     - Check-in/check-out flow
src/test/flows/chat-message.test.ts   - Send/receive messages
```

**Implementation Example** (leave-request.test.ts):
```text
describe('Leave Request Flow', () => {
  it('should create a leave request and deduct balance on approval', async () => {
    // 1. Create leave request
    // 2. Verify it appears in pending
    // 3. Approve request
    // 4. Verify leave balance decreased
    // 5. Verify notification sent
  });

  it('should restore balance when approved request is cancelled', async () => {
    // Test the restore balance flow
  });
});
```

**Impact**: Catch regressions before production

**Effort**: 8 hours total

---

## TIER 3: LATER (Backlog)

### Task 3.1: Split Layout.tsx
**Problem**: 744 lines - handles multiple concerns.

**Proposed Split**:
```text
src/components/Layout.tsx                    (~150 lines)
src/components/layout/LayoutSidebar.tsx
src/components/layout/LayoutTopBar.tsx
src/components/layout/LayoutDialogs.tsx
src/hooks/useLayoutState.ts
```

**Effort**: 3 hours

---

### Task 3.2: Add Bundle Size Analysis to CI
**Problem**: No visibility into bundle size regressions.

**Implementation**:
- Add `vite-bundle-analyzer` or `rollup-plugin-visualizer`
- Add CI step to compare bundle sizes
- Alert on >10% increase

**Effort**: 2 hours

---

### Task 3.3: Standardize Edge Function Logging
**Problem**: Some functions log more than others, inconsistent debugging.

**Implementation**:
```text
Create: supabase/functions/_shared/logger.ts

export function createLogger(functionName: string) {
  return {
    info: (msg: string, data?: object) => 
      console.log(`[${functionName}] INFO: ${msg}`, data || ''),
    error: (msg: string, error: Error, data?: object) =>
      console.error(`[${functionName}] ERROR: ${msg}`, { error: error.message, ...data }),
    audit: (action: string, userId: string, orgId: string, details?: object) =>
      console.log(`[${functionName}] AUDIT: ${action}`, { userId, orgId, ...details })
  };
}

Update all 99 edge functions to use standardized logger.
```

**Effort**: 4-6 hours

---

### Task 3.4: Image Lazy Loading Audit
**Problem**: Unverified - images may load off-screen.

**Implementation**:
- Audit all `<img>` tags and Avatar components
- Add `loading="lazy"` where appropriate
- Consider `<picture>` with srcset for responsive images

**Effort**: 2 hours

---

## Implementation Sequence

```text
Week 1 (TIER 1 - Critical):
├── Day 1-2: Task 1.1 - Integrate EditorToolbar
├── Day 2: Task 1.2 - Move sanitizeConfig
└── Day 2: Task 1.3 - Update plan.md

Week 2 (TIER 2 - High):
├── Day 1-2: Task 2.1 - Migrate useChat imports
├── Day 3-4: Task 2.2 - Split Home.tsx
└── Day 5: Task 2.3 - Add request tracing

Week 3 (TIER 2 continued):
└── Task 2.4 - Add integration tests (spread across week)

Week 4+ (TIER 3 - Backlog):
├── Task 3.1 - Split Layout.tsx
├── Task 3.2 - Bundle analysis
├── Task 3.3 - Edge function logging
└── Task 3.4 - Image lazy loading
```

---

## Testing Checklist (Post-Implementation)

### After EditorToolbar Integration:
- [ ] All toolbar buttons work (bold, italic, underline)
- [ ] Heading toggles work (H1, H2, H3)
- [ ] Font size input works
- [ ] Lists work (bullet, numbered)
- [ ] Links, images, files can be inserted
- [ ] Code blocks work
- [ ] Tables can be inserted
- [ ] Embed button works
- [ ] AI Writing Assist works
- [ ] Undo/Redo work
- [ ] Type rapidly - no toolbar lag

### After Import Migration:
- [ ] Chat loads correctly
- [ ] Messages send/receive
- [ ] Spaces work
- [ ] All dialogs open correctly
- [ ] No console errors

### After Home.tsx Split:
- [ ] Home page loads correctly
- [ ] Weather widget works
- [ ] Horoscope widget works
- [ ] World clocks work
- [ ] Feed displays correctly
- [ ] Sidebar cards load
- [ ] Pull-to-refresh works

---

## Risk Assessment

| Task | Risk | Mitigation |
|------|------|------------|
| EditorToolbar Integration | Low | EditorToolbar already tested, props match |
| Import Migration | Low | Barrel exports ensure backward compatibility |
| Home.tsx Split | Medium | Keep data flow unchanged, just extract JSX |
| Request Tracing | Low | Additive change, no existing behavior modified |
| Integration Tests | Low | Tests don't affect production code |

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| WikiRichEditor lines | 2,624 | ~2,300 |
| Home.tsx lines | 1,118 | ~200 |
| Files importing @/services/useChat | 21 | 0 |
| Critical path test coverage | 0 | 4 flows |
| Request traceability | None | Full |
| Wiki toolbar re-renders | Every keystroke | Format change only |
