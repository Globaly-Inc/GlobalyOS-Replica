import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCreateTask, useTaskStatuses, useTaskCategories } from '@/services/useTasks';
import { EmployeePickerPopover } from './EmployeePickerPopover';
import type { TaskPriority } from '@/types/task';
import { toast } from 'sonner';

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  listId?: string | null;
}

export const AddTaskDialog = ({ open, onOpenChange, spaceId, listId }: AddTaskDialogProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [statusId, setStatusId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('none');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [assigneeLabel, setAssigneeLabel] = useState<string>('Unassigned');

  const { data: statuses = [] } = useTaskStatuses(spaceId);
  const { data: categories = [] } = useTaskCategories(spaceId);
  const createTask = useCreateTask();

  const defaultStatusId = statuses.find(s => s.is_default)?.id || statuses[0]?.id || '';

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createTask.mutateAsync({
        space_id: spaceId,
        list_id: listId || null,
        title: title.trim(),
        description: description.trim() || null,
        status_id: statusId || defaultStatusId,
        category_id: categoryId === 'none' ? null : categoryId,
        priority,
        due_date: dueDate || null,
        assignee_id: assigneeId,
      });
      toast.success('Task created');
      setTitle(''); setDescription(''); setStatusId(''); setCategoryId('none');
      setPriority('normal'); setDueDate(''); setAssigneeId(null); setAssigneeLabel('Unassigned');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create task');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task name..." autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusId || defaultStatusId} onValueChange={setStatusId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select status" /></SelectTrigger>
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

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Assignee</Label>
              <EmployeePickerPopover value={assigneeId} onChange={setAssigneeId}>
                <Button variant="outline" className="h-8 w-full justify-start text-sm">
                  {assigneeId ? 'Assigned' : 'Unassigned'}
                </Button>
              </EmployeePickerPopover>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!title.trim() || createTask.isPending}>
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
