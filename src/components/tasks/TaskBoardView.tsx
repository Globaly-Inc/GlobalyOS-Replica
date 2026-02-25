import { useState, useRef, useEffect } from 'react';
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
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useUpdateTask } from '@/services/useTasks';
import type { TaskStatusRow, TaskWithRelations, TaskCategoryRow } from '@/types/task';

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
  const updateTask = useUpdateTask();

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

    // Determine target status - over could be a task or a column
    let targetStatusId: string | null = null;

    // Check if dropped over a status column
    const overStatus = statuses.find(s => s.id === over.id);
    if (overStatus) {
      targetStatusId = overStatus.id;
    } else {
      // Dropped over another task - find that task's status
      const overTask = tasks.find(t => t.id === over.id);
      if (overTask) {
        targetStatusId = overTask.status_id;
      }
    }

    if (targetStatusId && targetStatusId !== task.status_id) {
      updateTask.mutate({ id: taskId, status_id: targetStatusId });
    }
  };

  const tasksByStatus = statuses.map(status => ({
    status,
    tasks: tasks.filter(t => t.status_id === status.id),
  }));

  return (
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
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} isDragging />}
      </DragOverlay>
    </DndContext>
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
}

const BoardColumn = ({ status, tasks, categories, spaceId, onTaskClick, onAddTask, onAddTaskWithTitle }: BoardColumnProps) => {
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
              <SortableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
            ))}
          </div>
        </SortableContext>

        {/* Inline add input */}
        {isAddingInline && (
          <div className="mt-2">
            <Input
              ref={inputRef}
              value={inlineTitle}
              onChange={(e) => setInlineTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleInlineSubmit();
                if (e.key === 'Escape') handleInlineCancel();
              }}
              onBlur={() => {
                // Small delay to allow Enter to fire first
                setTimeout(() => {
                  if (isAddingInline) handleInlineCancel();
                }, 150);
              }}
              placeholder="Task name..."
              className="h-8 text-sm"
            />
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

const SortableTaskCard = ({ task, onClick }: { task: TaskWithRelations; onClick: () => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
    </div>
  );
};

// ─── Card ───

const TaskCard = ({ task, onClick, isDragging }: { task: TaskWithRelations; onClick: () => void; isDragging?: boolean }) => {
  const priority = priorityConfig[task.priority] || priorityConfig.normal;

  return (
    <div
      className={cn(
        'bg-card rounded-lg border p-3 cursor-pointer hover:shadow-sm transition-shadow space-y-2',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/20'
      )}
      onClick={onClick}
    >
      {/* Title */}
      <p className="text-sm font-medium leading-snug">{task.title}</p>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Category */}
        {task.category && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 gap-1">
            <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.category.color || '#6b7280' }} />
            {task.category.name}
          </Badge>
        )}

        {/* Priority */}
        <Badge variant="secondary" className={cn('text-[10px] h-4 px-1', priority.className)}>
          {priority.label}
        </Badge>

        {/* Tags */}
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
  );
};
