import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Check, X } from 'lucide-react';
import { useCRMServiceCategories, useCreateCRMServiceCategory } from '@/services/useCRMServiceCategories';
import { toast } from 'sonner';

interface ServiceCategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export const ServiceCategorySelect = ({ value, onValueChange }: ServiceCategorySelectProps) => {
  const { data: categories, isLoading } = useCRMServiceCategories();
  const createMutation = useCreateCRMServiceCategory();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const cat = await createMutation.mutateAsync(newName);
      onValueChange(cat.name);
      setCreating(false);
      setNewName('');
      toast.success('Category created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    }
  };

  if (creating) {
    return (
      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="New category name"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
            if (e.key === 'Escape') { setCreating(false); setNewName(''); }
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={handleCreate}
          disabled={createMutation.isPending || !newName.trim()}
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => { setCreating(false); setNewName(''); }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select value={value || '__none__'} onValueChange={v => {
      if (v === '__create_new__') {
        setCreating(true);
      } else if (v === '__none__') {
        onValueChange('');
      } else {
        onValueChange(v);
      }
    }}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? 'Loading...' : 'Select category'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No category</SelectItem>
        {(categories || []).map(cat => (
          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
        ))}
        <SelectItem value="__create_new__" className="text-primary">
          <span className="flex items-center gap-1"><Plus className="h-3 w-3" /> Create new category</span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
