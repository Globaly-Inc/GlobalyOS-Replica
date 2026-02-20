import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { FormNode, FormulaDefinition } from '@/types/forms';

interface FormulaEditorProps {
  node: FormNode;
  allNodes: FormNode[];
  formula: FormulaDefinition | undefined;
  onFormulaChange: (formula: FormulaDefinition) => void;
}

const fieldTypes = ['text', 'email', 'phone', 'textarea', 'number', 'dropdown', 'multi_select', 'checkbox', 'radio', 'date', 'file', 'formula', 'payment'];

export function FormulaEditor({ node, allNodes, formula, onFormulaChange }: FormulaEditorProps) {
  const otherFields = allNodes.filter((n) => n.id !== node.id && fieldTypes.includes(n.type));

  const currentFormula: FormulaDefinition = formula || {
    id: node.id,
    fieldId: node.id,
    expression: '',
    format: 'number',
    decimalPlaces: 2,
  };

  function update(updates: Partial<FormulaDefinition>) {
    onFormulaChange({ ...currentFormula, ...updates });
  }

  function insertFieldRef(fieldId: string) {
    update({ expression: currentFormula.expression + `{${fieldId}}` });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Formula Expression</Label>
        <Input
          value={currentFormula.expression}
          onChange={(e) => update({ expression: e.target.value })}
          placeholder="SUM({field1}, {field2}) * 1.1"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Use {'{'}<code>fieldId</code>{'}'} to reference fields. Functions: SUM, MIN, MAX, IF, ROUND, ABS.
        </p>
      </div>

      {otherFields.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Insert Field Reference</Label>
          <div className="flex flex-wrap gap-1">
            {otherFields.map((f) => (
              <Badge
                key={f.id}
                variant="outline"
                className="cursor-pointer hover:bg-accent text-xs"
                onClick={() => insertFieldRef(f.id)}
              >
                {f.properties.label || f.type}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Format</Label>
          <Select
            value={currentFormula.format || 'number'}
            onValueChange={(v) => update({ format: v as 'number' | 'currency' | 'percentage' })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Decimal Places</Label>
          <Input
            type="number"
            min={0}
            max={6}
            value={currentFormula.decimalPlaces ?? 2}
            onChange={(e) => update({ decimalPlaces: Number(e.target.value) })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      {currentFormula.format === 'currency' && (
        <div className="space-y-1.5">
          <Label className="text-xs">Currency Code</Label>
          <Input
            value={currentFormula.currencyCode || 'USD'}
            onChange={(e) => update({ currencyCode: e.target.value.toUpperCase() })}
            placeholder="USD"
            maxLength={3}
            className="h-8 text-xs w-24"
          />
        </div>
      )}
    </div>
  );
}
