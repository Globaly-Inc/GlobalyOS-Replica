/**
 * CRM Tags Manager
 * CRUD for organization-level tags.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus } from 'lucide-react';
import { useCRMTags, useCreateCRMTag, useDeleteCRMTag } from '@/services/useCRMTags';
import { toast } from 'sonner';

const TAG_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

export const CRMTagsManager = () => {
  const { data: tags = [] } = useCRMTags();
  const createTag = useCreateCRMTag();
  const deleteTag = useDeleteCRMTag();
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    createTag.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => { setName(''); toast.success('Tag created'); },
        onError: () => toast.error('Failed to create tag'),
      }
    );
  };

  return (
    <div className="space-y-4">
      {tags.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No tags defined yet.</p>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: tag.color || '#6b7280' }} />
              <span className="text-sm font-medium flex-1">{tag.name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTag.mutate(tag.id, { onSuccess: () => toast.success('Tag deleted') })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tag name..." className="h-8 text-sm flex-1" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
        <div className="flex gap-1 shrink-0">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              className="h-6 w-6 rounded-full border-2 transition-all"
              style={{ backgroundColor: c, borderColor: color === c ? 'hsl(var(--foreground))' : 'transparent' }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!name.trim() || createTag.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
};
