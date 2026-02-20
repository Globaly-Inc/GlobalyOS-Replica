/**
 * Form Formula Engine - Evaluates formula expressions with field references
 */
import type { FormulaDefinition } from '@/types/forms';

type Values = Record<string, unknown>;

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/**
 * Simple expression evaluator supporting:
 * - Field references: {field_id}
 * - Functions: SUM(), MIN(), MAX(), IF(), ROUND(), ABS()
 * - Operators: + - * /
 * - Parentheses
 */
export function evaluateFormula(
  expression: string,
  fieldValues: Values
): number {
  // Replace field references with values
  let expr = expression.replace(/\{([^}]+)\}/g, (_, fieldId) => {
    return String(toNum(fieldValues[fieldId]));
  });

  // Handle functions
  expr = handleFunctions(expr, fieldValues);

  // Evaluate simple arithmetic
  try {
    // Only allow numbers, operators, parentheses, and whitespace
    const sanitized = expr.replace(/[^0-9+\-*/().e\s]/gi, '');
    // Use Function constructor for safe math evaluation
    const result = new Function(`"use strict"; return (${sanitized})`)();
    return typeof result === 'number' && isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

function handleFunctions(expr: string, _values: Values): string {
  // SUM(a, b, c)
  expr = expr.replace(/SUM\(([^)]+)\)/gi, (_, args: string) => {
    const nums = args.split(',').map((a) => toNum(a.trim()));
    return String(nums.reduce((s, n) => s + n, 0));
  });

  // MIN(a, b, c)
  expr = expr.replace(/MIN\(([^)]+)\)/gi, (_, args: string) => {
    const nums = args.split(',').map((a) => toNum(a.trim()));
    return String(Math.min(...nums));
  });

  // MAX(a, b, c)
  expr = expr.replace(/MAX\(([^)]+)\)/gi, (_, args: string) => {
    const nums = args.split(',').map((a) => toNum(a.trim()));
    return String(Math.max(...nums));
  });

  // ROUND(value, decimals)
  expr = expr.replace(/ROUND\(([^,]+),\s*([^)]+)\)/gi, (_, val, dec) => {
    return String(Number(toNum(val).toFixed(toNum(dec))));
  });

  // ABS(value)
  expr = expr.replace(/ABS\(([^)]+)\)/gi, (_, val) => {
    return String(Math.abs(toNum(val)));
  });

  // IF(condition, trueVal, falseVal) -- simple: IF(a > b, x, y)
  expr = expr.replace(
    /IF\(([^,]+)\s*(>|<|>=|<=|==|!=)\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/gi,
    (_, left, op, right, trueVal, falseVal) => {
      const l = toNum(left.trim());
      const r = toNum(right.trim());
      let result = false;
      switch (op) {
        case '>': result = l > r; break;
        case '<': result = l < r; break;
        case '>=': result = l >= r; break;
        case '<=': result = l <= r; break;
        case '==': result = l === r; break;
        case '!=': result = l !== r; break;
      }
      return String(toNum(result ? trueVal : falseVal));
    }
  );

  return expr;
}

/**
 * Evaluate all formulas, respecting dependencies (topological order).
 * Returns computed values keyed by formula fieldId.
 */
export function evaluateFormulas(
  formulas: FormulaDefinition[],
  fieldValues: Values
): Record<string, number> {
  const computed: Record<string, number> = {};
  const merged = { ...fieldValues };

  // Simple topological sort by dependency detection
  const sorted = [...formulas];
  // Multiple passes to resolve dependencies
  for (let pass = 0; pass < sorted.length; pass++) {
    for (const formula of sorted) {
      const val = evaluateFormula(formula.expression, merged);
      computed[formula.fieldId] = val;
      merged[formula.fieldId] = val;
    }
  }

  return computed;
}
