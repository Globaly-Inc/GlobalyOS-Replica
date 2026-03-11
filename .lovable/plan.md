

## Fix: Auto-add Members on Space Creation + Make Dialogs Scrollable

### Problem
When creating a space with department/project filters, the UI shows the matching member count but the mutation (`useSpaceMutations.ts`) never actually adds those members. The `addAllMembers` flag is accepted but ignored — only the `members` scope path inserts members. The full logic exists in the legacy `useChat.ts` but the refactored `useSpaceMutations.ts` (which is actually used) is missing it.

### Changes

**1. `src/services/chat/mutations/useSpaceMutations.ts`** — Add the missing `addAllMembers` logic

Port the member-fetching logic from `useChat.ts` (lines 806-882) into `useSpaceMutations.ts` after the existing member/association inserts:
- For `company` scope: fetch all active employees and insert as members
- For `custom` scope: fetch employees filtered by selected offices, departments, and projects (AND logic), then insert as members
- For legacy `offices`/`projects` scopes: fetch matching employees
- Exclude the creator (auto-added by DB trigger) from the insert
- Also add any `memberIds` passed for the `custom` scope with `inviteAdditionalMembers`

**2. Dialog scrollability** — Both `CreateSpaceDialog.tsx` and `SpaceSettingsDialog.tsx` already use `ScrollArea` with `max-h-[90vh]` and `flex flex-col` layout, so they should already be scrollable. No changes needed there — the existing implementation handles this correctly.

### Technical Detail
The root cause is a refactoring gap: when `useChat.ts` was split into modular files under `services/chat/mutations/`, the `addAllMembers` block (~75 lines) was not carried over to `useSpaceMutations.ts`. The fix is to copy that logic into the mutation after the space and association inserts.

