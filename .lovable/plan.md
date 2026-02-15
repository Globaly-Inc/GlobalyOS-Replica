

## Open WikiShareDialog from Share Button

### What Changes

The Share button on the wiki editor page currently just copies the URL to clipboard. Instead, it will open the existing `WikiShareDialog` component -- the same dialog already used in the wiki folder/page views -- which lets you add people, set access scopes, and manage permissions (matching the reference screenshot).

### Technical Changes

**`src/pages/WikiEditPage.tsx`:**
- Import `WikiShareDialog` from `@/components/wiki/WikiShareDialog`
- Add a `shareDialogOpen` state (boolean, default `false`)
- Change the Share button's `onClick` to set `shareDialogOpen` to `true`
- Render `WikiShareDialog` at the bottom of the component with:
  - `open={shareDialogOpen}`
  - `onOpenChange={setShareDialogOpen}`
  - `itemType="page"`
  - `itemId={pageId}`
  - `itemName={editTitle}`
  - `organizationId={currentOrg.id}`
  - `currentFolderId` from the fetched page data

No new components, database changes, or dependencies required -- the dialog and all its logic already exist.

