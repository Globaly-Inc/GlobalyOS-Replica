import type { FormulaDefinition } from '@/types/forms';

interface CalculatedSummaryBlockProps {
  formulas: FormulaDefinition[];
  computedValues: Record<string, number>;
}

function formatValue(value: number, formula: FormulaDefinition): string {
  const decimals = formula.decimalPlaces ?? 2;
  const formatted = value.toFixed(decimals);

  switch (formula.format) {
    case 'currency':
      return `${formula.currencyCode || 'USD'} ${formatted}`;
    case 'percentage':
      return `${formatted}%`;
    default:
      return formatted;
  }
}

export function CalculatedSummaryBlock({ formulas, computedValues }: CalculatedSummaryBlockProps) {
  if (formulas.length === 0) return null;

  return (
    <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</h4>
      {formulas.map((formula) => {
        const value = computedValues[formula.fieldId] ?? 0;
        return (
          <div key={formula.id} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
            <span className="text-sm text-foreground">{formula.fieldId}</span>
            <span className="text-sm font-mono font-semibold">{formatValue(value, formula)}</span>
          </div>
        );
      })}
    </div>
  );
}
