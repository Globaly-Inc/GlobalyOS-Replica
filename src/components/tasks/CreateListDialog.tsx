import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateTaskList, useTaskLists, useTaskFolders } from '@/services/useTasks';
import { toast } from 'sonner';

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  folderId?: string;
  onCreated?: (listId: string) => void;
}

export const CreateListDialog = ({ open, onOpenChange, spaceId, folderId, onCreated }: CreateListDialogProps) => {
  const [name, setName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folderId || '__none__');
  const createList = useCreateTaskList();
  const { data: allLists = [] } = useTaskLists(spaceId);
  const { data: folders = [] } = useTaskFolders(spaceId);

  useEffect(() => {
    if (open) {
      setSelectedFolderId(folderId || '__none__');
      setName('');
    }
  }, [open, folderId]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      const actualFolderId = selectedFolderId === '__none__' ? undefined : selectedFolderId;
      const newList = await createList.mutateAsync({
        space_id: spaceId,
        name: name.trim(),
        sort_order: allLists.length,
        ...(actualFolderId ? { folder_id: actualFolderId } : {}),
      });
      toast.success('List created');
      setName('');
      onOpenChange(false);
      onCreated?.(newList.id);
    } catch {
      toast.error('Failed to create list');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create List</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint Backlog, To Do"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {folders.length > 0 && (
            <div className="space-y-1">
              <Label>Folder</Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No folder (space level)</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.icon || '📁'} {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createList.isPending}>
            {createList.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
