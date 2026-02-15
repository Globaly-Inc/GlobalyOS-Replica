
## Fix: Wiki Folders Not Visible to Non-Admin Users

### Root Cause

The `can_view_wiki_item` database function has a bug that causes it to crash for non-admin users when checking folder visibility.

The function loads different fields into the `_item` record depending on whether it's a folder or page:
- **Folder**: loads `(organization_id, access_scope, created_by)` -- no `inherit_from_folder` field
- **Page**: loads `(organization_id, access_scope, folder_id, inherit_from_folder, created_by)`

Later, the function accesses `_item.inherit_from_folder` regardless of item type. PL/pgSQL throws an error because the field doesn't exist on the folder record. Admin/Owner/HR users never hit this line because they return `true` earlier (at the role check). Regular members like Sarah reach this line and the function crashes, causing the RLS policy to deny access to ALL folders and root-level pages.

### Why the `can_edit_wiki_item` Function Works

The edit function uses separate variables (`_permission_level`, `_created_by`, `_inherit_from_folder`, `_folder_id`) instead of a single record, avoiding the field-access issue entirely.

### Fix

**Database migration** -- Rewrite `can_view_wiki_item` to use separate variables (matching the pattern from `can_edit_wiki_item`) instead of accessing fields on a dynamically-typed record:

```text
Key changes:
1. Replace _item record with individual variables:
   _org_id, _access_scope, _created_by, _inherit_from_folder, _folder_id
2. Only assign _inherit_from_folder and _folder_id when item type is 'page'
3. Default _inherit_from_folder to false for folders
```

This ensures the `inherit_from_folder` check only runs when the variable is properly set, eliminating the crash for folder visibility checks.

### Impact

- All non-admin users will immediately be able to see `company`-scoped folders (and pages) they previously couldn't access
- No frontend code changes needed -- the RLS policy and existing queries remain the same
- The `can_edit_wiki_item` function is already correct and needs no changes
