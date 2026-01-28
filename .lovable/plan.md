

# Auto-Sync Realtime Updates and Activity Logs for Space Members

## Overview

This plan implements three features:
1. **Realtime updates** for space members list - instantly reflect auto-sync changes
2. **Activity log table** for tracking member additions/removals by auto-sync
3. **Log display UI** in the right panel to show auto-sync activity

---

## Current Behavior vs. Expected Behavior

| Aspect | Current | Expected |
|--------|---------|----------|
| Member list updates | Requires manual page refresh | Instant via Supabase Realtime subscription |
| Database trigger logs | No logging | Log every add/remove with "auto_sync" source |
| UI log visibility | None | Collapsible section in right panel showing recent sync activity |

---

## Implementation

### Part 1: Create Activity Log Table

**Database Migration: `chat_space_member_logs`**

```sql
CREATE TABLE public.chat_space_member_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.chat_spaces(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('added', 'removed')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto_sync', 'space_creation')),
  performed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_space_member_logs_space ON public.chat_space_member_logs(space_id);
CREATE INDEX idx_space_member_logs_created ON public.chat_space_member_logs(created_at DESC);
CREATE INDEX idx_space_member_logs_org ON public.chat_space_member_logs(organization_id);

-- Enable RLS
ALTER TABLE public.chat_space_member_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Space members can view logs"
  ON public.chat_space_member_logs FOR SELECT
  USING (is_space_member(space_id, get_current_employee_id_for_org(organization_id)));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_space_member_logs;
```

---

### Part 2: Update Database Triggers to Log Auto-Sync Actions

**Modify `sync_company_space_members` function:**

```sql
CREATE OR REPLACE FUNCTION sync_company_space_members()
RETURNS TRIGGER AS $$
DECLARE
  inserted_row RECORD;
  deleted_space_id UUID;
BEGIN
  -- Employee became active: add to all company-wide auto-sync spaces
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active') THEN
    FOR inserted_row IN
      INSERT INTO chat_space_members (space_id, employee_id, organization_id, role)
      SELECT cs.id, NEW.id, cs.organization_id, 'member'
      FROM chat_spaces cs
      WHERE cs.organization_id = NEW.organization_id
        AND cs.access_scope = 'company'
        AND cs.auto_sync_members = true
        AND cs.archived_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM chat_space_members csm 
          WHERE csm.space_id = cs.id AND csm.employee_id = NEW.id
        )
      RETURNING space_id, organization_id
    LOOP
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (inserted_row.space_id, NEW.id, inserted_row.organization_id, 'added', 'auto_sync');
    END LOOP;
  END IF;

  -- Employee became inactive: remove from all auto-sync spaces (with logging)
  IF NEW.status = 'inactive' AND OLD.status = 'active' THEN
    FOR deleted_space_id IN
      SELECT id FROM chat_spaces 
      WHERE organization_id = NEW.organization_id
        AND auto_sync_members = true
    LOOP
      DELETE FROM chat_space_members
      WHERE employee_id = NEW.id AND space_id = deleted_space_id;
      
      -- Log removal
      INSERT INTO chat_space_member_logs (space_id, employee_id, organization_id, action_type, source)
      VALUES (deleted_space_id, NEW.id, NEW.organization_id, 'removed', 'auto_sync');
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Modify `sync_office_space_members` function similarly** to log additions and removals.

---

### Part 3: Add Realtime Hook for Space Members

**New File: `src/services/useSpaceMembersRealtime.ts`**

```typescript
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSpaceMembersRealtime = (spaceId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!spaceId) return;

    const channel = supabase
      .channel(`space-members-${spaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_space_members',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-space-members', spaceId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_space_member_logs',
          filter: `space_id=eq.${spaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-space-member-logs', spaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, queryClient]);
};
```

---

### Part 4: Create Hook for Fetching Member Logs

**New File: `src/services/useSpaceMemberLogs.ts`**

```typescript
export const useSpaceMemberLogs = (spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-space-member-logs', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];

      const { data, error } = await supabase
        .from('chat_space_member_logs')
        .select(`
          *,
          employee:employees!chat_space_member_logs_employee_id_fkey (
            id,
            profiles:user_id (full_name, avatar_url)
          )
        `)
        .eq('space_id', spaceId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
  });
};
```

---

### Part 5: Add Activity Log Section to Right Panel

**File: `src/components/chat/ChatRightPanelEnhanced.tsx`**

Add a new collapsible section below the Members section:

```tsx
{/* Auto-Sync Activity Logs (only for spaces with auto-sync enabled) */}
{spaceId && autoSyncEnabled && (
  <Collapsible open={activityOpen} onOpenChange={setActivityOpen} className="border-b border-border">
    <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
        Sync Activity
        <span className="text-xs text-muted-foreground font-normal">
          ({autoSyncLogs?.length || 0})
        </span>
      </h4>
      {activityOpen ? <ChevronUp /> : <ChevronDown />}
    </CollapsibleTrigger>
    <CollapsibleContent className="px-4 pb-4">
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {autoSyncLogs?.filter(log => log.source === 'auto_sync').slice(0, 20).map(log => (
          <div key={log.id} className="flex items-center gap-2 text-xs">
            <Avatar className="h-5 w-5">
              <AvatarImage src={log.employee?.profiles?.avatar_url} />
              <AvatarFallback>{log.employee?.profiles?.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <span className="truncate">{log.employee?.profiles?.full_name}</span>
            <Badge variant={log.action_type === 'added' ? 'default' : 'destructive'} className="text-[10px]">
              {log.action_type}
            </Badge>
            <span className="text-muted-foreground ml-auto">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
          </div>
        ))}
        {(!autoSyncLogs || autoSyncLogs.filter(l => l.source === 'auto_sync').length === 0) && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No auto-sync activity yet
          </p>
        )}
      </div>
    </CollapsibleContent>
  </Collapsible>
)}
```

---

### Part 6: Integrate Realtime Hook

**File: `src/components/chat/ChatRightPanelEnhanced.tsx`**

Add the realtime subscription:

```typescript
// Near the top with other hooks
useSpaceMembersRealtime(spaceId);

const { data: autoSyncLogs = [] } = useSpaceMemberLogs(spaceId);
const [activityOpen, setActivityOpen] = useState(false);
```

---

## Summary of Changes

| File/Resource | Type | Description |
|---------------|------|-------------|
| Database migration | Add | Create `chat_space_member_logs` table with RLS and realtime |
| Database migration | Modify | Update `sync_company_space_members` trigger to log actions |
| Database migration | Modify | Update `sync_office_space_members` trigger to log actions |
| `src/services/useSpaceMembersRealtime.ts` | Add | Realtime subscription hook for instant member updates |
| `src/services/useSpaceMemberLogs.ts` | Add | Hook to fetch member activity logs |
| `src/components/chat/ChatRightPanelEnhanced.tsx` | Modify | Add realtime hook + activity log section UI |

---

## After This Fix

1. When auto-sync triggers (employee becomes active/inactive or changes office), the member list updates instantly in the right panel without refresh
2. All auto-sync member additions/removals are logged with timestamps
3. Space admins can see a "Sync Activity" section showing who was added/removed by auto-sync and when
4. Logs clearly distinguish between "manual" and "auto_sync" sources

