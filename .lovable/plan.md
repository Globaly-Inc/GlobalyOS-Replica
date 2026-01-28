

# Auto-Sync Triggers: Full Feature Implementation

## Overview
Implement a comprehensive display of auto-sync trigger conditions in the chat right panel, showing users exactly when and how member synchronization occurs. This involves:
1. Updating the banner UI with a detailed tooltip
2. Adding database triggers for department and project changes (currently missing)
3. Displaying scope-specific information dynamically

---

## Current State Analysis

### Existing Database Triggers
The system currently has two auto-sync triggers:

| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| `trigger_sync_company_space_members` | employees | INSERT or UPDATE of status | Adds to/removes from company-wide spaces |
| `trigger_sync_office_space_members` | employees | UPDATE of office_id | Moves between office-scoped spaces |

### Missing Triggers
Based on access scopes used (`company`, `offices`, `projects`, `custom`), the following are **not yet implemented**:
- **Department changes** (`department_id` on employees) - Needed if spaces use department scope
- **Project assignment changes** (`employee_projects` table) - Needed for project-scoped spaces

### Access Scope vs Trigger Mapping
| Access Scope | Trigger Exists? | Notes |
|--------------|-----------------|-------|
| `company` | Yes | Syncs on employee add/deactivate |
| `offices` | Yes | Syncs on office change |
| `projects` | **No** | Needs trigger on `employee_projects` table |
| `custom` | N/A | Manual member management |
| `members` | N/A | Manual member management |

---

## Implementation Plan

### Part 1: UI Enhancement - Auto-Sync Banner with Tooltip

**File:** `src/components/chat/ChatRightPanelEnhanced.tsx`

Update the auto-sync banner (lines 727-734) to include a tooltip showing the specific trigger conditions based on the space's `access_scope`.

#### Current Code (lines 727-734)
```tsx
{spaceId && autoSyncEnabled && (
  <Alert className="mb-3 bg-muted/50 border-border">
    <RefreshCw className="h-4 w-4" />
    <AlertDescription className="text-xs">
      Auto-sync enabled. Members synced with {spaceData?.access_scope === 'company' ? 'organization' : spaceData?.access_scope}.
    </AlertDescription>
  </Alert>
)}
```

#### Updated Code
```tsx
{spaceId && autoSyncEnabled && (
  <Alert className="mb-3 bg-muted/50 border-border">
    <div className="flex items-center gap-2">
      <RefreshCw className="h-4 w-4 shrink-0" />
      <AlertDescription className="text-xs flex-1">
        <span>Auto-sync enabled. Members synced with </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="underline decoration-dotted underline-offset-2 hover:text-primary transition-colors">
              {getScopeLabel(spaceData?.access_scope)}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1.5">
              <p className="font-medium text-xs">Sync triggers:</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                {getSyncTriggers(spaceData?.access_scope).map((trigger, i) => (
                  <li key={i}>{trigger}</li>
                ))}
              </ul>
              {(spaceData?.offices?.length || spaceData?.projects?.length) && (
                <>
                  <p className="font-medium text-xs mt-2">Synced with:</p>
                  <p className="text-xs text-muted-foreground">
                    {getScopedEntities(spaceData)}
                  </p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        .
      </AlertDescription>
    </div>
  </Alert>
)}
```

#### Helper Functions (add before the return statement)
```tsx
const getScopeLabel = (scope?: string) => {
  switch (scope) {
    case 'company': return 'organization';
    case 'offices': return 'office(s)';
    case 'projects': return 'project(s)';
    default: return scope || 'custom';
  }
};

const getSyncTriggers = (scope?: string): string[] => {
  const baseTriggers = [
    'New member added to the organization',
    'Team member is deactivated',
  ];
  
  switch (scope) {
    case 'company':
      return baseTriggers;
    case 'offices':
      return [
        ...baseTriggers,
        'Office assignment changed in team profile',
      ];
    case 'projects':
      return [
        ...baseTriggers,
        'Project assignment updated in team profile',
      ];
    default:
      return baseTriggers;
  }
};

const getScopedEntities = (space?: typeof spaceData) => {
  if (!space) return '';
  
  if (space.access_scope === 'offices' && space.offices?.length) {
    return space.offices.map(o => o.name).join(', ');
  }
  if (space.access_scope === 'projects' && space.projects?.length) {
    return space.projects.map(p => p.name).join(', ');
  }
  return '';
};
```

---

### Part 2: Database Triggers for Project Sync (New)

**File:** New migration for project-based auto-sync

The `employee_projects` table tracks which employees are assigned to which projects. We need a trigger to sync space membership when project assignments change.

#### Migration SQL
```sql
-- Function: Handle project assignment changes for project-scoped auto-sync spaces
CREATE OR REPLACE FUNCTION sync_project_space_members()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: Add employee to project-scoped auto-sync spaces
  IF TG_OP = 'INSERT' THEN
    INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
    SELECT cs.id, NEW.employee_id, cs.organization_id, 'member'
    FROM chat_spaces cs
    JOIN chat_space_projects csp ON csp.space_id = cs.id
    WHERE cs.organization_id = NEW.organization_id
      AND cs.access_scope = 'projects'
      AND cs.auto_sync_members = true
      AND cs.archived_at IS NULL
      AND csp.project_id = NEW.project_id
      AND NOT EXISTS (
        SELECT 1 FROM chat_space_members csm 
        WHERE csm.space_id = cs.id AND csm.employee_id = NEW.employee_id
      );
  END IF;

  -- On DELETE: Remove employee from project-scoped auto-sync spaces (if not in other matching projects)
  IF TG_OP = 'DELETE' THEN
    DELETE FROM chat_space_members csm
    WHERE csm.employee_id = OLD.employee_id
      AND csm.space_id IN (
        SELECT cs.id FROM chat_spaces cs
        JOIN chat_space_projects csp ON csp.space_id = cs.id
        WHERE cs.organization_id = OLD.organization_id
          AND cs.access_scope = 'projects'
          AND cs.auto_sync_members = true
          AND csp.project_id = OLD.project_id
      )
      -- Only remove if not still assigned via another project in the same space
      AND NOT EXISTS (
        SELECT 1 FROM employee_projects ep2
        JOIN chat_space_projects csp2 ON csp2.project_id = ep2.project_id
        WHERE ep2.employee_id = OLD.employee_id
          AND ep2.project_id != OLD.project_id
          AND csp2.space_id = csm.space_id
      );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for project assignment changes
DROP TRIGGER IF EXISTS trigger_sync_project_space_members ON employee_projects;
CREATE TRIGGER trigger_sync_project_space_members
  AFTER INSERT OR DELETE ON employee_projects
  FOR EACH ROW
  EXECUTE FUNCTION sync_project_space_members();
```

---

### Part 3: Database Triggers for Department Sync (Optional/Future)

Currently, `chat_spaces` does not use `access_scope = 'departments'` (only posts/wikis do). If this becomes needed:

```sql
-- Function: Handle department changes for department-scoped auto-sync spaces
CREATE OR REPLACE FUNCTION sync_department_space_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (OLD.department_id IS DISTINCT FROM NEW.department_id) THEN
    -- Remove from old department spaces
    IF OLD.department_id IS NOT NULL THEN
      DELETE FROM chat_space_members csm
      WHERE csm.employee_id = NEW.id
        AND csm.space_id IN (
          SELECT cs.id FROM chat_spaces cs
          JOIN chat_space_departments csd ON csd.space_id = cs.id
          WHERE cs.organization_id = NEW.organization_id
            AND cs.auto_sync_members = true
            AND csd.department_id = OLD.department_id
        );
    END IF;

    -- Add to new department spaces
    IF NEW.department_id IS NOT NULL THEN
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
      SELECT cs.id, NEW.id, cs.organization_id, 'member'
      FROM chat_spaces cs
      JOIN chat_space_departments csd ON csd.space_id = cs.id
      WHERE cs.organization_id = NEW.organization_id
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND csd.department_id = NEW.department_id
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_members csm2 
          WHERE csm2.space_id = cs.id AND csm2.employee_id = NEW.id
        );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_sync_department_space_members ON employees;
CREATE TRIGGER trigger_sync_department_space_members
  AFTER UPDATE OF department_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_department_space_members();
```

---

## Summary of Changes

| File | Type | Description |
|------|------|-------------|
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Modify | Add tooltip to auto-sync banner with trigger conditions and scoped entities |
| New migration | Create | Add `sync_project_space_members()` function and trigger for project-based auto-sync |
| (Optional) New migration | Create | Add `sync_department_space_members()` function for future department-scoped spaces |

---

## Visual Result

When a user views the chat right panel for an auto-sync enabled space, they will see:

**Banner text:** "Auto-sync enabled. Members synced with **office(s)**."

**Tooltip (on hover over "office(s)"):**
```text
Sync triggers:
• New member added to the organization
• Team member is deactivated
• Office assignment changed in team profile

Synced with:
Head Office, Remote Office
```

This provides complete transparency about when and why member lists change automatically.

