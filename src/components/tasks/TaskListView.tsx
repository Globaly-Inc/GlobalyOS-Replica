import { useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Paperclip, Check, MessageSquare, Link2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { TaskRow } from './TaskRow';
import { useEmployees } from '@/services/useEmployees';
import { useCreateTask, useBulkDeleteTasks } from '@/services/useTasks';
import { useTaskCustomFields } from '@/services/useTaskCustomFields';
import { PrioritySelector, CategorySelector, AssigneeSelector, DueDateSelector, TagsSelector } from './TaskInlineCellEditors';
import CategoryIcon from './CategoryIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TaskBulkActionsBar } from './TaskBulkActionsBar';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import type { TaskStatusRow, TaskWithRelations, TaskCategoryRow } from '@/types/task';
import type { ColumnConfig } from './TaskColumnCustomizer';
import { useColumnResize } from '@/hooks/useColumnResize';
import { RelatedToPopover } from './RelatedToPopover';

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
  isAllTasksMode?: boolean;
  statusIdMap?: Map<string, string[]>;
}

export const TaskListView = ({ statuses, tasks, categories, spaceId, listId, onTaskClick, columns, isAllTasksMode, statusIdMap }: TaskListViewProps) => {
  const { handleMouseDown: handleColResize, getGridTemplate } = useColumnResize();
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [addingInStatusId, setAddingInStatusId] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlinePriority, setInlinePriority] = useState('normal');
  const [inlineCategoryId, setInlineCategoryId] = useState<string | null>(null);
  const [inlineAssigneeId, setInlineAssigneeId] = useState<string | null>(null);
  const [inlineDueDate, setInlineDueDate] = useState<string | null>(null);
  const [inlineTags, setInlineTags] = useState<string[]>([]);
  const [inlineRelatedEntityType, setInlineRelatedEntityType] = useState<string | null>(null);
  const [inlineRelatedEntityId, setInlineRelatedEntityId] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createTask = useCreateTask();
  const bulkDelete = useBulkDeleteTasks();
  const { data: customFieldDefs = [] } = useTaskCustomFields(spaceId);

  const { data: employeesData } = useEmployees({ status: 'active' });
  const members = ((employeesData || []) as any[]).map((e: any) => ({
    id: e.id,
    full_name: e.profiles?.full_name || '',
    avatar_url: e.profiles?.avatar_url || null,
  }));

  // Collect all unique tags from loaded tasks
  const allTags = Array.from(new Set(tasks.flatMap(t => t.tags || []))).sort();

  const visibleColumns = columns?.filter(c => c.visible) || [
    { key: 'name', label: 'Name', visible: true },
    { key: 'category', label: 'Category', visible: true },
    { key: 'assignee', label: 'Assignee', visible: true },
    { key: 'tags', label: 'Tags', visible: true },
    { key: 'comments', label: 'Comments', visible: true },
    { key: 'attachments', label: 'Attachments', visible: true },
    { key: 'priority', label: 'Priority', visible: true },
  ];

  const selectionActive = selectedTaskIds.size > 0;

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
    setInlineTags([]);
    setInlineRelatedEntityType(null);
    setInlineRelatedEntityId(null);
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
        tags: inlineTags.length > 0 ? inlineTags : undefined,
      });
      toast.success('Task created');
      resetInline();
    } catch {
      toast.error('Failed to create task');
    }
  };

  const handleToggleSelect = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedTaskIds(new Set(tasks.map(t => t.id)));
  }, [tasks]);

  const handleDeselectAll = useCallback(() => {
    setSelectedTaskIds(new Set());
  }, []);

  const handleBulkDelete = () => {
    bulkDelete.mutate({ ids: [...selectedTaskIds], spaceId }, {
      onSuccess: () => {
        toast.success(`${selectedTaskIds.size} task(s) deleted`);
        setSelectedTaskIds(new Set());
      },
      onError: () => toast.error('Failed to delete tasks'),
    });
    setShowBulkDeleteDialog(false);
  };

  const tasksByStatus = (() => {
    if (!isAllTasksMode || !statusIdMap) {
      return statuses.map(status => ({
        status,
        tasks: tasks.filter(t => t.status_id === status.id),
      }));
    }
    // In all-tasks mode, use statusIdMap to collect all equivalent status IDs per representative
    return statuses.map(status => {
      const allIds = new Set(statusIdMap.get(status.id) || [status.id]);
      return {
        status,
        tasks: tasks.filter(t => allIds.has(t.status_id)),
      };
    });
  })();

  const gridStyle = {
    gridTemplateColumns: getGridTemplate(visibleColumns, selectionActive),
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
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground truncate hover:text-foreground transition-colors text-left w-full" onClick={(e) => e.stopPropagation()}>
              {category ? <CategoryIcon iconName={category.icon} fallbackColor={category.color} size={12} style={{ color: category.color || undefined }} /> : null}
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
        return (
          <TagsSelector value={inlineTags} allTags={allTags} onChange={setInlineTags}>
            <button className="flex gap-1 overflow-hidden w-full hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
              {inlineTags.length > 0 ? (
                inlineTags.slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0">{tag}</Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </button>
          </TagsSelector>
        );
      case 'comments':
        return <span className="text-xs text-muted-foreground text-center">—</span>;
      case 'attachments':
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center justify-center text-muted-foreground/50 cursor-not-allowed">
                <Paperclip className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Save task first to attach files</TooltipContent>
          </Tooltip>
        );
      default:
        // Custom field columns render as dash in inline creation
        if (col.key.startsWith('custom_')) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return null;
    }
  };

  return (
    <div className="overflow-auto flex-1 min-h-0">
      <div className="min-w-max space-y-1">
      {tasksByStatus.map(({ status, tasks: statusTasks }) => {
        const isCollapsed = collapsedGroups.has(status.id);
        const allStatusSelected = statusTasks.length > 0 && statusTasks.every(t => selectedTaskIds.has(t.id));
        const someStatusSelected = statusTasks.some(t => selectedTaskIds.has(t.id));

        return (
          <div key={status.id} className="rounded-lg overflow-hidden">
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
              <span className="text-sm font-medium" style={{ color: status.color || undefined }}>{status.name}</span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                {statusTasks.length}
              </Badge>
              <div className="flex-1" />
            </div>

            {/* Task rows */}
            {!isCollapsed && (
              <div>
                {/* Column headers */}
                {(statusTasks.length > 0 || addingInStatusId === status.id) && (
                  <div
                    className={cn('grid gap-2 items-center', 'px-3 py-1 text-xs text-muted-foreground border-t bg-muted/20')}
                    style={gridStyle}
                  >
                    {selectionActive && (
                      <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={allStatusSelected}
                          onCheckedChange={() => {
                            if (allStatusSelected) {
                              setSelectedTaskIds(prev => {
                                const next = new Set(prev);
                                statusTasks.forEach(t => next.delete(t.id));
                                return next;
                              });
                            } else {
                              setSelectedTaskIds(prev => {
                                const next = new Set(prev);
                                statusTasks.forEach(t => next.add(t.id));
                                return next;
                              });
                            }
                          }}
                        />
                      </div>
                    )}
                    {visibleColumns.map((col, idx) => (
                      <span
                        key={col.key}
                        className={cn(
                          'relative select-none',
                          (col.key === 'comments' || col.key === 'attachments') && 'text-center'
                        )}
                      >
                        {col.key === 'comments' ? <MessageSquare className="h-4 w-4 text-muted-foreground mx-auto" /> : col.key === 'attachments' ? '📎' : col.label}
                        {/* Resize handle — skip for the last column and 'name' (flex) */}
                        {col.key !== 'name' && idx < visibleColumns.length - 1 && (
                          <div
                            className="absolute right-0 top-0 h-full w-[5px] cursor-col-resize z-10 group hover:bg-primary/20 transition-colors"
                            style={{ transform: 'translateX(50%)' }}
                            onMouseDown={(e) => handleColResize(e, col.key)}
                          >
                            <div className="absolute right-[2px] top-1/2 -translate-y-1/2 h-3 w-px bg-border group-hover:bg-primary transition-colors" />
                          </div>
                        )}
                        {/* Right-edge resize handle for last non-name column */}
                        {col.key !== 'name' && idx === visibleColumns.length - 1 && (
                          <div
                            className="absolute right-0 top-0 h-full w-[5px] cursor-col-resize z-10 group hover:bg-primary/20 transition-colors"
                            style={{ transform: 'translateX(50%)' }}
                            onMouseDown={(e) => handleColResize(e, col.key)}
                          >
                            <div className="absolute right-[2px] top-1/2 -translate-y-1/2 h-3 w-px bg-border group-hover:bg-primary transition-colors" />
                          </div>
                        )}
                        {/* Resize handle on the right edge of 'name' column */}
                        {col.key === 'name' && visibleColumns.length > 1 && (
                          <div
                            className="absolute right-0 top-0 h-full w-[5px] cursor-col-resize z-10 group hover:bg-primary/20 transition-colors"
                            style={{ transform: 'translateX(50%)' }}
                            onMouseDown={(e) => handleColResize(e, visibleColumns[idx + 1]?.key)}
                          >
                            <div className="absolute right-[2px] top-1/2 -translate-y-1/2 h-3 w-px bg-border group-hover:bg-primary transition-colors" />
                          </div>
                        )}
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
                    statuses={statuses}
                    members={members}
                    spaceId={spaceId}
                    selected={selectedTaskIds.has(task.id)}
                    onToggleSelect={selectionActive ? handleToggleSelect : undefined}
                    allTags={allTags}
                    isAllTasksMode={isAllTasksMode}
                    customFieldDefs={customFieldDefs}
                  />
                ))}

                {/* Inline creation row */}
                {!isAllTasksMode && addingInStatusId === status.id && (
                  <div
                    className="grid gap-2 px-3 py-2 items-center border-t bg-primary/5 text-sm"
                    style={gridStyle}
                  >
                    {selectionActive && <div />}
                    {visibleColumns.map(col => (
                      <div key={col.key}>{renderInlineCell(col, status.id)}</div>
                    ))}
                    <div className="flex items-center justify-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleCreateInline(status.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Save</TooltipContent>
                      </Tooltip>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={resetInline}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add task button */}
                {!isAllTasksMode && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 w-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t"
                    onClick={() => handleStartInline(status.id)}
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

      <TaskBulkActionsBar
        selectedCount={selectedTaskIds.size}
        totalItems={tasks.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onDelete={() => setShowBulkDeleteDialog(true)}
      />

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedTaskIds.size} task(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTaskIds.size} task(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
};
