import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FormNode, FormNodeProperties } from '@/types/forms';

interface PropertiesTabProps {
  node: FormNode;
  onUpdate: (id: string, updates: Partial<FormNode>) => void;
}

export function PropertiesTab({ node, onUpdate }: PropertiesTabProps) {
  function updateProp(key: keyof FormNodeProperties, value: unknown) {
    onUpdate(node.id, {
      properties: { ...node.properties, [key]: value },
    });
  }

  const isElement = ['heading', 'subheading', 'paragraph', 'image', 'section', 'divider'].includes(node.type);

  return (
    <div className="space-y-4">
      {/* Label / Content */}
      {isElement && node.type !== 'divider' ? (
        <div className="space-y-1.5">
          <Label className="text-xs">Content</Label>
          {node.type === 'paragraph' ? (
            <Textarea
              value={(node.properties.content as string) || ''}
              onChange={(e) => updateProp('content', e.target.value)}
              placeholder="Enter text..."
              rows={3}
            />
          ) : (
            <Input
              value={(node.properties.content as string) || (node.properties.label as string) || ''}
              onChange={(e) => updateProp('content', e.target.value)}
              placeholder="Enter text..."
            />
          )}
        </div>
      ) : node.type !== 'divider' ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              value={node.properties.label || ''}
              onChange={(e) => updateProp('label', e.target.value)}
              placeholder="Field label"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={node.properties.description || ''}
              onChange={(e) => updateProp('description', e.target.value)}
              placeholder="Help text"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Placeholder</Label>
            <Input
              value={node.properties.placeholder || ''}
              onChange={(e) => updateProp('placeholder', e.target.value)}
              placeholder="Placeholder text"
            />
          </div>
        </>
      ) : null}

      {/* Column layout */}
      {!isElement && (
        <div className="space-y-1.5">
          <Label className="text-xs">Column Layout</Label>
          <Select
            value={String(node.properties.columns ?? 1)}
            onValueChange={(v) => updateProp('columns', Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Full Width</SelectItem>
              <SelectItem value="2">Half Width</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Image URL */}
      {node.type === 'image' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Image URL</Label>
          <Input
            value={node.properties.imageUrl || ''}
            onChange={(e) => updateProp('imageUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      {/* Options for dropdown/radio/multi_select */}
      {['dropdown', 'multi_select', 'radio'].includes(node.type) && (
        <div className="space-y-1.5">
          <Label className="text-xs">Options (one per line)</Label>
          <Textarea
            value={(node.properties.options || []).map((o) => o.label).join('\n')}
            onChange={(e) => {
              const options = e.target.value.split('\n').filter(Boolean).map((label, i) => ({
                label: label.trim(),
                value: label.trim().toLowerCase().replace(/\s+/g, '_') || `option_${i}`,
              }));
              updateProp('options', options);
            }}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={4}
          />
        </div>
      )}
    </div>
  );
}
