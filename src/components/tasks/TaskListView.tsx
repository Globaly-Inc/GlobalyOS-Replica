import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import { useEmployees } from '@/services/useEmployees';
import { useCreateTask } from '@/services/useTasks';
import { PrioritySelector, CategorySelector, AssigneeSelector, DueDateSelector } from './TaskInlineCellEditors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import type { TaskStatusRow, TaskWithRelations, TaskCategoryRow } from '@/types/task';
import type { ColumnConfig } from './TaskColumnCustomizer';

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

interface TaskListViewProps {
  statuses: TaskStatusRow[];
  tasks: TaskWithRelations[];
  categories: TaskCategoryRow[];
  spaceId: string;
  listId?: string | null;
  onTaskClick: (taskId: string) => void;
  columns?: ColumnConfig[];
  onAddTaskInStatus?: (statusId: string) => void;
}

export const TaskListView = ({ statuses, tasks, categories, spaceId, listId, onTaskClick, columns }: TaskListViewProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addingInStatusId, setAddingInStatusId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlinePriority, setInlinePriority] = useState('normal');
  const [inlineCategoryId, setInlineCategoryId] = useState<string | null>(null);
  const [inlineAssigneeId, setInlineAssigneeId] = useState<string | null>(null);
  const [inlineDueDate, setInlineDueDate] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const createTask = useCreateTask();

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

  const resetInline = () => {
    setAddingInStatusId(null);
    setInlineTitle('');
    setInlinePriority('normal');
    setInlineCategoryId(null);
    setInlineAssigneeId(null);
    setInlineDueDate(null);
  };

  const handleStartInline = (statusId: string) => {
    resetInline();
    setAddingInStatusId(statusId);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCreateInline = async (statusId: string) => {
    if (!inlineTitle.trim()) return;
    try {
      await createTask.mutateAsync({
        space_id: spaceId,
        list_id: listId || null,
        status_id: statusId,
        title: inlineTitle.trim(),
        priority: inlinePriority as any,
        category_id: inlineCategoryId,
        assignee_id: inlineAssigneeId,
        due_date: inlineDueDate,
      });
      toast.success('Task created');
      resetInline();
    } catch {
      toast.error('Failed to create task');
    }
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

  const renderInlineCell = (col: ColumnConfig, statusId: string) => {
    const assignee = members.find(m => m.id === inlineAssigneeId);
    const category = categories.find(c => c.id === inlineCategoryId);
    const priority = priorityConfig[inlinePriority] || priorityConfig.normal;

    switch (col.key) {
      case 'name':
        return (
          <input
            ref={inputRef}
            className="w-full bg-transparent outline-none text-sm font-medium placeholder:text-muted-foreground"
            placeholder="Task name..."
            value={inlineTitle}
            onChange={(e) => setInlineTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateInline(statusId);
              if (e.key === 'Escape') resetInline();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      case 'category':
        return (
          <CategorySelector value={inlineCategoryId} categories={categories} onChange={setInlineCategoryId}>
            <button className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors text-left w-full" onClick={(e) => e.stopPropagation()}>
              {category?.name || '—'}
            </button>
          </CategorySelector>
        );
      case 'assignee':
        return (
          <AssigneeSelector value={inlineAssigneeId} members={members} onChange={setInlineAssigneeId}>
            <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity w-full" onClick={(e) => e.stopPropagation()}>
              {assignee ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={assignee.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">{assignee.full_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate">{assignee.full_name?.split(' ')[0]}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </button>
          </AssigneeSelector>
        );
      case 'priority':
        return (
          <PrioritySelector value={inlinePriority} onChange={setInlinePriority}>
            <button className="inline-flex" onClick={(e) => e.stopPropagation()}>
              <Badge variant="secondary" className={cn('text-[10px] h-5 px-1.5 justify-center cursor-pointer', priority.className)}>
                {priority.label}
              </Badge>
            </button>
          </PrioritySelector>
        );
      case 'due_date':
        return (
          <DueDateSelector value={inlineDueDate} onChange={setInlineDueDate}>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left w-full" onClick={(e) => e.stopPropagation()}>
              {inlineDueDate ? format(parseISO(inlineDueDate), 'MMM d') : '—'}
            </button>
          </DueDateSelector>
        );
      case 'tags':
      case 'comments':
      case 'attachments':
        return <span className="text-xs text-muted-foreground text-center">—</span>;
      default:
        return null;
    }
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
                  handleStartInline(status.id);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Task rows */}
            {!isCollapsed && (
              <div>
                {/* Column headers */}
                {(statusTasks.length > 0 || addingInStatusId === status.id) && (
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

                {/* Inline creation row */}
                {addingInStatusId === status.id && (
                  <div
                    className="grid gap-2 px-3 py-2 items-center border-t bg-primary/5 text-sm"
                    style={gridStyle}
                  >
                    {visibleColumns.map(col => (
                      <div key={col.key}>{renderInlineCell(col, status.id)}</div>
                    ))}
                  </div>
                )}

                {/* Add task button */}
                <button
                  className="flex items-center gap-1.5 px-3 py-2 w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t"
                  onClick={() => handleStartInline(status.id)}
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Task</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
