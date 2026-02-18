/**
 * CRM Custom Fields Manager
 * Admin UI to define custom fields for contacts/companies.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { useCRMCustomFields, useCreateCRMCustomField, useDeleteCRMCustomField } from '@/services/useCRMCustomFields';
import { toast } from 'sonner';

interface Props {
  entityType: 'contact' | 'company';
}

export const CRMCustomFieldsManager = ({ entityType }: Props) => {
  const { data: fields = [] } = useCRMCustomFields(entityType);
  const createField = useCreateCRMCustomField();
  const deleteField = useDeleteCRMCustomField();

  const [name, setName] = useState('');
  const [fieldType, setFieldType] = useState('text');
  const [options, setOptions] = useState('');

  const handleAdd = () => {
    if (!name.trim()) return;
    const key = name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    createField.mutate(
      {
        entity_type: entityType,
        field_name: name.trim(),
        field_key: key,
        field_type: fieldType as any,
        options: fieldType === 'select' ? options.split(',').map(o => o.trim()).filter(Boolean) : null,
        sort_order: fields.length,
      },
      {
        onSuccess: () => { setName(''); setFieldType('text'); setOptions(''); toast.success('Field added'); },
        onError: () => toast.error('Failed to add field'),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteField.mutate(id, {
      onSuccess: () => toast.success('Field deleted'),
      onError: () => toast.error('Failed to delete field'),
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No custom fields defined yet.</p>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{field.field_name}</p>
                <p className="text-xs text-muted-foreground">{field.field_type}{field.options ? ` (${(field.options as string[]).join(', ')})` : ''}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(field.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Add new field */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Add Custom Field</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Field Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LinkedIn URL" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {fieldType === 'select' && (
            <div>
              <Label className="text-xs">Options (comma-separated)</Label>
              <Input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Option 1, Option 2, Option 3" className="h-8 text-sm" />
            </div>
          )}
          <Button size="sm" onClick={handleAdd} disabled={!name.trim() || createField.isPending}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Field
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
