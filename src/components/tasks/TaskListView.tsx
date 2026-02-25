import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import { TaskQuickAdd } from './TaskQuickAdd';
import { useEmployees } from '@/services/useEmployees';
import type { TaskStatusRow, TaskWithRelations, TaskCategoryRow } from '@/types/task';
import type { ColumnConfig } from './TaskColumnCustomizer';

interface TaskListViewProps {
  statuses: TaskStatusRow[];
  tasks: TaskWithRelations[];
  categories: TaskCategoryRow[];
  spaceId: string;
  listId?: string | null;
  onTaskClick: (taskId: string) => void;
  columns?: ColumnConfig[];
}

export const TaskListView = ({ statuses, tasks, categories, spaceId, listId, onTaskClick, columns }: TaskListViewProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addingInStatus, setAddingInStatus] = useState<string | null>(null);

  const { data: employeesData } = useEmployees({ status: 'active' });
  const members = ((employeesData || []) as any[]).map((e: any) => ({
    id: e.id,
    full_name: e.full_name || '',
    avatar_url: e.avatar_url || null,
  }));

  const visibleColumns = columns?.filter(c => c.visible) || [
    { key: 'name', label: 'Name', visible: true },
    { key: 'category', label: 'Category', visible: true },
    { key: 'assignee', label: 'Assignee', visible: true },
    { key: 'tags', label: 'Tags', visible: true },
    { key: 'comments', label: 'Comments', visible: true },
    { key: 'attachments', label: 'Attachments', visible: true },
    { key: 'priority', label: 'Priority', visible: true },
  ];

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

  const gridStyle = {
    gridTemplateColumns: visibleColumns.map(col => {
      switch (col.key) {
        case 'name': return '1fr';
        case 'category': return '120px';
        case 'assignee': return '100px';
        case 'tags': return '120px';
        case 'comments': return '60px';
        case 'attachments': return '60px';
        case 'priority': return '80px';
        case 'due_date': return '100px';
        default: return '100px';
      }
    }).join(' '),
  };

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
                  <div
                    className={cn('grid gap-2', 'px-3 py-1 text-xs text-muted-foreground border-t bg-muted/20')}
                    style={gridStyle}
                  >
                    {visibleColumns.map(col => (
                      <span
                        key={col.key}
                        className={cn(
                          (col.key === 'comments' || col.key === 'attachments') && 'text-center'
                        )}
                      >
                        {col.key === 'comments' ? '💬' : col.key === 'attachments' ? '📎' : col.label}
                      </span>
                    ))}
                  </div>
                )}

                {statusTasks.map(task => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                    visibleColumns={visibleColumns}
                    gridStyle={gridStyle}
                    categories={categories}
                    members={members}
                  />
                ))}

                {/* Quick add */}
                {addingInStatus === status.id ? (
                  <TaskQuickAdd
                    spaceId={spaceId}
                    statusId={status.id}
                    categories={categories}
                    listId={listId}
                    onDone={() => setAddingInStatus(null)}
                    visibleColumns={visibleColumns}
                    gridStyle={gridStyle}
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
