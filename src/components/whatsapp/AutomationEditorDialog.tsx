import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, GripVertical, MessageCircle, Tag, UserPlus, Clock, ArrowRight } from 'lucide-react';

const triggerTypes = [
  { value: 'message_received', label: 'Message Received', icon: MessageCircle },
  { value: 'keyword', label: 'Keyword Match', icon: Tag },
  { value: 'new_contact', label: 'New Contact', icon: UserPlus },
  { value: 'tag_added', label: 'Tag Added', icon: Tag },
];

const actionTypes = [
  { value: 'send_message', label: 'Send Message' },
  { value: 'send_template', label: 'Send Template' },
  { value: 'add_tag', label: 'Add Tag' },
  { value: 'assign_agent', label: 'Assign to Agent' },
  { value: 'wait', label: 'Wait (delay)' },
];

interface ActionNode {
  id: string;
  type: string;
  config: Record<string, string>;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: {
    name: string;
    description: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    nodes: unknown[];
    edges: unknown[];
  }) => void;
  isSaving: boolean;
}

export default function AutomationEditorDialog({ open, onOpenChange, onSave, isSaving }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('message_received');
  const [keywords, setKeywords] = useState('');
  const [tagTrigger, setTagTrigger] = useState('');
  const [actions, setActions] = useState<ActionNode[]>([]);

  const addAction = () => {
    setActions([...actions, { id: crypto.randomUUID(), type: 'send_message', config: {} }]);
  };

  const removeAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id));
  };

  const updateAction = (id: string, field: string, value: string) => {
    setActions(actions.map((a) => a.id === id ? { ...a, config: { ...a.config, [field]: value } } : a));
  };

  const updateActionType = (id: string, type: string) => {
    setActions(actions.map((a) => a.id === id ? { ...a, type, config: {} } : a));
  };

  const handleSave = () => {
    const triggerConfig: Record<string, unknown> = {};
    if (triggerType === 'keyword') triggerConfig.keywords = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    if (triggerType === 'tag_added') triggerConfig.tag = tagTrigger;

    onSave({
      name,
      description,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      nodes: actions.map((a, i) => ({ ...a, order: i })),
      edges: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Automation</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Flow" className="mt-1" />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this automation do?" className="mt-1" rows={2} />
          </div>

          {/* Trigger */}
          <div>
            <Label className="mb-2 block">Trigger</Label>
            <Select value={triggerType} onValueChange={setTriggerType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {triggerTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {triggerType === 'keyword' && (
              <div className="mt-2">
                <Label className="text-xs">Keywords (comma-separated)</Label>
                <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="hello, hi, hey" className="mt-1" />
              </div>
            )}
            {triggerType === 'tag_added' && (
              <div className="mt-2">
                <Label className="text-xs">Tag</Label>
                <Input value={tagTrigger} onChange={(e) => setTagTrigger(e.target.value)} placeholder="vip" className="mt-1" />
              </div>
            )}
          </div>

          {/* Actions (Step List) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Actions</Label>
              <Button size="sm" variant="outline" onClick={addAction}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
              </Button>
            </div>

            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                No actions yet. Add a step to define what happens.
              </p>
            ) : (
              <div className="space-y-2">
                {actions.map((action, idx) => (
                  <Card key={action.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex items-center gap-1 mt-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="text-xs w-6 h-6 flex items-center justify-center p-0">
                          {idx + 1}
                        </Badge>
                      </div>
                      <div className="flex-1 space-y-2">
                        <Select value={action.type} onValueChange={(v) => updateActionType(action.id, v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {actionTypes.map((at) => (
                              <SelectItem key={at.value} value={at.value}>{at.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(action.type === 'send_message') && (
                          <Textarea
                            placeholder="Message text..."
                            value={action.config.message || ''}
                            onChange={(e) => updateAction(action.id, 'message', e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        )}
                        {action.type === 'send_template' && (
                          <Input
                            placeholder="Template name"
                            value={action.config.template_name || ''}
                            onChange={(e) => updateAction(action.id, 'template_name', e.target.value)}
                            className="text-sm"
                          />
                        )}
                        {action.type === 'add_tag' && (
                          <Input
                            placeholder="Tag name"
                            value={action.config.tag || ''}
                            onChange={(e) => updateAction(action.id, 'tag', e.target.value)}
                            className="text-sm"
                          />
                        )}
                        {action.type === 'wait' && (
                          <Input
                            placeholder="Duration (e.g. 30m, 1h, 1d)"
                            value={action.config.duration || ''}
                            onChange={(e) => updateAction(action.id, 'duration', e.target.value)}
                            className="text-sm"
                          />
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAction(action.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                    {idx < actions.length - 1 && (
                      <div className="flex justify-center mt-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving...' : 'Create Automation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
