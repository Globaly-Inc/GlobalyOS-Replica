import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import { TaskQuickAdd } from './TaskQuickAdd';
import type { TaskStatusRow, TaskWithRelations, TaskCategoryRow } from '@/types/task';

interface TaskListViewProps {
  statuses: TaskStatusRow[];
  tasks: TaskWithRelations[];
  categories: TaskCategoryRow[];
  spaceId: string;
  onTaskClick: (taskId: string) => void;
}

export const TaskListView = ({ statuses, tasks, categories, spaceId, onTaskClick }: TaskListViewProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addingInStatus, setAddingInStatus] = useState<string | null>(null);

  const toggleGroup = (statusId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(statusId) ? next.delete(statusId) : next.add(statusId);
      return next;
    });
  };

  const tasksByStatus = statuses.map(status => ({
    status,
    tasks: tasks.filter(t => t.status_id === status.id),
  }));

  return (
    <div className="space-y-1">
      {tasksByStatus.map(({ status, tasks: statusTasks }) => {
        const isCollapsed = collapsedGroups.has(status.id);
        return (
          <div key={status.id} className="rounded-lg border bg-card overflow-hidden">
            {/* Status header */}
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleGroup(status.id)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: status.color || '#6b7280' }}
              />
              <span className="text-sm font-medium">{status.name}</span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {statusTasks.length}
              </Badge>
              <div className="flex-1" />
              <button
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddingInStatus(status.id);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Task rows */}
            {!isCollapsed && (
              <div>
                {/* Column headers */}
                {statusTasks.length > 0 && (
                  <div className="grid grid-cols-[1fr_120px_100px_120px_60px_60px_80px] gap-2 px-3 py-1 text-xs text-muted-foreground border-t bg-muted/20">
                    <span>Name</span>
                    <span>Category</span>
                    <span>Assignee</span>
                    <span>Tags</span>
                    <span className="text-center">💬</span>
                    <span className="text-center">📎</span>
                    <span>Priority</span>
                  </div>
                )}

                {statusTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                  />
                ))}

                {/* Quick add */}
                {addingInStatus === status.id ? (
                  <TaskQuickAdd
                    spaceId={spaceId}
                    statusId={status.id}
                    categories={categories}
                    onDone={() => setAddingInStatus(null)}
                  />
                ) : (
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t"
                    onClick={() => setAddingInStatus(status.id)}
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Task</span>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
