import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useUpdateTask, useDeleteTask } from '@/services/useTasks';
import { PrioritySelector, CategorySelector, AssigneeSelector, DueDateSelector, TagsSelector } from './TaskInlineCellEditors';
import { Checkbox } from '@/components/ui/checkbox';
import type { TaskWithRelations, TaskCategoryRow } from '@/types/task';
import type { ColumnConfig } from './TaskColumnCustomizer';
import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

interface TaskRowProps {
  task: TaskWithRelations;
  onClick: () => void;
  visibleColumns?: ColumnConfig[];
  gridStyle?: React.CSSProperties;
  categories?: TaskCategoryRow[];
  members?: { id: string; full_name: string; avatar_url: string | null }[];
  spaceId: string;
  selected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  allTags?: string[];
}

export const TaskRow = ({ task, onClick, visibleColumns, gridStyle, categories = [], members = [], spaceId, selected, onToggleSelect, allTags = [] }: TaskRowProps) => {
  const priority = priorityConfig[task.priority] || priorityConfig.normal;
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleUpdate = (field: string, value: unknown) => {
    updateTask.mutate({ id: task.id, [field]: value });
  };

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id, spaceId }, {
      onSuccess: () => toast.success('Task deleted'),
      onError: () => toast.error('Failed to delete task'),
    });
    setShowDeleteDialog(false);
  };

  const cols = visibleColumns || [
    { key: 'name', label: 'Name', visible: true },
    { key: 'category', label: 'Category', visible: true },
    { key: 'assignee', label: 'Assignee', visible: true },
    { key: 'tags', label: 'Tags', visible: true },
    { key: 'comments', label: 'Comments', visible: true },
    { key: 'attachments', label: 'Attachments', visible: true },
    { key: 'priority', label: 'Priority', visible: true },
  ];

  const renderCell = (col: ColumnConfig) => {
    switch (col.key) {
      case 'name':
        return (
          <div className="flex items-center gap-2 min-w-0">
            {task.category && (
              <div
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: task.category.color || '#6b7280' }}
              />
            )}
            <span className="truncate font-medium">{task.title}</span>
          </div>
        );
      case 'category':
        return (
          <CategorySelector
            value={task.category_id}
            categories={categories}
            onChange={(val) => handleUpdate('category_id', val)}
          >
            <button className="text-xs text-muted-foreground truncate hover:text-foreground transition-colors text-left w-full">
              {task.category?.name || '—'}
            </button>
          </CategorySelector>
        );
      case 'assignee':
        return (
          <AssigneeSelector
            value={task.assignee_id}
            members={members}
            onChange={(val) => handleUpdate('assignee_id', val)}
          >
            <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity w-full">
              {task.assignee ? (
                <>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={task.assignee.avatar_url || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {task.assignee.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate">{task.assignee.full_name?.split(' ')[0]}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </button>
          </AssigneeSelector>
        );
      case 'tags':
        return (
          <TagsSelector
            value={task.tags || []}
            allTags={allTags}
            onChange={(val) => handleUpdate('tags', val)}
          >
            <button className="flex gap-1 overflow-hidden w-full hover:opacity-80 transition-opacity">
              {(task.tags || []).length > 0 ? (
                (task.tags || []).slice(0, 2).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </button>
          </TagsSelector>
        );
      case 'comments':
        return (
          <span className="text-xs text-muted-foreground text-center">
            {task.comment_count || 0}
          </span>
        );
      case 'attachments':
        return (
          <span className="text-xs text-muted-foreground text-center">
            {task.attachment_count || 0}
          </span>
        );
      case 'priority':
        return (
          <PrioritySelector
            value={task.priority}
            onChange={(val) => handleUpdate('priority', val)}
          >
            <button className="inline-flex">
              <Badge variant="secondary" className={cn('text-[10px] h-5 px-1.5 justify-center cursor-pointer', priority.className)}>
                {priority.label}
              </Badge>
            </button>
          </PrioritySelector>
        );
      case 'due_date':
        return (
          <DueDateSelector
            value={task.due_date}
            onChange={(val) => handleUpdate('due_date', val)}
          >
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left w-full">
              {task.due_date ? format(parseISO(task.due_date), 'MMM d') : '—'}
            </button>
          </DueDateSelector>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div
        className="grid gap-2 px-3 py-2 items-center border-t hover:bg-muted/30 cursor-pointer transition-colors text-sm group"
        style={gridStyle}
        onClick={onClick}
      >
        {onToggleSelect && (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selected}
              onCheckedChange={() => onToggleSelect(task.id)}
            />
          </div>
        )}
        {cols.map(col => (
          <div key={col.key}>{renderCell(col)}</div>
        ))}
        {/* Actions column - always rendered at the end */}
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
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
