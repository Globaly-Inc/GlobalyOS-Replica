/**
 * InvoiceServiceBlock - A service section in the invoice editor
 * Groups fee/line items under a service name with provider info
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import type { InvoiceServiceFormData, InvoiceLineFormData, ChartOfAccount, TaxRate } from '@/types/accounting';

interface Props {
  service: InvoiceServiceFormData;
  index: number;
  accounts: ChartOfAccount[];
  taxRates: TaxRate[];
  currency: string;
  onUpdate: (index: number, service: InvoiceServiceFormData) => void;
  onRemove: (index: number) => void;
}

const emptyLine = (): InvoiceLineFormData => ({
  description: '',
  fee_type: '',
  account_category: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
  tax_rate_id: '',
  tax_amount: 0,
  is_discount: false,
  account_id: '',
});

export const InvoiceServiceBlock = ({ service, index, accounts, taxRates, currency, onUpdate, onRemove }: Props) => {
  const [open, setOpen] = useState(true);

  const updateService = (field: keyof InvoiceServiceFormData, value: any) => {
    onUpdate(index, { ...service, [field]: value });
  };

  const updateLine = (lineIdx: number, field: keyof InvoiceLineFormData, value: any) => {
    const newLines = [...service.lines];
    const line = { ...newLines[lineIdx], [field]: value };

    // Recalculate amount
    if (field === 'quantity' || field === 'unit_price') {
      line.amount = (line.quantity || 0) * (line.unit_price || 0);
      if (line.is_discount) line.amount = -Math.abs(line.amount);
    }

    // Recalculate tax
    if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate_id' || field === 'amount') {
      const rate = taxRates.find((t) => t.id === line.tax_rate_id);
      line.tax_amount = rate ? Math.abs(line.amount) * (rate.rate / 100) : 0;
    }

    // Discount toggle
    if (field === 'is_discount') {
      line.amount = value ? -Math.abs(line.amount) : Math.abs(line.amount);
    }

    newLines[lineIdx] = line;
    onUpdate(index, { ...service, lines: newLines });
  };

  const addLine = () => {
    onUpdate(index, { ...service, lines: [...service.lines, emptyLine()] });
  };

  const removeLine = (lineIdx: number) => {
    const newLines = service.lines.filter((_, i) => i !== lineIdx);
    onUpdate(index, { ...service, lines: newLines.length > 0 ? newLines : [emptyLine()] });
  };

  const serviceSubtotal = service.lines
    .filter((l) => !l.is_discount)
    .reduce((s, l) => s + Math.abs(l.amount), 0);
  const serviceDiscount = service.lines
    .filter((l) => l.is_discount)
    .reduce((s, l) => s + Math.abs(l.amount), 0);
  const serviceTax = service.lines.reduce((s, l) => s + l.tax_amount, 0);
  const serviceTotal = serviceSubtotal - serviceDiscount + serviceTax;

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'AUD' }).format(n);

  return (
    <Card className="border-l-4 border-l-primary/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0">
              {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Input
                  value={service.service_name}
                  onChange={(e) => updateService('service_name', e.target.value)}
                  placeholder="Service name (e.g. Student Visa 500)"
                  className="font-semibold text-sm h-8"
                  onClick={(e) => e.stopPropagation()}
                />
                <Input
                  value={service.provider_name || ''}
                  onChange={(e) => updateService('provider_name', e.target.value)}
                  placeholder="Provider (optional)"
                  className="text-xs h-8 max-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold">{formatAmount(serviceTotal)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(index)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="p-0 pb-3">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4">Description</TableHead>
                  <TableHead className="w-[100px]">Fee Type</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[100px]">Unit Price</TableHead>
                  <TableHead className="w-[160px]">Account</TableHead>
                  <TableHead className="w-[120px]">Tax</TableHead>
                  <TableHead className="w-[60px]">Disc?</TableHead>
                  <TableHead className="w-[90px] text-right">Amount</TableHead>
                  <TableHead className="w-[36px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {service.lines.map((line, li) => (
                  <TableRow key={li} className={line.is_discount ? 'bg-destructive/5' : ''}>
                    <TableCell className="pl-4">
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(li, 'description', e.target.value)}
                        placeholder="Fee description"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.fee_type || ''}
                        onChange={(e) => updateLine(li, 'fee_type', e.target.value)}
                        placeholder="Type"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLine(li, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={line.unit_price}
                        onChange={(e) => updateLine(li, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.account_id}
                        onValueChange={(v) => updateLine(li, 'account_id', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((a) => a.type === 'revenue' || a.type === 'expense')
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id} className="text-xs">
                                {a.code} — {a.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={line.tax_rate_id || ''}
                        onValueChange={(v) => updateLine(li, 'tax_rate_id', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="No tax" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs">No Tax</SelectItem>
                          {taxRates.map((t) => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">
                              {t.name} ({t.rate}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={line.is_discount}
                        onCheckedChange={(v) => updateLine(li, 'is_discount', v)}
                        className="scale-75"
                      />
                    </TableCell>
                    <TableCell className={`text-right text-xs font-medium ${line.is_discount ? 'text-destructive' : ''}`}>
                      {line.is_discount ? '-' : ''}{formatAmount(Math.abs(line.amount))}
                    </TableCell>
                    <TableCell>
                      {service.lines.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeLine(li)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 pt-2 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={addLine} className="text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add Fee
              </Button>
              <div className="text-xs text-muted-foreground space-x-4">
                <span>Subtotal: {formatAmount(serviceSubtotal)}</span>
                {serviceDiscount > 0 && <span className="text-destructive">Discount: -{formatAmount(serviceDiscount)}</span>}
                {serviceTax > 0 && <span>Tax: {formatAmount(serviceTax)}</span>}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
