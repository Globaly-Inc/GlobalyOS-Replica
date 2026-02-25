import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, Trash2, Pencil } from 'lucide-react';
import {
  useTaskStatuses, useCreateTaskStatus, useUpdateTaskStatus, useDeleteTaskStatus,
  useTaskCategories, useCreateTaskCategory, useUpdateTaskCategory, useDeleteTaskCategory,
} from '@/services/useTasks';
import type { TaskStatusRow, TaskCategoryRow, StatusGroup } from '@/types/task';
import { toast } from 'sonner';

const STATUS_GROUPS: { key: StatusGroup; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'in_review', label: 'In Review' },
  { key: 'completed', label: 'Completed' },
];

interface ManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
}

export const ManageDialog = ({ open, onOpenChange, spaceId }: ManageDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="status">
          <TabsList className="w-full">
            <TabsTrigger value="status" className="flex-1">Status</TabsTrigger>
            <TabsTrigger value="category" className="flex-1">Category</TabsTrigger>
          </TabsList>
          <TabsContent value="status" className="mt-4">
            <StatusManager spaceId={spaceId} />
          </TabsContent>
          <TabsContent value="category" className="mt-4">
            <CategoryManager spaceId={spaceId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const StatusManager = ({ spaceId }: { spaceId: string }) => {
  const { data: statuses = [] } = useTaskStatuses(spaceId);
  const createStatus = useCreateTaskStatus();
  const updateStatus = useUpdateTaskStatus();
  const deleteStatus = useDeleteTaskStatus();
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async (group: StatusGroup) => {
    const name = newNames[group]?.trim();
    if (!name) return;
    try {
      await createStatus.mutateAsync({
        space_id: spaceId,
        name,
        status_group: group,
        sort_order: statuses.filter(s => s.status_group === group).length,
        color: group === 'completed' ? '#10b981' : group === 'blocked' ? '#ef4444' : group === 'in_review' ? '#f59e0b' : group === 'in_progress' ? '#3b82f6' : '#6b7280',
      });
      setNewNames(prev => ({ ...prev, [group]: '' }));
    } catch {
      toast.error('Failed to add status');
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateStatus.mutateAsync({ id, name: editingName.trim() });
      setEditingId(null);
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStatus.mutateAsync({ id, spaceId });
    } catch {
      toast.error('Failed to delete status');
    }
  };

  return (
    <div className="space-y-4 max-h-[50vh] overflow-auto">
      {STATUS_GROUPS.map(group => {
        const groupStatuses = statuses.filter(s => s.status_group === group.key);
        return (
          <div key={group.key}>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{group.label}</p>
            <div className="space-y-1">
              {groupStatuses.map(status => (
                <div key={status.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-md hover:bg-muted/50">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab" />
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: status.color || '#6b7280' }}
                  />
                  {editingId === status.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(status.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={() => handleRename(status.id)}
                      className="h-6 text-sm flex-1"
                      autoFocus
                    />
                  ) : (
                    <span className="text-sm flex-1">{status.name}</span>
                  )}
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5"
                    onClick={() => { setEditingId(status.id); setEditingName(status.name); }}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5"
                    onClick={() => handleDelete(status.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2 px-2 mt-1">
                <Input
                  value={newNames[group.key] || ''}
                  onChange={(e) => setNewNames(prev => ({ ...prev, [group.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd(group.key)}
                  placeholder={`Add ${group.label.toLowerCase()} status...`}
                  className="h-7 text-xs flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleAdd(group.key)}
                  disabled={!newNames[group.key]?.trim()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CategoryManager = ({ spaceId }: { spaceId: string }) => {
  const { data: categories = [] } = useTaskCategories(spaceId);
  const createCategory = useCreateTaskCategory();
  const updateCategory = useUpdateTaskCategory();
  const deleteCategory = useDeleteTaskCategory();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await createCategory.mutateAsync({
        space_id: spaceId,
        name: newName.trim(),
        sort_order: categories.length,
      });
      setNewName('');
    } catch {
      toast.error('Failed to add category');
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateCategory.mutateAsync({ id, name: editingName.trim() });
      setEditingId(null);
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory.mutateAsync({ id, spaceId });
    } catch {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-1 max-h-[50vh] overflow-auto">
      {categories.map(cat => (
        <div key={cat.id} className="flex items-center gap-2 group px-2 py-1.5 rounded-md hover:bg-muted/50">
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 cursor-grab" />
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: cat.color || '#6b7280' }}
          />
          {editingId === cat.id ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(cat.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={() => handleRename(cat.id)}
              className="h-6 text-sm flex-1"
              autoFocus
            />
          ) : (
            <span className="text-sm flex-1">{cat.name}</span>
          )}
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5"
            onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5"
            onClick={() => handleDelete(cat.id)}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 px-2 mt-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add category..."
          className="h-7 text-xs flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleAdd}
          disabled={!newName.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
