

## Replace 3-Dot Menu with Individual Icon Action Buttons

### What Changes

The current vacancy detail header has a mix of text buttons ("Publish", "View Public Page", "Edit") and a 3-dot dropdown menu hiding Pause, Resume, Close, and Delete actions. All actions will be surfaced as individual icon-only buttons with tooltips, matching the reference image style (a row of outlined/ghost icon buttons).

### Action Buttons (left to right, all with tooltips)

| Action | Icon | Tooltip | Condition | Style |
|---|---|---|---|---|
| Back | `ArrowLeft` | "Back to vacancies" | Always | `outline` |
| View Public Page | `ExternalLink` | "View public page" | `job.is_public_visible` | `outline` |
| Publish | `Globe` | "Publish vacancy" | Draft only | `default` (primary) |
| Edit | `Pencil` | "Edit vacancy" | Not closed | `outline` |
| Pause | `Pause` | "Pause vacancy" | Status = open | `outline` |
| Resume | `Play` | "Resume vacancy" | Status = paused | `outline` |
| Close | `Archive` | "Close vacancy" | Status = open or paused | `outline` |
| Delete | `Trash2` | "Delete vacancy" | Always (if no candidates) | `outline`, destructive text |

### Frontend Changes

**`src/pages/hiring/JobDetail.tsx`:**
1. Remove the `DropdownMenu` import and the entire 3-dot dropdown block (lines 244-280).
2. Replace the action area (lines 217-281) with a row of icon-only `Button` components wrapped in `Tooltip` for labels.
3. Import `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from `@/components/ui/tooltip`.
4. Each button uses `variant="outline" size="icon"` except Publish which uses `variant="default" size="icon"` and Delete which adds destructive styling.
5. Remove the text labels ("Publish", "View Public Page", "Edit") -- icons only with tooltips.
6. The "Back" button (ArrowLeft) navigates back to the vacancies list.

### Technical Notes

- The delete confirmation `AlertDialog` remains unchanged -- clicking the delete icon button triggers it as before.
- Status change handlers (`handleStatusChange`) remain the same.
- The `DropdownMenu` and `DropdownMenuContent/Item/Separator/Trigger` imports can be removed since they will no longer be used.
- No database changes required.

