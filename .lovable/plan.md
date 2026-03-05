

## Add Super Admin Role Toggle in UserDetailSheet

### Summary
Add a button next to the Roles display (line 475-493) in the super admin UserDetailSheet that allows a super admin to grant or revoke `super_admin` access for the selected user.

### Changes

| File | Change |
|------|--------|
| `src/components/super-admin/UserDetailSheet.tsx` | Add a "Grant Super Admin" / "Revoke Super Admin" button next to the roles badges (around line 485). The button toggles the `super_admin` role in the `user_roles` table for the user. Include a confirmation `AlertDialog` before granting/revoking. On success, refresh the user data and show a toast. |

### Implementation Detail

- **Button placement**: Inside the roles `div` (line 476-486), after the badges list, add a small icon button (Shield icon) that says "Grant Super Admin" or "Revoke Super Admin" depending on whether `user.roles.includes('super_admin')`.
- **Confirmation dialog**: Use the existing `AlertDialog` pattern already imported in the file. Warn that this gives full platform-level access.
- **Mutation**: Insert into or delete from `user_roles` table with `role: 'super_admin'` and `user_id: user.id` (no `organization_id` needed for super_admin, matching the pattern in `useSuperAdmin.tsx`).
- **Post-action**: Call `onUserDeleted` callback (or add an `onUserUpdated` prop) to refresh the parent user list, and update local state to reflect the change immediately.

