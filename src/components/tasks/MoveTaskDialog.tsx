import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTaskSpaces, useTaskFolders, useTaskLists } from '@/services/useTasks';

interface MoveTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentListId: string | null;
  onMove: (listId: string) => void;
}

export const MoveTaskDialog = ({ open, onOpenChange, currentListId, onMove }: MoveTaskDialogProps) => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('__none__');
  const [selectedListId, setSelectedListId] = useState<string>('');

  const { data: spaces = [] } = useTaskSpaces();
  const { data: folders = [] } = useTaskFolders(selectedSpaceId || undefined);
  const { data: lists = [] } = useTaskLists(selectedSpaceId || undefined);

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSpaceId('');
      setSelectedFolderId('__none__');
      setSelectedListId('');
    }
  }, [open]);

  // Reset folder and list when space changes
  useEffect(() => {
    setSelectedFolderId('__none__');
    setSelectedListId('');
  }, [selectedSpaceId]);

  // Reset list when folder changes
  useEffect(() => {
    setSelectedListId('');
  }, [selectedFolderId]);

  // Filter lists by folder selection
  const filteredLists = lists.filter((l) => {
    if (selectedFolderId === '__none__') return !l.folder_id;
    return l.folder_id === selectedFolderId;
  });

  const handleConfirm = () => {
    if (!selectedListId || selectedListId === currentListId) return;
    onMove(selectedListId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Move Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Space */}
          <div className="space-y-1">
            <Label>Space</Label>
            <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select space" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.icon || '📋'} {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Folder (optional) */}
          {selectedSpaceId && folders.length > 0 && (
            <div className="space-y-1">
              <Label>Folder <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No folder (space level)</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.icon || '📁'} {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* List */}
          {selectedSpaceId && (
            <div className="space-y-1">
              <Label>List</Label>
              <Select value={selectedListId} onValueChange={setSelectedListId}>
                <SelectTrigger>
                  <SelectValue placeholder={filteredLists.length ? 'Select list' : 'No lists available'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredLists.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedListId || selectedListId === currentListId}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
