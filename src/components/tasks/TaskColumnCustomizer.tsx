import { useState } from 'react';
import { Settings2, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { useTaskCustomFields, useCreateTaskCustomField, useDeleteTaskCustomField, type TaskCustomField } from '@/services/useTaskCustomFields';
import { toast } from 'sonner';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Name', visible: true },
  { key: 'assignee', label: 'Assignee', visible: true },
  { key: 'due_date', label: 'Due Date', visible: true },
  { key: 'comments', label: 'Comments', visible: true },
  { key: 'priority', label: 'Priority', visible: true },
  { key: 'related_to', label: 'Related To', visible: true },
  { key: 'attachments', label: 'Attachments', visible: true },
];

// Keys hidden from the column customizer (rendered inline in Name column)
const HIDDEN_FROM_CUSTOMIZER = new Set(['category', 'tags']);

interface SortableColumnItemProps {
  col: ColumnConfig;
  onToggle: (key: string) => void;
  onDelete?: () => void;
  isCustom?: boolean;
}

const SortableColumnItem = ({ col, onToggle, onDelete, isCustom }: SortableColumnItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50',
        isDragging && 'opacity-50 z-50 bg-background shadow-lg'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
      <span className="text-sm flex-1 truncate">{col.label}</span>
      {isCustom && onDelete && (
        <button onClick={onDelete} className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      <Switch
        checked={col.visible}
        onCheckedChange={() => onToggle(col.key)}
        disabled={col.key === 'name'}
        className="scale-75"
      />
    </div>
  );
};

interface TaskColumnCustomizerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  spaceId?: string;
}

export const TaskColumnCustomizer = ({ columns, onColumnsChange, spaceId }: TaskColumnCustomizerProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const { data: customFields = [] } = useTaskCustomFields(spaceId);
  const createField = useCreateTaskCustomField();
  const deleteField = useDeleteTaskCustomField();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Merge custom fields into columns if not already present
  const mergedColumns = (() => {
    const existing = new Set(columns.map(c => c.key));
    const extras: ColumnConfig[] = customFields
      .filter(f => !existing.has(`custom_${f.field_key}`))
      .map(f => ({ key: `custom_${f.field_key}`, label: f.field_name, visible: true }));
    return [...columns, ...extras];
  })();

  const customFieldKeys = new Set(customFields.map(f => `custom_${f.field_key}`));

  const toggleColumn = (key: string) => {
    if (key === 'name') return;
    onColumnsChange(
      mergedColumns.map(c => c.key === key ? { ...c, visible: !c.visible } : c)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = mergedColumns.findIndex(c => c.key === active.id);
      const newIndex = mergedColumns.findIndex(c => c.key === over.id);
      onColumnsChange(arrayMove(mergedColumns, oldIndex, newIndex));
    }
  };

  const handleAddField = () => {
    if (!newFieldName.trim() || !spaceId) return;
    const key = newFieldName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    createField.mutate(
      {
        space_id: spaceId,
        field_name: newFieldName.trim(),
        field_key: key,
        field_type: newFieldType as any,
        options: newFieldType === 'select' ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : null,
        sort_order: customFields.length,
      },
      {
        onSuccess: () => {
          // Add the new custom column to the columns array
          onColumnsChange([...mergedColumns, { key: `custom_${key}`, label: newFieldName.trim(), visible: true }]);
          setNewFieldName('');
          setNewFieldType('text');
          setNewFieldOptions('');
          setShowAddForm(false);
          toast.success('Custom field added');
        },
        onError: () => toast.error('Failed to add custom field'),
      }
    );
  };

  const handleDeleteField = (field: TaskCustomField) => {
    deleteField.mutate(field.id, {
      onSuccess: () => {
        onColumnsChange(mergedColumns.filter(c => c.key !== `custom_${field.field_key}`));
        toast.success('Custom field deleted');
      },
      onError: () => toast.error('Failed to delete field'),
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="px-3 py-2 border-b">
          <span className="text-sm font-medium">Columns</span>
        </div>
        <div className="p-2 space-y-0.5 max-h-[300px] overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={mergedColumns.map(c => c.key)} strategy={verticalListSortingStrategy}>
              {mergedColumns.map(col => {
                const isCustom = customFieldKeys.has(col.key);
                const fieldDef = isCustom ? customFields.find(f => `custom_${f.field_key}` === col.key) : null;
                return (
                  <SortableColumnItem
                    key={col.key}
                    col={col}
                    onToggle={toggleColumn}
                    isCustom={isCustom}
                    onDelete={fieldDef ? () => handleDeleteField(fieldDef) : undefined}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        <Separator />

        {/* Add custom field */}
        <div className="p-2">
          {!showAddForm ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-1.5 text-xs h-7"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-3 w-3" />
              Add Custom Field
            </Button>
          ) : (
            <div className="space-y-2">
              <Input
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="Field name"
                className="h-7 text-xs"
                autoFocus
              />
              <Select value={newFieldType} onValueChange={setNewFieldType}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                </SelectContent>
              </Select>
              {newFieldType === 'select' && (
                <Input
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  placeholder="Options (comma-separated)"
                  className="h-7 text-xs"
                />
              )}
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddField} disabled={!newFieldName.trim() || createField.isPending}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setShowAddForm(false); setNewFieldName(''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const getDefaultColumns = (): ColumnConfig[] => [...DEFAULT_COLUMNS];
