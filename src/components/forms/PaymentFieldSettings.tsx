import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { FormNode, FormPaymentConfig } from '@/types/forms';

interface PaymentFieldSettingsProps {
  node: FormNode;
  allNodes: FormNode[];
  paymentConfig: FormPaymentConfig | undefined;
  onConfigChange: (config: FormPaymentConfig) => void;
}

export function PaymentFieldSettings({ node, allNodes, paymentConfig, onConfigChange }: PaymentFieldSettingsProps) {
  const config: FormPaymentConfig = paymentConfig || {
    enabled: true,
    mode: 'fixed',
    fixedAmount: 0,
    currency: 'USD',
  };

  const formulaFields = allNodes.filter((n) => n.type === 'formula');

  function update(updates: Partial<FormPaymentConfig>) {
    onConfigChange({ ...config, ...updates });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Enable Payment</Label>
        <Switch
          checked={config.enabled}
          onCheckedChange={(v) => update({ enabled: v })}
        />
      </div>

      {config.enabled && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment Mode</Label>
            <Select value={config.mode} onValueChange={(v) => update({ mode: v as 'fixed' | 'calculated' })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Amount</SelectItem>
                <SelectItem value="calculated">From Formula Field</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.mode === 'fixed' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={config.fixedAmount ?? 0}
                onChange={(e) => update({ fixedAmount: Number(e.target.value) })}
                className="h-8 text-xs"
              />
            </div>
          )}

          {config.mode === 'calculated' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Formula Field</Label>
              {formulaFields.length > 0 ? (
                <Select
                  value={config.calculatedFieldId || ''}
                  onValueChange={(v) => update({ calculatedFieldId: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select formula field" />
                  </SelectTrigger>
                  <SelectContent>
                    {formulaFields.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.properties.label || 'Formula'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">Add a Formula field first to use calculated amounts</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Currency</Label>
            <Input
              value={config.currency || 'USD'}
              onChange={(e) => update({ currency: e.target.value.toUpperCase() })}
              placeholder="USD"
              maxLength={3}
              className="h-8 text-xs w-24"
            />
          </div>
        </>
      )}
    </div>
  );
}
