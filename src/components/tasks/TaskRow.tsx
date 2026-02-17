import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TaskWithRelations } from '@/types/task';
import type { ColumnConfig } from './TaskColumnCustomizer';

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
}

export const TaskRow = ({ task, onClick, visibleColumns, gridStyle }: TaskRowProps) => {
  const priority = priorityConfig[task.priority] || priorityConfig.normal;

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
          <span className="text-xs text-muted-foreground truncate">
            {task.category?.name || '—'}
          </span>
        );
      case 'assignee':
        return (
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
        );
      case 'tags':
        return (
          <div className="flex gap-1 overflow-hidden">
            {(task.tags || []).slice(0, 2).map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0">
                {tag}
              </Badge>
            ))}
          </div>
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
          <Badge variant="secondary" className={cn('text-[10px] h-5 px-1.5 justify-center', priority.className)}>
            {priority.label}
          </Badge>
        );
      case 'due_date':
        return (
          <span className="text-xs text-muted-foreground">
            {task.due_date || '—'}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="grid gap-2 px-3 py-2 items-center border-t hover:bg-muted/30 cursor-pointer transition-colors text-sm"
      style={gridStyle}
      onClick={onClick}
    >
      {cols.map(col => (
        <div key={col.key}>{renderCell(col)}</div>
      ))}
    </div>
  );
};
