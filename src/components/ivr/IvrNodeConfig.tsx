import type { IvrNode } from './ivrTypes';
import { NODE_LABELS, NODE_COLORS } from './ivrTypes';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Trash2 } from 'lucide-react';

interface IvrNodeConfigProps {
  node: IvrNode;
  onUpdate: (id: string, updates: Partial<IvrNode>) => void;
  onClose: () => void;
  onAddMenuOption: (nodeId: string, digit: string) => string;
  onRemoveNode: (id: string) => void;
}

export function IvrNodeConfig({ node, onUpdate, onClose, onAddMenuOption, onRemoveNode }: IvrNodeConfigProps) {
  const colors = NODE_COLORS[node.type];

  return (
    <div className="w-[320px] border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${colors.bg}`}>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{NODE_LABELS[node.type]}</h3>
          <p className="text-[11px] text-muted-foreground">Node: {node.id}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Label */}
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              value={node.label}
              onChange={(e) => onUpdate(node.id, { label: e.target.value })}
              className="text-sm"
            />
          </div>

          {/* Greeting / Message text */}
          {(node.type === 'greeting' || node.type === 'message') && (
            <div className="space-y-1.5">
              <Label className="text-xs">Text to Speak (TTS)</Label>
              <Textarea
                value={node.greeting_text || ''}
                onChange={(e) => onUpdate(node.id, { greeting_text: e.target.value })}
                rows={4}
                className="text-sm"
                placeholder="Enter the text that will be spoken to callers..."
              />
            </div>
          )}

          {/* Menu options */}
          {node.type === 'menu' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Keypad Options</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => {
                    const usedDigits = new Set(node.menu_options?.map((o) => o.digit) || []);
                    const nextDigit = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].find(
                      (d) => !usedDigits.has(d)
                    );
                    if (nextDigit) onAddMenuOption(node.id, nextDigit);
                  }}
                  disabled={(node.menu_options?.length || 0) >= 10}
                >
                  <Plus className="h-3 w-3" /> Add Option
                </Button>
              </div>

              {node.menu_options?.map((opt, idx) => (
                <div key={opt.digit} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                  <div className="flex items-center justify-center h-7 w-7 rounded bg-background border text-xs font-bold shrink-0">
                    {opt.digit}
                  </div>
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const newOpts = [...(node.menu_options || [])];
                      newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                      onUpdate(node.id, { menu_options: newOpts });
                    }}
                    placeholder="Option label..."
                    className="text-xs h-7 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive shrink-0"
                    onClick={() => {
                      // Remove the menu option AND its target node
                      onRemoveNode(opt.target_node_id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              <div className="space-y-1.5">
                <Label className="text-xs">Timeout (seconds)</Label>
                <Input
                  type="number"
                  min={3}
                  max={30}
                  value={node.timeout || 10}
                  onChange={(e) => onUpdate(node.id, { timeout: parseInt(e.target.value, 10) || 10 })}
                  className="text-sm w-20"
                />
              </div>
            </div>
          )}

          {/* Forward */}
          {node.type === 'forward' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Forward to Number</Label>
              <Input
                value={node.forward_number || ''}
                onChange={(e) => onUpdate(node.id, { forward_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Enter the phone number or agent extension to forward calls to.
              </p>
            </div>
          )}

          {/* Voicemail */}
          {node.type === 'voicemail' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Voicemail Prompt</Label>
                <Textarea
                  value={node.voicemail_prompt || ''}
                  onChange={(e) => onUpdate(node.id, { voicemail_prompt: e.target.value })}
                  rows={3}
                  className="text-sm"
                  placeholder="Please leave a message after the beep."
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Length (seconds)</Label>
                <Input
                  type="number"
                  min={10}
                  max={600}
                  value={node.voicemail_max_length || 120}
                  onChange={(e) => onUpdate(node.id, { voicemail_max_length: parseInt(e.target.value, 10) || 120 })}
                  className="text-sm w-24"
                />
              </div>
            </>
          )}

          {/* Delete node */}
          {node.id !== 'root' && (
            <>
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-full text-destructive hover:text-destructive text-xs gap-1.5"
                onClick={() => {
                  onRemoveNode(node.id);
                  onClose();
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Node
              </Button>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
