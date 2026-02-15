
## Add "Who is Viewing" Presence Stack to Wiki Editor Header

**What changes:**
Place a styled avatar stack showing all users currently viewing the page (including the current user) in the editor header, positioned before the Comments button. The design will match the reference screenshot -- overlapping circular avatars with a "+N" overflow indicator.

**Technical Details:**

### 1. Update `useWikiPagePresence` hook to include the current user

Currently the hook filters out the current user from viewers. We need to change it to return **all** viewers (including self), so the UI can show the current user in the stack.

**File: `src/hooks/useWikiPagePresence.ts`**
- Remove the `if (key === employeeId) continue;` filter so all presence entries are returned
- Add an `isSelf` boolean to the `WikiViewer` interface so the UI can distinguish the current user

### 2. Update `WikiPageViewers` component for the new design

**File: `src/components/wiki/collaboration/WikiPageViewers.tsx`**
- Render all viewers (including self) as overlapping avatars with a ring/border style matching the reference (circular, slight overlap, border)
- Show up to 5 avatars, then a "+N" overflow badge
- Remove the "X viewing" text label -- just show the avatar stack
- No longer return `null` when empty -- always show at least the current user's avatar
- Add tooltip on each avatar showing the name ("You" for the current user)

### 3. Add the component to the editor header

**File: `src/pages/WikiEditPage.tsx`**
- Place `<WikiPageViewers>` in the actions area (line ~270), right before the Comments toggle button
- Pass `pageId`, `currentEmployee.id`, `userName`, and `currentEmployee.profiles.avatar_url`
- Remove the existing `WikiActiveEditors` component (lines 242-245) since the new viewers component replaces it

### Layout in header (left to right):
```
[Title input] ... [Save status] ... [Avatar Stack] [Comments btn] [Close btn]
```
