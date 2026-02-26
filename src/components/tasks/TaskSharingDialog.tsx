import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTaskSharingPermissions, useAddTaskSharingPermission, useRemoveTaskSharingPermission } from '@/services/useTasks';
import { useEmployees } from '@/services/useEmployees';
import { Link2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface TaskSharingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: 'space' | 'folder' | 'list';
  entityId: string;
  entityName: string;
}

const ENTITY_LABELS = { space: 'Space', folder: 'Folder', list: 'Task List' };

export const TaskSharingDialog = ({ open, onOpenChange, entityType, entityId, entityName }: TaskSharingDialogProps) => {
  const [search, setSearch] = useState('');
  const [permLevel, setPermLevel] = useState('edit');
  const { data: permissions = [] } = useTaskSharingPermissions(entityType, entityId);
  const { data: employees = [] } = useEmployees();
  const addPerm = useAddTaskSharingPermission();
  const removePerm = useRemoveTaskSharingPermission();

  const sharedEmpIds = new Set(permissions.map((p: any) => p.employee_id));
  const filtered = employees.filter(
    (e: any) => !sharedEmpIds.has(e.id) && e.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (empId: string) => {
    try {
      await addPerm.mutateAsync({
        entity_type: entityType,
        entity_id: entityId,
        employee_id: empId,
        permission_level: permLevel,
      });
      toast.success('Permission added');
    } catch {
      toast.error('Failed to add');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removePerm.mutateAsync({ id, entityType, entityId });
      toast.success('Permission removed');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share {ENTITY_LABELS[entityType]}: {entityName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Add member */}
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="flex-1 h-9"
            />
            <Select value={permLevel} onValueChange={setPermLevel}>
              <SelectTrigger className="w-24 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {search && filtered.length > 0 && (
            <div className="max-h-32 overflow-y-auto border rounded-md divide-y">
              {filtered.slice(0, 5).map((emp: any) => (
                <button
                  key={emp.id}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={() => { handleAdd(emp.id); setSearch(''); }}
                >
                  <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{emp.full_name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Current members */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Members</p>
            {permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">No members yet</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {permissions.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.employee?.avatar_url} />
                      <AvatarFallback className="text-xs">{p.employee?.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm truncate">{p.employee?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground capitalize">{p.permission_level}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemove(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" className="w-full gap-2" onClick={handleCopyLink}>
            <Link2 className="h-3.5 w-3.5" /> Copy Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
