import { useState, useRef, useEffect, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TaskBulkActionsBar } from './TaskBulkActionsBar';
import { cn } from '@/lib/utils';
import { useUpdateTask, useDeleteTask, useBulkDeleteTasks } from '@/services/useTasks';
import type { TaskStatusRow, TaskWithRelations, TaskCategoryRow } from '@/types/task';
import { toast } from 'sonner';

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

interface TaskBoardViewProps {
  statuses: TaskStatusRow[];
  tasks: TaskWithRelations[];
  categories: TaskCategoryRow[];
  spaceId: string;
  onTaskClick: (taskId: string) => void;
  onAddTaskInStatus?: (statusId: string) => void;
  onAddTaskWithTitle?: (statusId: string, title: string) => void;
}

export const TaskBoardView = ({ statuses, tasks, categories, spaceId, onTaskClick, onAddTaskInStatus, onAddTaskWithTitle }: TaskBoardViewProps) => {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const updateTask = useUpdateTask();
  const bulkDelete = useBulkDeleteTasks();

  const selectionActive = selectedTaskIds.size > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    let targetStatusId: string | null = null;
    const overStatus = statuses.find(s => s.id === over.id);
    if (overStatus) {
      targetStatusId = overStatus.id;
    } else {
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        targetStatusId = overTask.status_id;
      }
    }

    if (targetStatusId && targetStatusId !== task.status_id) {
      updateTask.mutate({ id: taskId, status_id: targetStatusId });
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

  const tasksByStatus = statuses.map(status => ({
    status,
    tasks: tasks.filter(t => t.status_id === status.id),
  }));

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          {tasksByStatus.map(({ status, tasks: columnTasks }) => (
            <BoardColumn
              key={status.id}
              status={status}
              tasks={columnTasks}
              categories={categories}
              spaceId={spaceId}
              onTaskClick={onTaskClick}
              onAddTask={() => onAddTaskInStatus?.(status.id)}
              onAddTaskWithTitle={onAddTaskWithTitle ? (title) => onAddTaskWithTitle(status.id, title) : undefined}
              selectionActive={selectionActive}
              selectedTaskIds={selectedTaskIds}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} onClick={() => {}} isDragging spaceId={spaceId} selectionActive={false} selected={false} onToggleSelect={() => {}} />}
        </DragOverlay>
      </DndContext>

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
    </>
  );
};

// ─── Column ───

interface BoardColumnProps {
  status: TaskStatusRow;
  tasks: TaskWithRelations[];
  categories: TaskCategoryRow[];
  spaceId: string;
  onTaskClick: (taskId: string) => void;
  onAddTask: () => void;
  onAddTaskWithTitle?: (title: string) => void;
  selectionActive: boolean;
  selectedTaskIds: Set<string>;
  onToggleSelect: (taskId: string) => void;
}

const BoardColumn = ({ status, tasks, categories, spaceId, onTaskClick, onAddTask, onAddTaskWithTitle, selectionActive, selectedTaskIds, onToggleSelect }: BoardColumnProps) => {
  const taskIds = tasks.map(t => t.id);
  const { setNodeRef: setDropRef } = useDroppable({ id: status.id });
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [inlineTitle, setInlineTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingInline && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingInline]);

  const handleAddClick = () => {
    if (onAddTaskWithTitle) {
      setIsAddingInline(true);
      setInlineTitle('');
    } else {
      onAddTask();
    }
  };

  const handleInlineSubmit = () => {
    const trimmed = inlineTitle.trim();
    setIsAddingInline(false);
    setInlineTitle('');
    if (trimmed && onAddTaskWithTitle) {
      onAddTaskWithTitle(trimmed);
    }
  };

  const handleInlineCancel = () => {
    setIsAddingInline(false);
    setInlineTitle('');
  };

  return (
    <div className="w-72 shrink-0 flex flex-col bg-muted/30 rounded-lg border" ref={setDropRef}>
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b">
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: status.color || '#6b7280' }}
        />
        <span className="text-sm font-medium flex-1 truncate">{status.name}</span>
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{tasks.length}</Badge>
        <button
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleAddClick}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy} id={status.id}>
          <div className="space-y-2 min-h-[40px]">
            {tasks.map(task => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
                spaceId={spaceId}
                selectionActive={selectionActive}
                selected={selectedTaskIds.has(task.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </div>
        </SortableContext>

        {/* Inline add input */}
        {isAddingInline && (
          <div className="mt-2 flex items-center gap-1">
            <Input
              ref={inputRef}
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInlineSubmit();
                if (e.key === 'Escape') handleInlineCancel();
              }}
              onBlur={() => {
                setTimeout(() => {
                  if (isAddingInline) handleInlineCancel();
                }, 150);
              }}
              placeholder="Task name..."
              className="h-8 text-sm flex-1"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={handleInlineCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Add task button at bottom */}
      <button
        className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t"
        onClick={handleAddClick}
      >
        <Plus className="h-3 w-3" />
        <span>Add Task</span>
      </button>
    </div>
  );
};

// ─── Sortable Card Wrapper ───

const SortableTaskCard = ({ task, onClick, spaceId, selectionActive, selected, onToggleSelect }: { task: TaskWithRelations; onClick: () => void; spaceId: string; selectionActive: boolean; selected: boolean; onToggleSelect: (id: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} spaceId={spaceId} selectionActive={selectionActive} selected={selected} onToggleSelect={onToggleSelect} />
    </div>
  );
};

// ─── Card ───

const TaskCard = ({ task, onClick, isDragging, spaceId, selectionActive, selected, onToggleSelect }: { task: TaskWithRelations; onClick: () => void; isDragging?: boolean; spaceId: string; selectionActive: boolean; selected: boolean; onToggleSelect: (id: string) => void }) => {
  const priority = priorityConfig[task.priority] || priorityConfig.normal;
  const deleteTask = useDeleteTask();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id, spaceId }, {
      onSuccess: () => toast.success('Task deleted'),
      onError: () => toast.error('Failed to delete task'),
    });
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div
        className={cn(
          'bg-card rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow space-y-2 group relative',
          isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/20',
          selected && 'ring-2 ring-primary'
        )}
        onClick={onClick}
      >
        {/* Checkbox overlay */}
        <div
          className={cn(
            'absolute top-2 left-2 z-10',
            selectionActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            'transition-opacity'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(task.id)}
            className="bg-card"
          />
        </div>

        {/* Title + actions */}
        <div className={cn('flex items-start justify-between gap-1', selectionActive && 'pl-6')}>
          <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {task.category && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 gap-1">
              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.category.color || '#6b7280' }} />
              {task.category.name}
            </Badge>
          )}
          <Badge variant="secondary" className={cn('text-[10px] h-4 px-1', priority.className)}>
            {priority.label}
          </Badge>
          {(task.tags || []).slice(0, 1).map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {task.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">{task.assignee.full_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            )}
            {task.due_date && (
              <span className="text-[10px] text-muted-foreground">{task.due_date}</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {(task.comment_count || 0) > 0 && <span>💬 {task.comment_count}</span>}
            {(task.checklist_total || 0) > 0 && <span>✓ {task.checklist_done}/{task.checklist_total}</span>}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
