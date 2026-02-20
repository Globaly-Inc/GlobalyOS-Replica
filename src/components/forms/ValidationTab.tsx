import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { FormNode, FormNodeValidation } from '@/types/forms';

interface ValidationTabProps {
  node: FormNode;
  onUpdate: (id: string, updates: Partial<FormNode>) => void;
}

export function ValidationTab({ node, onUpdate }: ValidationTabProps) {
  function updateValidation(key: keyof FormNodeValidation, value: unknown) {
    onUpdate(node.id, {
      validation: { ...node.validation, [key]: value },
    });
  }

  const isText = ['text', 'email', 'phone', 'textarea'].includes(node.type);
  const isNumber = node.type === 'number';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Required</Label>
        <Switch
          checked={node.validation.required ?? false}
          onCheckedChange={(v) => updateValidation('required', v)}
        />
      </div>

      {isText && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Min Length</Label>
            <Input
              type="number"
              min={0}
              value={node.validation.minLength ?? ''}
              onChange={(e) => updateValidation('minLength', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max Length</Label>
            <Input
              type="number"
              min={0}
              value={node.validation.maxLength ?? ''}
              onChange={(e) => updateValidation('maxLength', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pattern (Regex)</Label>
            <Input
              value={node.validation.pattern ?? ''}
              onChange={(e) => updateValidation('pattern', e.target.value || undefined)}
              placeholder="e.g. ^[A-Z].*"
            />
          </div>
        </>
      )}

      {isNumber && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Min Value</Label>
            <Input
              type="number"
              value={node.validation.min ?? ''}
              onChange={(e) => updateValidation('min', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Max Value</Label>
            <Input
              type="number"
              value={node.validation.max ?? ''}
              onChange={(e) => updateValidation('max', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </>
      )}

      {node.type === 'file' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Max File Size (MB)</Label>
            <Input
              type="number"
              min={0}
              value={node.validation.maxFileSize ? node.validation.maxFileSize / (1024 * 1024) : ''}
              onChange={(e) => updateValidation('maxFileSize', e.target.value ? Number(e.target.value) * 1024 * 1024 : undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Allowed File Types</Label>
            <Input
              value={(node.validation.allowedFileTypes || []).join(', ')}
              onChange={(e) => updateValidation('allowedFileTypes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder=".pdf, .doc, .jpg"
            />
          </div>
        </>
      )}
    </div>
  );
}
