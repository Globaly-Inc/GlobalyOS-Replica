import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Bell, BellOff, Calendar, Tag, Clock, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  useTask, useUpdateTask,
  useTaskStatuses, useTaskCategories,
  useTaskChecklists, useCreateTaskChecklist, useUpdateTaskChecklist, useDeleteTaskChecklist,
  useTaskComments, useCreateTaskComment,
  useTaskActivityLogs,
  useTaskFollowers, useToggleTaskFollower,
} from '@/services/useTasks';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type { TaskWithRelations, TaskCommentWithAuthor, TaskActivityLogWithActor } from '@/types/task';
import { format } from 'date-fns';
import { toast } from 'sonner';

const priorityConfig: Record<string, { label: string; className: string; value: string }> = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', value: 'urgent' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', value: 'high' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', value: 'normal' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', value: 'low' },
};

interface TaskDetailPageProps {
  taskId: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export const TaskDetailPage = ({ taskId, onClose, onPrev, onNext }: TaskDetailPageProps) => {
  const { data: task } = useTask(taskId);
  const { data: statuses = [] } = useTaskStatuses(task?.space_id || undefined);
  const { data: categories = [] } = useTaskCategories(task?.space_id || undefined);
  const { data: checklists = [] } = useTaskChecklists(taskId);
  const { data: comments = [] } = useTaskComments(taskId);
  const { data: activityLogs = [] } = useTaskActivityLogs(taskId);
  const { data: followers = [] } = useTaskFollowers(taskId);
  const { data: currentEmployee } = useCurrentEmployee();
  const updateTask = useUpdateTask();
  const createChecklist = useCreateTaskChecklist();
  const updateChecklist = useUpdateTaskChecklist();
  const deleteChecklist = useDeleteTaskChecklist();
  const createComment = useCreateTaskComment();
  const toggleFollower = useToggleTaskFollower();

  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [commentText, setCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'logs'>('comments');

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading task...</p>
      </div>
    );
  }

  const isFollowing = followers.some((f: any) => f.employee_id === currentEmployee?.id);
  const checklistDone = checklists.filter(c => c.is_done).length;
  const checklistTotal = checklists.length;
  const priority = priorityConfig[task.priority] || priorityConfig.normal;

  const handleTitleSave = async () => {
    if (title.trim() && title.trim() !== task.title) {
      await updateTask.mutateAsync({ id: task.id, title: title.trim() });
    }
    setEditingTitle(false);
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    try {
      await updateTask.mutateAsync({ id: task.id, [field]: value });
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleAddChecklist = async () => {
    if (!newChecklistItem.trim()) return;
    await createChecklist.mutateAsync({
      task_id: taskId,
      title: newChecklistItem.trim(),
      sort_order: checklists.length,
    });
    setNewChecklistItem('');
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await createComment.mutateAsync({ task_id: taskId, content: commentText.trim() });
    setCommentText('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <div className="flex-1 text-xs text-muted-foreground">
          Created {task.created_at ? format(new Date(task.created_at), 'MMM d, yyyy') : ''}
        </div>
        <div className="flex items-center gap-1">
          {onPrev && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {onNext && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left section: main content */}
        <ScrollArea className="flex-1 p-6">
          {/* Title */}
          {editingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="text-xl font-semibold mb-4"
              autoFocus
            />
          ) : (
            <h1
              className="text-xl font-semibold mb-4 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 py-0.5"
              onClick={() => { setTitle(task.title); setEditingTitle(true); }}
            >
              {task.title}
            </h1>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Status</span>
              <Select value={task.status_id || ''} onValueChange={(v) => handleFieldUpdate('status_id', v)}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color || '#6b7280' }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Priority</span>
              <Select value={task.priority} onValueChange={(v) => handleFieldUpdate('priority', v)}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, conf]) => (
                    <SelectItem key={key} value={key}>{conf.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Category</span>
              <Select value={task.category_id || 'none'} onValueChange={(v) => handleFieldUpdate('category_id', v === 'none' ? null : v)}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-[120px]">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Due Date</span>
              <Input
                type="date"
                value={task.due_date || ''}
                onChange={(e) => handleFieldUpdate('due_date', e.target.value || null)}
                className="h-7 text-xs w-auto"
              />
            </div>

            {/* Followers */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Followers</span>
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  {followers.slice(0, 5).map((f: any) => (
                    <Avatar key={f.id} className="h-5 w-5 border border-background">
                      <AvatarImage src={f.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{f.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {followers.length > 0 && <span className="text-xs text-muted-foreground">{followers.length}</span>}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => toggleFollower.mutate({ taskId, isFollowing })}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </Button>
              </div>
            </div>

            {/* Notification */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Notify</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1"
                onClick={() => handleFieldUpdate('notification_enabled', !task.notification_enabled)}
              >
                {task.notification_enabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                <span className="text-xs">{task.notification_enabled ? 'On' : 'Off'}</span>
              </Button>
            </div>

            {/* Tags */}
            <div className="flex items-center gap-2 col-span-2">
              <span className="text-muted-foreground w-20 shrink-0">Tags</span>
              <div className="flex gap-1 flex-wrap">
                {(task.tags || []).map(tag => (
                  <Badge key={tag} variant="outline" className="text-[10px] h-5">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator className="mb-4" />

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Description</h3>
            <Textarea
              value={task.description || ''}
              onChange={(e) => {/* Debounced update in future */}}
              onBlur={(e) => {
                if (e.target.value !== (task.description || '')) {
                  handleFieldUpdate('description', e.target.value || null);
                }
              }}
              placeholder="Add a description..."
              className="min-h-[80px] text-sm"
            />
          </div>

          {/* Checklist */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-medium">Checklist</h3>
              {checklistTotal > 0 && (
                <span className="text-xs text-muted-foreground">{checklistDone}/{checklistTotal}</span>
              )}
            </div>
            <div className="space-y-1">
              {checklists.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <Checkbox
                    checked={item.is_done}
                    onCheckedChange={(checked) => updateChecklist.mutate({ id: item.id, is_done: !!checked })}
                  />
                  <span className={cn('text-sm flex-1', item.is_done && 'line-through text-muted-foreground')}>
                    {item.title}
                  </span>
                  <button
                    className="text-destructive opacity-0 group-hover:opacity-100 text-xs"
                    onClick={() => deleteChecklist.mutate({ id: item.id, taskId })}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                  placeholder="Add checklist item..."
                  className="h-7 text-xs flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7"
                  onClick={handleAddChecklist}
                  disabled={!newChecklistItem.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Right panel: Comments & Logs */}
        <div className="w-80 border-l flex flex-col shrink-0">
          {/* Tab switcher */}
          <div className="flex border-b">
            <button
              className={cn('flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors',
                activeTab === 'comments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              )}
              onClick={() => setActiveTab('comments')}
            >
              Comments ({comments.length})
            </button>
            <button
              className={cn('flex-1 py-2 text-xs font-medium text-center border-b-2 transition-colors',
                activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
              )}
              onClick={() => setActiveTab('logs')}
            >
              Activity
            </button>
          </div>

          <ScrollArea className="flex-1">
            {activeTab === 'comments' ? (
              <div className="p-3 space-y-3">
                {comments.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No comments yet.</p>
                )}
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-2">
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={comment.employee?.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{comment.employee?.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-medium truncate">{comment.employee?.full_name || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {comment.created_at ? format(new Date(comment.created_at), 'MMM d, HH:mm') : ''}
                        </span>
                      </div>
                      <p className="text-xs text-foreground mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {activityLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity yet.</p>
                )}
                {activityLogs.map(log => (
                  <div key={log.id} className="flex gap-2 text-xs">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={log.actor?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{log.actor?.full_name?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{log.actor?.full_name || 'System'}</span>
                      <span className="text-muted-foreground"> {log.action_type.replace(/_/g, ' ')}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm') : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Comment input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                placeholder="Write a comment..."
                className="h-8 text-xs flex-1"
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAddComment} disabled={!commentText.trim()}>
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
