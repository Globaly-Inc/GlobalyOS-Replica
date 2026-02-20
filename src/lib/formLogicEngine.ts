/**
 * Form Logic Engine - Pure functions for evaluating conditional logic rules
 */
import type { LogicRule, LogicCondition, FieldState } from '@/types/forms';

function evaluateCondition(
  condition: LogicCondition,
  values: Record<string, unknown>
): boolean {
  const fieldValue = values[condition.fieldId];
  const target = condition.value;

  switch (condition.comparator) {
    case 'equals':
      return String(fieldValue ?? '') === String(target ?? '');
    case 'not_equals':
      return String(fieldValue ?? '') !== String(target ?? '');
    case 'contains':
      return String(fieldValue ?? '').toLowerCase().includes(String(target ?? '').toLowerCase());
    case 'gt':
      return Number(fieldValue) > Number(target);
    case 'lt':
      return Number(fieldValue) < Number(target);
    case 'gte':
      return Number(fieldValue) >= Number(target);
    case 'lte':
      return Number(fieldValue) <= Number(target);
    case 'is_empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '';
    case 'is_not_empty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: LogicCondition[],
  operator: 'and' | 'or',
  values: Record<string, unknown>
): boolean {
  if (conditions.length === 0) return false;
  if (operator === 'and') {
    return conditions.every((c) => evaluateCondition(c, values));
  }
  return conditions.some((c) => evaluateCondition(c, values));
}

/**
 * Evaluate all logic rules and return a map of field states.
 * Fields not mentioned in any rule default to { visible: true, required: false }.
 */
export function evaluateLogicRules(
  rules: LogicRule[],
  currentValues: Record<string, unknown>
): Record<string, FieldState> {
  const states: Record<string, FieldState> = {};

  for (const rule of rules) {
    const match = evaluateConditions(
      rule.conditions,
      rule.conditionOperator,
      currentValues
    );

    if (match) {
      for (const action of rule.actions) {
        if (!states[action.targetFieldId]) {
          states[action.targetFieldId] = { visible: true, required: false };
        }
        const s = states[action.targetFieldId];
        switch (action.type) {
          case 'show':
            s.visible = true;
            break;
          case 'hide':
            s.visible = false;
            break;
          case 'require':
            s.required = true;
            break;
          case 'unrequire':
            s.required = false;
            break;
          case 'set_value':
            s.setValue = action.value;
            break;
        }
      }
    }
  }

  return states;
}
