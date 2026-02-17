import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTaskSpace } from '@/services/useTasks';
import { toast } from 'sonner';

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
}

export const CreateSpaceDialog = ({ open, onOpenChange, parentId }: CreateSpaceDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📁');
  const createSpace = useCreateTaskSpace();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createSpace.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        icon,
        parent_id: parentId,
      });
      toast.success('Space created');
      setName('');
      setDescription('');
      setIcon('📁');
      onOpenChange(false);
    } catch {
      toast.error('Failed to create space');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{parentId ? 'Create Sub-space' : 'Create Space'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marketing Tasks"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this space for?"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createSpace.isPending}>
            {createSpace.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
