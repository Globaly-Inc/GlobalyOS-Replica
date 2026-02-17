import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskWithRelations } from '@/types/task';

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

interface TaskRowProps {
  task: TaskWithRelations;
  onClick: () => void;
}

export const TaskRow = ({ task, onClick }: TaskRowProps) => {
  const priority = priorityConfig[task.priority] || priorityConfig.normal;

  return (
    <div
      className="grid grid-cols-[1fr_120px_100px_120px_60px_60px_80px] gap-2 px-3 py-2 items-center border-t hover:bg-muted/30 cursor-pointer transition-colors text-sm"
      onClick={onClick}
    >
      {/* Name */}
      <div className="flex items-center gap-2 min-w-0">
        {task.category && (
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: task.category.color || '#6b7280' }}
          />
        )}
        <span className="truncate font-medium">{task.title}</span>
      </div>

      {/* Category */}
      <span className="text-xs text-muted-foreground truncate">
        {task.category?.name || '—'}
      </span>

      {/* Assignee */}
      <div className="flex items-center gap-1.5">
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
      </div>

      {/* Tags */}
      <div className="flex gap-1 overflow-hidden">
        {(task.tags || []).slice(0, 2).map(tag => (
          <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Comments count */}
      <span className="text-xs text-muted-foreground text-center">
        {task.comment_count || 0}
      </span>

      {/* Attachments count */}
      <span className="text-xs text-muted-foreground text-center">
        {task.attachment_count || 0}
      </span>

      {/* Priority */}
      <Badge variant="secondary" className={cn('text-[10px] h-5 px-1.5 justify-center', priority.className)}>
        {priority.label}
      </Badge>
    </div>
  );
};
