import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FormNode, LogicRule, LogicCondition, LogicAction, LogicComparator, LogicActionType } from '@/types/forms';

interface LogicTabProps {
  node: FormNode;
  allNodes: FormNode[];
  onUpdate: (id: string, updates: Partial<FormNode>) => void;
}

const comparators: { value: LogicComparator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'gte', label: '>= ' },
  { value: 'lte', label: '<=' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
];

const actionTypes: { value: LogicActionType; label: string }[] = [
  { value: 'show', label: 'Show' },
  { value: 'hide', label: 'Hide' },
  { value: 'require', label: 'Require' },
  { value: 'unrequire', label: 'Unrequire' },
  { value: 'set_value', label: 'Set value' },
];

const fieldTypes = ['text', 'email', 'phone', 'textarea', 'number', 'dropdown', 'multi_select', 'checkbox', 'radio', 'date', 'file', 'formula', 'payment'];

export function LogicTab({ node, allNodes, onUpdate }: LogicTabProps) {
  const rules = node.logicRules || [];
  const otherFields = allNodes.filter((n) => n.id !== node.id && fieldTypes.includes(n.type));
  const allFields = allNodes.filter((n) => fieldTypes.includes(n.type));

  function updateRules(newRules: LogicRule[]) {
    onUpdate(node.id, { logicRules: newRules });
  }

  function addRule() {
    const newRule: LogicRule = {
      id: crypto.randomUUID(),
      conditions: [{
        fieldId: otherFields[0]?.id || '',
        comparator: 'equals',
        value: '',
      }],
      conditionOperator: 'and',
      actions: [{
        type: 'show',
        targetFieldId: node.id,
      }],
    };
    updateRules([...rules, newRule]);
  }

  function removeRule(ruleId: string) {
    updateRules(rules.filter((r) => r.id !== ruleId));
  }

  function updateCondition(ruleId: string, condIdx: number, updates: Partial<LogicCondition>) {
    updateRules(rules.map((r) => {
      if (r.id !== ruleId) return r;
      const conditions = r.conditions.map((c, i) => i === condIdx ? { ...c, ...updates } : c);
      return { ...r, conditions };
    }));
  }

  function addCondition(ruleId: string) {
    updateRules(rules.map((r) => {
      if (r.id !== ruleId) return r;
      return {
        ...r,
        conditions: [...r.conditions, { fieldId: otherFields[0]?.id || '', comparator: 'equals' as LogicComparator, value: '' }],
      };
    }));
  }

  function removeCondition(ruleId: string, condIdx: number) {
    updateRules(rules.map((r) => {
      if (r.id !== ruleId) return r;
      return { ...r, conditions: r.conditions.filter((_, i) => i !== condIdx) };
    }));
  }

  function updateAction(ruleId: string, updates: Partial<LogicAction>) {
    updateRules(rules.map((r) => {
      if (r.id !== ruleId) return r;
      return { ...r, actions: [{ ...r.actions[0], ...updates }] };
    }));
  }

  function updateOperator(ruleId: string, op: 'and' | 'or') {
    updateRules(rules.map((r) => r.id === ruleId ? { ...r, conditionOperator: op } : r));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Logic Rules</Label>
        <Button variant="outline" size="sm" onClick={addRule} disabled={otherFields.length === 0}>
          <Plus className="h-3 w-3 mr-1" /> Add Rule
        </Button>
      </div>

      {otherFields.length === 0 && (
        <p className="text-xs text-muted-foreground">Add more fields to create logic rules</p>
      )}

      {rules.map((rule) => (
        <div key={rule.id} className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase">If</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRule(rule.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {rule.conditions.map((cond, ci) => (
            <div key={ci} className="space-y-2">
              {ci > 0 && (
                <Select value={rule.conditionOperator} onValueChange={(v) => updateOperator(rule.id, v as 'and' | 'or')}>
                  <SelectTrigger className="h-7 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">AND</SelectItem>
                    <SelectItem value="or">OR</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-1.5 items-start flex-wrap">
                <Select value={cond.fieldId} onValueChange={(v) => updateCondition(rule.id, ci, { fieldId: v })}>
                  <SelectTrigger className="h-8 text-xs flex-1 min-w-[100px]">
                    <SelectValue placeholder="Field" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.properties.label || f.type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={cond.comparator} onValueChange={(v) => updateCondition(rule.id, ci, { comparator: v as LogicComparator })}>
                  <SelectTrigger className="h-8 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {comparators.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!['is_empty', 'is_not_empty'].includes(cond.comparator) && (
                  <Input
                    value={String(cond.value ?? '')}
                    onChange={(e) => updateCondition(rule.id, ci, { value: e.target.value })}
                    className="h-8 text-xs w-24"
                    placeholder="Value"
                  />
                )}
                {rule.conditions.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeCondition(rule.id, ci)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => addCondition(rule.id)}>
            <Plus className="h-3 w-3 mr-1" /> Add Condition
          </Button>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">Then</span>
            <div className="flex gap-1.5 flex-wrap">
              <Select value={rule.actions[0]?.type || 'show'} onValueChange={(v) => updateAction(rule.id, { type: v as LogicActionType })}>
                <SelectTrigger className="h-8 text-xs w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={rule.actions[0]?.targetFieldId || node.id}
                onValueChange={(v) => updateAction(rule.id, { targetFieldId: v })}
              >
                <SelectTrigger className="h-8 text-xs flex-1 min-w-[100px]">
                  <SelectValue placeholder="Target field" />
                </SelectTrigger>
                <SelectContent>
                  {allFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.properties.label || f.type}{f.id === node.id ? ' (this)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rule.actions[0]?.type === 'set_value' && (
                <Input
                  value={String(rule.actions[0]?.value ?? '')}
                  onChange={(e) => updateAction(rule.id, { value: e.target.value })}
                  className="h-8 text-xs w-24"
                  placeholder="Value"
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
