import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { AddTaskDialog } from '@/components/tasks/AddTaskDialog';
import { useTaskSpaces } from '@/services/useTasks';
import { format } from 'date-fns';

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  low: 'bg-muted text-muted-foreground',
};

interface CRMLinkedTasksProps {
  entityType: 'contact' | 'company' | 'deal';
  entityId: string;
}

export const CRMLinkedTasks = ({ entityType, entityId }: CRMLinkedTasksProps) => {
  const { currentOrg } = useOrganization();
  const [addOpen, setAddOpen] = useState(false);
  const { data: spaces = [] } = useTaskSpaces();
  const defaultSpace = spaces[0];

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['crm-linked-tasks', entityType, entityId, currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, priority, due_date, created_at,
          status:task_statuses(id, name, color),
          assignee:profiles!tasks_assignee_id_fkey(id, full_name, avatar_url)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('related_entity_type', entityType)
        .eq('related_entity_id', entityId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && !!entityId,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        {defaultSpace && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Task
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No tasks linked yet.</p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task: any) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.status && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5" style={{ borderColor: task.status.color || undefined, color: task.status.color || undefined }}>
                      {task.status.name}
                    </Badge>
                  )}
                  {task.priority && task.priority !== 'normal' && (
                    <Badge variant="secondary" className={`text-[10px] py-0 px-1.5 ${priorityColors[task.priority] || ''}`}>
                      {task.priority}
                    </Badge>
                  )}
                  {task.due_date && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Calendar className="h-2.5 w-2.5" />
                      {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
              {task.assignee && (
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={task.assignee.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">{task.assignee.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      )}

      {defaultSpace && (
        <AddTaskDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          spaceId={defaultSpace.id}
          defaultRelatedEntityType={entityType}
          defaultRelatedEntityId={entityId}
        />
      )}
    </div>
  );
};
