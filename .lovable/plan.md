

## Add Auto-Assign Assignment Toggle to Pipeline Settings

### Problem
When the auto-assignment template selector was removed (since assignments are already linked to positions), the ability to enable/disable auto-sending of the assignment email at a specific stage was also lost. We need a simple toggle to control this behavior.

### Solution
Add a boolean toggle per stage called "Auto-assign assignment" that, when enabled, will automatically trigger the assignment email when a candidate enters that stage. No template selector is needed since the assignment is already linked to the vacancy position.

### Changes

**1. Database Migration**
- Add a new boolean column `auto_assign_enabled` (default `false`) to the `pipeline_stage_rules` table
- This is cleaner than repurposing the existing `auto_assignment_template_id` column

**2. `src/components/hiring/PipelineSettingsSection.tsx`**
- Add `auto_assign_enabled` to the `StageRule` interface
- Add a toggle row between the "Enable automation" toggle and the "Auto-Reject Rules" section:
  - Icon: Zap
  - Label: "Auto-assign assignment"
  - Description: "Automatically send the linked assignment when a candidate enters this stage"
- Include the new field in the save/load logic

### UI Preview

When a stage is active, the settings will show:

```text
[Toggle] Enable automation for this stage

  [Toggle] Auto-assign assignment
           Automatically send the linked assignment when a candidate enters this stage

  Auto-Reject Rules
  [Toggle] Auto-reject when assignment deadline passes
  Auto-reject after [__] hours in this stage

  Stage Notifications
  [Select team member...]
```

### Technical Notes
- No new dependencies
- The actual backend trigger (sending the email when stage changes) is a follow-up task -- this stores the configuration
- The `auto_assignment_template_id` column remains in the table but unused for now; can be cleaned up later
