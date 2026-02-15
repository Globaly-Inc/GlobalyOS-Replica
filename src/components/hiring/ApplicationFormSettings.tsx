/**
 * Application Form Settings – Calendly-style
 * Fixed fields pinned at top, sortable custom questions below with edit dialog
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Lock, Plus, GripVertical, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
import type { ApplicationFormConfig, CustomFieldConfig, CustomFieldType } from '@/types/hiring';
import { FIELD_TYPE_LABELS } from '@/types/hiring';

interface ApplicationFormSettingsProps {
  config: ApplicationFormConfig;
  onChange: (config: ApplicationFormConfig) => void;
}

const FIXED_FIELDS = ['Full Name', 'Email', 'Phone Number', 'Resume Upload'];

const FIELD_TYPES_WITH_OPTIONS: CustomFieldType[] = ['radio_buttons', 'checkboxes', 'dropdown'];

// ─── Sortable Item ─────────────────────────────────────────────

function SortableQuestionItem({
  field,
  index,
  onEdit,
  onDelete,
}: {
  field: CustomFieldConfig;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2.5 border rounded-md bg-background group ${
        isDragging ? 'opacity-50 shadow-lg z-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center w-5 h-5 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0" onClick={onEdit} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onEdit()}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Q{index + 1}:</span>
          <span className="text-sm font-medium truncate">{field.label || 'Untitled'}</span>
          {field.required && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              Required
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{FIELD_TYPE_LABELS[field.type] ?? field.type}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Edit Dialog ────────────────────────────────────────────────

function EditFieldDialog({
  field,
  open,
  onOpenChange,
  onSave,
}: {
  field: CustomFieldConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updated: CustomFieldConfig) => void;
}) {
  const [draft, setDraft] = useState<CustomFieldConfig | null>(null);

  // Sync draft when field changes
  const activeField = draft ?? field;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && field) {
      setDraft({ ...field, options: field.options ? [...field.options] : [] });
    } else {
      setDraft(null);
    }
    onOpenChange(isOpen);
  };

  if (!activeField) return null;

  const needsOptions = FIELD_TYPES_WITH_OPTIONS.includes(activeField.type);

  const updateDraft = (updates: Partial<CustomFieldConfig>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const addOption = () => {
    updateDraft({ options: [...(activeField.options || []), ''] });
  };

  const updateOption = (i: number, value: string) => {
    const opts = [...(activeField.options || [])];
    opts[i] = value;
    updateDraft({ options: opts });
  };

  const removeOption = (i: number) => {
    updateDraft({ options: (activeField.options || []).filter((_, idx) => idx !== i) });
  };

  const handleSave = () => {
    if (activeField) {
      // Clean empty options
      const cleaned = { ...activeField };
      if (needsOptions) {
        cleaned.options = (cleaned.options || []).filter((o) => o.trim() !== '');
      } else {
        delete cleaned.options;
      }
      onSave(cleaned);
    }
    handleOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Question Text</Label>
            <Input
              value={activeField.label}
              onChange={(e) => updateDraft({ label: e.target.value })}
              placeholder="e.g. Portfolio Link"
            />
          </div>

          <div className="space-y-2">
            <Label>Answer Type</Label>
            <Select
              value={activeField.type}
              onValueChange={(value) => {
                const newType = value as CustomFieldType;
                const updates: Partial<CustomFieldConfig> = { type: newType };
                if (FIELD_TYPES_WITH_OPTIONS.includes(newType) && (!activeField.options || activeField.options.length === 0)) {
                  updates.options = ['Option 1'];
                }
                updateDraft(updates);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(FIELD_TYPE_LABELS) as [CustomFieldType, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Required</Label>
            <Switch
              checked={activeField.required}
              onCheckedChange={(checked) => updateDraft({ required: checked })}
            />
          </div>

          {needsOptions && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-1.5">
                {(activeField.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="h-8 text-sm"
                      placeholder={`Option ${i + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeOption(i)}
                      disabled={(activeField.options?.length ?? 0) <= 1}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-full text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Option
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!activeField.label.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function ApplicationFormSettings({ config, onChange }: ApplicationFormSettingsProps) {
  const customFields = config.custom_fields ?? [];
  const [editingField, setEditingField] = useState<CustomFieldConfig | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = customFields.findIndex((f) => f.id === active.id);
    const newIndex = customFields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange({ ...config, custom_fields: arrayMove(customFields, oldIndex, newIndex) });
  };

  const addField = () => {
    const newField: CustomFieldConfig = {
      id: `cf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: '',
      type: 'one_line',
      required: false,
    };
    setEditingField(newField);
    setEditDialogOpen(true);
  };

  const openEdit = (field: CustomFieldConfig) => {
    setEditingField(field);
    setEditDialogOpen(true);
  };

  const handleSaveField = (updated: CustomFieldConfig) => {
    const exists = customFields.some((f) => f.id === updated.id);
    if (exists) {
      onChange({
        ...config,
        custom_fields: customFields.map((f) => (f.id === updated.id ? updated : f)),
      });
    } else {
      onChange({ ...config, custom_fields: [...customFields, updated] });
    }
  };

  const removeField = (id: string) => {
    onChange({ ...config, custom_fields: customFields.filter((f) => f.id !== id) });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application Form</CardTitle>
          <CardDescription>Configure fields shown to applicants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Fixed / required fields */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Required Fields
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FIXED_FIELDS.map((f) => (
                <div key={f} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs">
                  <Lock className="h-3 w-3" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Custom questions – sortable */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Custom Questions
            </Label>
            <div className="mt-2 space-y-1.5">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={customFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  {customFields.map((field, index) => (
                    <SortableQuestionItem
                      key={field.id}
                      field={field}
                      index={index}
                      onEdit={() => openEdit(field)}
                      onDelete={() => removeField(field.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {customFields.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No custom questions yet.</p>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addField} className="w-full text-xs mt-2">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add New Question
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditFieldDialog
        field={editingField}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveField}
      />
    </>
  );
}
