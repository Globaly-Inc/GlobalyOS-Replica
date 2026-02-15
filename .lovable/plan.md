
## Fix: Edit Button Not Showing for Page-Level "Everyone Can Edit"

### The Problem
The Edit button on wiki pages is only visible to admins, HR, and owners. The code currently passes `canEdit={hasGlobalEditAccess}` to the `WikiContent` component, which only checks role-based access. It completely ignores the page's `access_scope` setting (e.g., "Everyone can edit").

So even though you set the file to "Everyone can edit", Sarah (a regular member) never sees the Edit button because her role is not admin/HR/owner.

### The Fix
Add a page-level permission check using the existing `can_edit_wiki_item` RPC function, and combine it with the role-based check. This is exactly how `WikiEditPage.tsx` already works -- we just need to apply the same logic to the read view.

### What Changes

**`src/pages/Wiki.tsx`**
- Add a query that calls `can_edit_wiki_item` RPC for the currently selected page (similar to what `WikiEditPage.tsx` already does)
- Change `canEdit={hasGlobalEditAccess}` to `canEdit={hasGlobalEditAccess || canEditSelectedPage}` in all three places where `WikiContent` is rendered (mobile view, desktop view, and preview dialog)
- The query only runs when a page is selected and the user is not already an admin/HR/owner (to avoid unnecessary calls)

### Technical Detail

The fix adds a `useQuery` call:
```text
queryKey: ["wiki-page-edit-permission", selectedPageId, user?.id]
queryFn: supabase.rpc('can_edit_wiki_item', {
  _item_type: 'page',
  _item_id: selectedPageId,
  _user_id: user.id,
})
```

Then all `canEdit` props become:
```text
canEdit={hasGlobalEditAccess || canEditSelectedPage === true}
```

This mirrors the existing pattern in `WikiEditPage.tsx` (lines 46-62) and uses the same RPC that already accounts for `access_scope = 'company'` (Everyone) and member-level sharing.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Wiki.tsx` | Add page-level edit permission query; update `canEdit` prop in 3 `WikiContent` renders and 1 preview dialog render |
