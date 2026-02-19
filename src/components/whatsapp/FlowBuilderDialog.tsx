import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import type { WaFlowScreen, WaFlowField, WaFlowFieldMapping } from '@/types/whatsapp';

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Long Text' },
];

const mappingTargets = [
  { value: 'contact_name', label: 'Contact Name' },
  { value: 'contact_tag', label: 'Add Tag' },
  { value: 'contact_custom_field', label: 'Custom Field' },
  { value: 'crm_contact_name', label: 'CRM Contact Name' },
  { value: 'crm_contact_email', label: 'CRM Contact Email' },
  { value: 'crm_deal_title', label: 'CRM Deal Title' },
];

interface FlowBuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    description: string;
    screens: WaFlowScreen[];
    field_mapping: WaFlowFieldMapping[];
  }) => void;
  isSaving: boolean;
  initial?: {
    name: string;
    description: string | null;
    screens: WaFlowScreen[];
    field_mapping: WaFlowFieldMapping[];
  };
}

function generateId() {
  return crypto.randomUUID().slice(0, 8);
}

function newField(): WaFlowField {
  return { id: generateId(), type: 'text', label: '', placeholder: '', required: false };
}

function newScreen(): WaFlowScreen {
  return { id: generateId(), title: '', description: '', fields: [newField()] };
}

export default function FlowBuilderDialog({ open, onOpenChange, onSave, isSaving, initial }: FlowBuilderDialogProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [screens, setScreens] = useState<WaFlowScreen[]>(
    initial?.screens?.length ? initial.screens : [newScreen()]
  );
  const [mappings, setMappings] = useState<WaFlowFieldMapping[]>(initial?.field_mapping ?? []);
  const [expandedScreen, setExpandedScreen] = useState<string | null>(screens[0]?.id ?? null);

  const allFields = screens.flatMap((s) => s.fields);

  const updateScreen = (screenId: string, patch: Partial<WaFlowScreen>) => {
    setScreens((prev) => prev.map((s) => (s.id === screenId ? { ...s, ...patch } : s)));
  };

  const addField = (screenId: string) => {
    setScreens((prev) =>
      prev.map((s) => (s.id === screenId ? { ...s, fields: [...s.fields, newField()] } : s))
    );
  };

  const updateField = (screenId: string, fieldId: string, patch: Partial<WaFlowField>) => {
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId
          ? { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }
          : s
      )
    );
  };

  const removeField = (screenId: string, fieldId: string) => {
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s
      )
    );
    setMappings((prev) => prev.filter((m) => m.field_id !== fieldId));
  };

  const removeScreen = (screenId: string) => {
    const screenFields = screens.find((s) => s.id === screenId)?.fields.map((f) => f.id) ?? [];
    setScreens((prev) => prev.filter((s) => s.id !== screenId));
    setMappings((prev) => prev.filter((m) => !screenFields.includes(m.field_id)));
  };

  const updateMapping = (fieldId: string, target: string, targetKey?: string) => {
    setMappings((prev) => {
      const exists = prev.find((m) => m.field_id === fieldId);
      if (!target) return prev.filter((m) => m.field_id !== fieldId);
      if (exists) {
        return prev.map((m) =>
          m.field_id === fieldId ? { ...m, target: target as any, target_key: targetKey } : m
        );
      }
      return [...prev, { field_id: fieldId, target: target as any, target_key: targetKey }];
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const cleanScreens = screens.filter((s) => s.fields.length > 0);
    if (cleanScreens.length === 0) return;
    onSave({ name: name.trim(), description: description.trim(), screens: cleanScreens, field_mapping: mappings });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Flow' : 'Create Flow'}</DialogTitle>
          <DialogDescription>Build an interactive form for lead capture, qualification, or booking.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Flow Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lead Qualification" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
          </div>

          {/* Screens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Screens</Label>
              <Button variant="outline" size="sm" onClick={() => setScreens((prev) => [...prev, newScreen()])}>
                <Plus className="h-3 w-3 mr-1" /> Add Screen
              </Button>
            </div>

            <div className="space-y-3">
              {screens.map((screen, si) => (
                <Card key={screen.id} className="p-3">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedScreen(expandedScreen === screen.id ? null : screen.id)}
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {screen.title || `Screen ${si + 1}`}
                      </span>
                      <Badge variant="secondary" className="text-xs">{screen.fields.length} fields</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {screens.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); removeScreen(screen.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                      {expandedScreen === screen.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {expandedScreen === screen.id && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Screen Title</Label>
                          <Input
                            value={screen.title}
                            onChange={(e) => updateScreen(screen.id, { title: e.target.value })}
                            placeholder="e.g. Your Details"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={screen.description ?? ''}
                            onChange={(e) => updateScreen(screen.id, { description: e.target.value })}
                            placeholder="Optional"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="space-y-2">
                        {screen.fields.map((field) => {
                          const mapping = mappings.find((m) => m.field_id === field.id);
                          return (
                            <div key={field.id} className="border rounded-md p-2 space-y-2">
                              <div className="grid grid-cols-[1fr_120px_100px_auto] gap-2 items-end">
                                <div>
                                  <Label className="text-xs">Label</Label>
                                  <Input
                                    value={field.label}
                                    onChange={(e) => updateField(screen.id, field.id, { label: e.target.value })}
                                    placeholder="e.g. Full Name"
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Type</Label>
                                  <Select value={field.type} onValueChange={(v) => updateField(screen.id, field.id, { type: v as any })}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {fieldTypes.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Switch
                                    checked={field.required}
                                    onCheckedChange={(v) => updateField(screen.id, field.id, { required: v })}
                                  />
                                  <span className="text-xs text-muted-foreground">Required</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeField(screen.id, field.id)}
                                  disabled={screen.fields.length <= 1}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              {field.type === 'select' && (
                                <div>
                                  <Label className="text-xs">Options (comma-separated)</Label>
                                  <Input
                                    value={field.options?.join(', ') ?? ''}
                                    onChange={(e) =>
                                      updateField(screen.id, field.id, {
                                        options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                                      })
                                    }
                                    placeholder="Option 1, Option 2, ..."
                                    className="h-8 text-sm"
                                  />
                                </div>
                              )}

                              {/* Field mapping */}
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground whitespace-nowrap">Map to:</Label>
                                <Select
                                  value={mapping?.target ?? ''}
                                  onValueChange={(v) => updateMapping(field.id, v)}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="None" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">None</SelectItem>
                                    {mappingTargets.map((t) => (
                                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {mapping?.target === 'contact_custom_field' && (
                                  <Input
                                    value={mapping?.target_key ?? ''}
                                    onChange={(e) => updateMapping(field.id, 'contact_custom_field', e.target.value)}
                                    placeholder="Field key"
                                    className="h-7 text-xs w-28"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <Button variant="outline" size="sm" className="w-full" onClick={() => addField(screen.id)}>
                          <Plus className="h-3 w-3 mr-1" /> Add Field
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? 'Saving...' : initial ? 'Update Flow' : 'Create Flow'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
