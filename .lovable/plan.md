
# Add 3-Dot Menu for Admin's Own Row with Leave Group Option

## Overview

Currently, the 3-dot action menu is hidden for the admin's own row (`!isSelf` condition). This change will show a menu for admins on their own row with a "Leave Group" option that properly handles admin transfer when required.

---

## UI Preview

```text
Current State:
+------------------------------------------+
| [Avatar] Amit Ranjitkar  [Admin]         |
|          amit@globalyhub.com             |
+------------------------------------------+

After Change:
+------------------------------------------+
| [Avatar] Amit Ranjitkar  [Admin]   [...] |  <-- 3-dots appear on hover
|          amit@globalyhub.com             |
+------------------------------------------+

Dropdown Menu (for admin's own row):
+------------------------+
| [LogOut] Leave Group   |
+------------------------+
```

**Behavior:**
- If there are 2+ admins: Leaves immediately (with confirmation)
- If sole admin: Opens Transfer Admin Dialog to select new admin before leaving

---

## Implementation

### File: `src/components/chat/ChatRightPanelEnhanced.tsx`

#### 1. Update dropdown visibility condition (line 708)

**Current:**
```typescript
{canManageMembers && !isSelf && (
```

**New:**
```typescript
{(canManageMembers || (isSelf && isGroupAdmin)) && (
```

This shows the menu for:
- Admins viewing other members (existing)
- Admins viewing their own row (new)

#### 2. Add context-aware dropdown content

Update the DropdownMenuContent to show different actions based on `isSelf`:

```typescript
<DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
  {/* View Profile - always shown for non-self */}
  {!isSelf && (
    <DropdownMenuItem onClick={() => handleViewMember(member.employee_id)}>
      <UserCircle className="h-4 w-4 mr-2" />
      View Profile
    </DropdownMenuItem>
  )}
  
  {/* Admin management actions - only for non-self */}
  {!isSelf && canManageMembers && (
    <>
      {isAdmin ? (
        <DropdownMenuItem onClick={() => handleDemote(member)}>
          <UserMinus className="h-4 w-4 mr-2" />
          Remove Admin
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => handlePromote(member)}>
          <Crown className="h-4 w-4 mr-2" />
          Make Admin
        </DropdownMenuItem>
      )}
      <DropdownMenuItem 
        onClick={() => handleRemove(member)}
        className="text-destructive focus:text-destructive"
      >
        <UserMinus className="h-4 w-4 mr-2" />
        {spaceId ? "Remove from Space" : "Remove from Group"}
      </DropdownMenuItem>
    </>
  )}
  
  {/* Leave Group - only for self (group admin) */}
  {isSelf && isGroupAdmin && (
    <DropdownMenuItem 
      onClick={handleAdminLeaveGroup}
      className="text-destructive focus:text-destructive"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Leave Group
    </DropdownMenuItem>
  )}
</DropdownMenuContent>
```

#### 3. Add handler function for admin leaving group

Add a new handler function around line 430:

```typescript
// Handle group admin leave - check if transfer is needed
const handleAdminLeaveGroup = () => {
  if (canGroupAdminLeaveDirectly) {
    // 2+ admins exist, can leave directly (show confirmation)
    setShowLeaveConfirm(true);
  } else {
    // Sole admin, must transfer first
    setShowTransferGroupAdminDialog(true);
  }
};
```

---

## User Flow

```text
Admin clicks 3-dots on their own row
          |
          v
    [Leave Group]
          |
          v
   Are there 2+ admins?
     /         \
   Yes          No
    |            |
    v            v
 Leave       Transfer Admin
 Confirm     Dialog opens
 Dialog      (select new admin)
    |            |
    v            v
  Leaves      Transfers admin
  group       then leaves
```

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `src/components/chat/ChatRightPanelEnhanced.tsx` | ~708 | Update visibility condition |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | ~720-743 | Restructure dropdown content |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | ~430 | Add `handleAdminLeaveGroup` function |

---

## Technical Details

**Existing Components Used:**
- `TransferGroupAdminDialog` - already implemented for admin transfer
- `showLeaveConfirm` AlertDialog - already handles leave confirmation
- `canGroupAdminLeaveDirectly` - already computed (true if 2+ admins)
- `isGroupAdmin` - already computed from participant role

**No new components needed** - this leverages existing dialogs and state management.
