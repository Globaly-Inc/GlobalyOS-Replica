import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTaskFolder } from '@/services/useTasks';
import { EmojiPicker } from './EmojiPicker';
import { toast } from 'sonner';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
}

export const CreateFolderDialog = ({ open, onOpenChange, spaceId }: CreateFolderDialogProps) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const createFolder = useCreateTaskFolder();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createFolder.mutateAsync({
        space_id: spaceId,
        name: name.trim(),
        icon,
      });
      toast.success('Folder created');
      setName('');
      setIcon('📁');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create folder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3">
          <EmojiPicker value={icon} onChange={setIcon} size="sm" />
          <div className="flex-1 space-y-1">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Sprint, Backlog"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createFolder.isPending}>
            {createFolder.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
