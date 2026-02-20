import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FormNode, FormNodeSpacing } from '@/types/forms';

interface SpacingTabProps {
  node: FormNode;
  onUpdate: (id: string, updates: Partial<FormNode>) => void;
}

export function SpacingTab({ node, onUpdate }: SpacingTabProps) {
  function updateSpacing(key: keyof FormNodeSpacing, value: number) {
    onUpdate(node.id, {
      spacing: { ...node.spacing, [key]: value },
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Gap (px)</Label>
        <Input
          type="number"
          min={0}
          max={64}
          value={node.spacing.gap ?? 0}
          onChange={(e) => updateSpacing('gap', Number(e.target.value))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Horizontal Padding (px)</Label>
        <Input
          type="number"
          min={0}
          max={64}
          value={node.spacing.paddingX ?? 0}
          onChange={(e) => updateSpacing('paddingX', Number(e.target.value))}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Vertical Padding (px)</Label>
        <Input
          type="number"
          min={0}
          max={64}
          value={node.spacing.paddingY ?? 0}
          onChange={(e) => updateSpacing('paddingY', Number(e.target.value))}
        />
      </div>
    </div>
  );
}
