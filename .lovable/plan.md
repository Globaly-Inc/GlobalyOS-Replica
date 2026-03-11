

## Fix Source Tags & Verify Auto-Sync

### Problem 1: All members show "Manual" badge
The `addAllMembers` code now sets `source: 'auto_sync'`, but all existing spaces were created before the fix took effect. Additionally, the DB trigger `auto_add_space_creator_as_admin` doesn't set `source`, so it defaults to `'manual'`.

### Problem 2: UI shows wrong badge
The UI shows a "Manual" badge but should show "Auto" for `auto_sync` members. The logic is inverted — auto-synced members don't need a special tag; manually-added ones do (or vice versa).

### Problem 3: Auto-sync on profile changes
DB triggers already exist (`sync_company_space_members`, etc.) that handle adding/removing members when department, office, or project changes. These set `source: 'auto_sync'` correctly. No code changes needed here — the triggers are in place.

---

### Changes

**1. Data fix — Update existing member sources**
Run a data update to set `source = 'auto_sync'` for all members in spaces that have `auto_sync_members = true` (excluding the creator/admin who should be `'space_creation'`).

**2. `src/components/chat/ChatRightPanelEnhanced.tsx`** — Fix badge display
- Change the badge from showing "Manual" to showing "Auto" for `source === 'auto_sync'`
- Show "Auto" badge with a sync icon for auto-synced members
- Remove or keep "Manual" as needed

**3. `src/components/chat/SpaceMembersDialog.tsx`** — Same badge fix

**4. DB trigger fix (migration)** — Update `auto_add_space_creator_as_admin` to set `source = 'space_creation'` instead of letting it default to `'manual'`

### Technical Detail
- The `chat_space_members.source` column defaults to `'manual'` — the trigger and old code path both relied on this default
- DB triggers for employee department/project/office changes already exist and correctly sync members with `source: 'auto_sync'`
- Data update will fix ~44 existing records across recently created spaces

