/**
 * AddFeeDialog - Dialog for creating a new fee with full configuration
 */
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import type { TaxMode, FeeRevenueType, QuotationInstallmentType, InstallmentDetail } from '@/types/crm-quotation';
import { calculateTax, calculateEqualInstallments } from '@/types/crm-quotation';

interface AddFeeDialogProps {
  currency: string;
  onAdd: (data: {
    fee_name: string;
    amount: number;
    tax_mode: TaxMode;
    tax_rate: number;
    revenue_type: FeeRevenueType;
    installment_type: QuotationInstallmentType;
    num_installments: number;
    installment_details: InstallmentDetail[];
  }) => void;
  children?: React.ReactNode;
}

export const AddFeeDialog = ({ currency, onAdd, children }: AddFeeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [feeName, setFeeName] = useState('Service Fee');
  const [amount, setAmount] = useState('0');
  const [taxMode, setTaxMode] = useState<TaxMode>('exclusive');
  const [taxRate, setTaxRate] = useState('10');
  const [revenueType, setRevenueType] = useState<FeeRevenueType>('revenue_from_client');
  const [installmentType, setInstallmentType] = useState<QuotationInstallmentType>('equal');
  const [numInstallments, setNumInstallments] = useState('1');
  const [customInstallments, setCustomInstallments] = useState<{ amount: string; due_date: string; label: string }[]>([]);

  const reset = () => {
    setFeeName('Service Fee');
    setAmount('0');
    setTaxMode('exclusive');
    setTaxRate('10');
    setRevenueType('revenue_from_client');
    setInstallmentType('equal');
    setNumInstallments('1');
    setCustomInstallments([]);
  };

  const handleSubmit = () => {
    const amt = parseFloat(amount) || 0;
    const rate = parseFloat(taxRate) || 0;
    const numInst = parseInt(numInstallments) || 1;

    let details: InstallmentDetail[] = [];
    if (installmentType === 'custom' && customInstallments.length > 0) {
      details = customInstallments.map((ci, i) => ({
        index: i + 1,
        amount: parseFloat(ci.amount) || 0,
        due_date: ci.due_date,
        label: ci.label || undefined,
      }));
    } else if (numInst > 1) {
      const { totalAmount } = calculateTax(amt, rate, taxMode);
      const amounts = calculateEqualInstallments(totalAmount, numInst);
      details = amounts.map((a, i) => ({ index: i + 1, amount: a, due_date: '' }));
    }

    onAdd({
      fee_name: feeName,
      amount: amt,
      tax_mode: taxMode,
      tax_rate: rate,
      revenue_type: revenueType,
      installment_type: installmentType,
      num_installments: installmentType === 'custom' ? customInstallments.length || 1 : numInst,
      installment_details: details,
    });

    reset();
    setOpen(false);
  };

  const addCustomInstallment = () => {
    setCustomInstallments(prev => [...prev, { amount: '0', due_date: '', label: '' }]);
  };

  const preview = calculateTax(parseFloat(amount) || 0, parseFloat(taxRate) || 0, taxMode);

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="text-xs w-full justify-start">
            <Plus className="h-3 w-3 mr-1" /> Add Fee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Fee</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Fee Name</Label>
            <Input value={feeName} onChange={e => setFeeName(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Amount ({currency})</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label>Tax Mode</Label>
            <RadioGroup value={taxMode} onValueChange={v => setTaxMode(v as TaxMode)} className="flex gap-4 mt-1">
              <div className="flex items-center gap-1.5"><RadioGroupItem value="exclusive" id="tax-excl" /><Label htmlFor="tax-excl" className="text-sm">Exclusive</Label></div>
              <div className="flex items-center gap-1.5"><RadioGroupItem value="inclusive" id="tax-incl" /><Label htmlFor="tax-incl" className="text-sm">Inclusive</Label></div>
            </RadioGroup>
          </div>

          <div>
            <Label>Tax Rate (%)</Label>
            <Input type="number" min={0} max={100} value={taxRate} onChange={e => setTaxRate(e.target.value)} className="mt-1 w-24" />
          </div>

          <div>
            <Label>Revenue Type</Label>
            <RadioGroup value={revenueType} onValueChange={v => setRevenueType(v as FeeRevenueType)} className="flex gap-4 mt-1">
              <div className="flex items-center gap-1.5"><RadioGroupItem value="revenue_from_client" id="rev-client" /><Label htmlFor="rev-client" className="text-sm">Client Revenue</Label></div>
              <div className="flex items-center gap-1.5"><RadioGroupItem value="commission_from_partner" id="rev-commission" /><Label htmlFor="rev-commission" className="text-sm">Commission</Label></div>
            </RadioGroup>
          </div>

          <div>
            <Label>Installments</Label>
            <RadioGroup value={installmentType} onValueChange={v => setInstallmentType(v as QuotationInstallmentType)} className="flex gap-4 mt-1">
              <div className="flex items-center gap-1.5"><RadioGroupItem value="equal" id="inst-equal" /><Label htmlFor="inst-equal" className="text-sm">Equal</Label></div>
              <div className="flex items-center gap-1.5"><RadioGroupItem value="custom" id="inst-custom" /><Label htmlFor="inst-custom" className="text-sm">Custom</Label></div>
            </RadioGroup>
          </div>

          {installmentType === 'equal' && (
            <div>
              <Label>Number of Installments</Label>
              <Input type="number" min={1} value={numInstallments} onChange={e => setNumInstallments(e.target.value)} className="mt-1 w-24" />
            </div>
          )}

          {installmentType === 'custom' && (
            <div className="space-y-2">
              <Label>Custom Installments</Label>
              {customInstallments.map((ci, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder="Label" value={ci.label} onChange={e => {
                    const next = [...customInstallments];
                    next[i] = { ...next[i], label: e.target.value };
                    setCustomInstallments(next);
                  }} className="w-24 h-8 text-sm" />
                  <Input type="number" placeholder="Amount" value={ci.amount} onChange={e => {
                    const next = [...customInstallments];
                    next[i] = { ...next[i], amount: e.target.value };
                    setCustomInstallments(next);
                  }} className="w-24 h-8 text-sm" />
                  <Input type="date" value={ci.due_date} onChange={e => {
                    const next = [...customInstallments];
                    next[i] = { ...next[i], due_date: e.target.value };
                    setCustomInstallments(next);
                  }} className="h-8 text-sm" />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCustomInstallments(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addCustomInstallment} className="text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add Installment
              </Button>
            </div>
          )}

          {/* Preview */}
          <div className="bg-muted/50 rounded-md p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Base</span><span>{currency} {preview.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{currency} {preview.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between font-medium"><span>Total</span><span>{currency} {preview.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Add Fee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
