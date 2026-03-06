import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUpdateTask, useDeleteTask, useTaskComments, useCreateTaskComment } from '@/services/useTasks';
import { useTaskAttachments, useUploadTaskAttachment, useDeleteTaskAttachment } from '@/services/useTaskAttachments';
import { supabase } from '@/integrations/supabase/client';
import { PrioritySelector, CategorySelector, AssigneeSelector, DueDateSelector, TagsSelector } from './TaskInlineCellEditors';
import { Checkbox } from '@/components/ui/checkbox';
import type { TaskWithRelations, TaskCategoryRow, TaskStatusRow } from '@/types/task';
import { ChevronRight } from 'lucide-react';
import type { ColumnConfig } from './TaskColumnCustomizer';
import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Trash2, Paperclip, Download, FileIcon, MessageSquare, Send, X, FolderInput } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MoveTaskDialog } from './MoveTaskDialog';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { toast } from 'sonner';

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AttachmentCell = ({ taskId, organizationId, count }: { taskId: string; organizationId: string; count: number }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments = [] } = useTaskAttachments(taskId);
  const upload = useUploadTaskAttachment();
  const deleteAttachment = useDeleteTaskAttachment();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 20MB limit`);
        continue;
      }
      try {
        await upload.mutateAsync({ taskId, organizationId, file });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (filePath: string, fileName: string) => {
    const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath);
    const a = document.createElement('a');
    a.href = data.publicUrl;
    a.download = fileName;
    a.target = '_blank';
    a.click();
  };

  const handleDelete = async (id: string, filePath: string, fileName?: string) => {
    try {
      await deleteAttachment.mutateAsync({ id, taskId, filePath, fileName });
      toast.success('Attachment deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="text-xs text-muted-foreground text-center w-full hover:text-foreground transition-colors flex items-center justify-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Paperclip className="h-3 w-3" />
          {attachments.length || count}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Attachments</h4>
          <span className="text-xs text-muted-foreground">{attachments.length}</span>
        </div>

        {attachments.length > 0 && (
          <ScrollArea className="max-h-[240px] mb-2">
            <div className="space-y-1">
              {attachments.map((att: any) => (
                <div key={att.id} className="flex items-center gap-2 group/att px-1.5 py-1.5 rounded-md hover:bg-muted/50 text-xs">
                  <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{att.file_name}</span>
                  <span className="text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
                  <button
                    className="opacity-0 group-hover/att:opacity-100 p-0.5"
                    onClick={() => handleDownload(att.file_path, att.file_name)}
                  >
                    <Download className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    className="opacity-0 group-hover/att:opacity-100 p-0.5"
                    onClick={() => handleDelete(att.id, att.file_path, att.file_name)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs gap-1"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Paperclip className="h-3 w-3" />
          {upload.isPending ? 'Uploading...' : 'Attach file'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </PopoverContent>
    </Popover>
  );
};
const CommentCell = ({ taskId, organizationId, count }: { taskId: string; organizationId: string; count: number }) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const { data: comments = [], isLoading } = useTaskComments(open ? taskId : undefined);
  const createComment = useCreateTaskComment();
  const { getShortRelativeTime } = useRelativeTime();

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await createComment.mutateAsync({ task_id: taskId, content: content.trim() });
      setContent('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={e => e.stopPropagation()}>
          <MessageSquare className="h-3.5 w-3.5" />
          {(open ? comments.length : count) || 0}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="center" side="bottom" onClick={e => e.stopPropagation()}>
        <div className="px-3 py-2 border-b">
          <span className="text-sm font-medium">Comments</span>
        </div>
        <ScrollArea className="max-h-60">
          <div className="p-2 space-y-2">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarImage src={c.employee?.avatar_url || ''} />
                  <AvatarFallback className="text-[9px] bg-muted">{getInitials(c.employee?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium truncate">{c.employee?.full_name || 'Unknown'}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{getShortRelativeTime(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground text-center py-3">No comments yet</p>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-1.5 p-2 border-t">
          <Input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add a comment…"
            className="text-xs h-8"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          />
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSubmit} disabled={!content.trim() || createComment.isPending}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

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
  statuses?: TaskStatusRow[];
  members?: { id: string; full_name: string; avatar_url: string | null }[];
  spaceId: string;
  selected?: boolean;
  onToggleSelect?: (taskId: string) => void;
  allTags?: string[];
  isAllTasksMode?: boolean;
}

export const TaskRow = ({ task, onClick, visibleColumns, gridStyle, categories = [], statuses = [], members = [], spaceId, selected, onToggleSelect, allTags = [], isAllTasksMode }: TaskRowProps) => {
  const priority = priorityConfig[task.priority] || priorityConfig.normal;
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

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
      case 'name': {
        const tags = task.tags || [];
        const visibleTags = tags.slice(0, 2);
        const overflowCount = tags.length - 2;
        return (
          <div className="flex flex-col gap-0.5 min-w-0">
            {isAllTasksMode && task.location && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground truncate">
                {task.location.space_name && <span className="truncate">{task.location.space_name}</span>}
                {task.location.folder_name && (
                  <>
                    <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{task.location.folder_name}</span>
                  </>
                )}
                {task.location.list_name && (
                  <>
                    <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{task.location.list_name}</span>
                  </>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 min-w-0">
              {task.status && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: `${task.status.color}20`,
                        color: task.status.color || '#6b7280',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.status.color || '#6b7280' }} />
                      {task.status.name}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1" align="start" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-0.5">
                      {statuses.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleUpdate('status_id', s.id)}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded text-xs w-full text-left hover:bg-accent transition-colors',
                            task.status_id === s.id && 'bg-accent font-medium'
                          )}
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color || '#6b7280' }} />
                          <span className="truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {task.category && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    backgroundColor: `${task.category.color}20`,
                    color: task.category.color || '#6b7280',
                  }}
                >
                  <CategoryIcon iconName={task.category.icon} fallbackColor={task.category.color} size={10} />
                  {task.category.name}
                </span>
              )}
              <span className="truncate font-medium">{task.title}</span>
            </div>
            {tags.length > 0 && (
              <TagsSelector
                value={tags}
                allTags={allTags}
                onChange={(val) => handleUpdate('tags', val)}
              >
                <button className="flex items-center gap-1 hover:opacity-80 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  {visibleTags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0 gap-0.5 group/tag">
                      {tag}
                      <X
                        className="h-2.5 w-2.5 opacity-0 group-hover/tag:opacity-100 cursor-pointer text-muted-foreground hover:text-destructive transition-opacity"
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleUpdate('tags', tags.filter(t => t !== tag)); }}
                      />
                    </Badge>
                  ))}
                  {overflowCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">
                      +{overflowCount}
                    </Badge>
                  )}
                </button>
              </TagsSelector>
            )}
          </div>
        );
      }
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
                  <Badge key={tag} variant="outline" className="text-[10px] h-4 px-1 shrink-0 gap-0.5 group/tag">
                    {tag}
                    <X
                      className="h-2.5 w-2.5 opacity-0 group-hover/tag:opacity-100 cursor-pointer text-muted-foreground hover:text-destructive transition-opacity"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleUpdate('tags', (task.tags || []).filter(t => t !== tag)); }}
                    />
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </button>
          </TagsSelector>
        );
      case 'comments':
        return <CommentCell taskId={task.id} organizationId={task.organization_id} count={task.comment_count || 0} />;
      case 'attachments':
        return <AttachmentCell taskId={task.id} organizationId={task.organization_id} count={task.attachment_count || 0} />;
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
          <div key={col.key} className={cn(
            'flex items-center min-w-0',
            (col.key === 'comments' || col.key === 'attachments') && 'justify-center'
          )}>{renderCell(col)}</div>
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
                onClick={(e) => { e.stopPropagation(); setShowMoveDialog(true); }}
              >
                <FolderInput className="h-3.5 w-3.5 mr-2" />
                Move to
              </DropdownMenuItem>
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

      <MoveTaskDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        currentListId={task.list_id}
        onMove={(listId) => handleUpdate('list_id', listId)}
      />
    </>
  );
};
