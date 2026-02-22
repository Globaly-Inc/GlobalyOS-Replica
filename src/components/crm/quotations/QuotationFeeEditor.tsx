/**
 * QuotationFeeEditor - Inline editable fee item
 */
import { useState, useCallback } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { CRMQuotationServiceFee, TaxMode, FeeRevenueType, QuotationInstallmentType, InstallmentDetail } from '@/types/crm-quotation';

interface QuotationFeeEditorProps {
  fee: CRMQuotationServiceFee;
  currency: string;
  isDraft: boolean;
  onDelete: () => void;
  onUpdate?: (data: Partial<CRMQuotationServiceFee>) => void;
}

export const QuotationFeeEditor = ({ fee, currency, isDraft, onDelete, onUpdate }: QuotationFeeEditorProps) => {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editName, setEditName] = useState(fee.fee_name);
  const [editAmount, setEditAmount] = useState(fee.amount.toString());
  const [editTaxRate, setEditTaxRate] = useState(fee.tax_rate.toString());
  const [editNumInstallments, setEditNumInstallments] = useState(fee.num_installments.toString());
  const [showInstallments, setShowInstallments] = useState(false);

  const handleSave = useCallback((field: string, value: any) => {
    if (!onUpdate) return;
    setEditingField(null);

    const updates: any = {};
    switch (field) {
      case 'fee_name':
        if (value !== fee.fee_name) updates.fee_name = value;
        break;
      case 'amount': {
        const num = parseFloat(value);
        if (!isNaN(num) && num !== fee.amount) {
          updates.amount = num;
          updates.tax_mode = fee.tax_mode;
          updates.tax_rate = fee.tax_rate;
        }
        break;
      }
      case 'tax_rate': {
        const num = parseFloat(value);
        if (!isNaN(num) && num !== fee.tax_rate) {
          updates.tax_rate = num;
          updates.amount = fee.amount;
          updates.tax_mode = fee.tax_mode;
        }
        break;
      }
      case 'tax_mode':
        if (value !== fee.tax_mode) {
          updates.tax_mode = value;
          updates.amount = fee.amount;
          updates.tax_rate = fee.tax_rate;
        }
        break;
      case 'revenue_type':
        if (value !== fee.revenue_type) updates.revenue_type = value;
        break;
      case 'installment_type':
        if (value !== fee.installment_type) updates.installment_type = value;
        break;
      case 'num_installments': {
        const num = parseInt(value);
        if (!isNaN(num) && num !== fee.num_installments) updates.num_installments = num;
        break;
      }
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  }, [fee, onUpdate]);

  const isCommission = fee.revenue_type === 'commission_from_partner';
  const borderColor = isCommission ? 'border-l-purple-500' : 'border-l-primary';

  return (
    <div className={`border-l-2 ${borderColor} rounded-md bg-accent/10 px-3 py-2 space-y-1.5`}>
      {/* Row 1: Name + Amount */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isDraft && editingField === 'fee_name' ? (
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => handleSave('fee_name', editName)}
              onKeyDown={e => e.key === 'Enter' && handleSave('fee_name', editName)}
              className="h-7 text-sm"
              autoFocus
            />
          ) : (
            <span
              className={`text-sm truncate ${isDraft ? 'cursor-pointer hover:underline' : ''}`}
              onClick={() => isDraft && (setEditName(fee.fee_name), setEditingField('fee_name'))}
            >
              {fee.fee_name}
            </span>
          )}
          {isCommission && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 bg-purple-100 text-purple-700">Commission</Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDraft && editingField === 'amount' ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">{currency}</span>
              <Input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                onBlur={() => handleSave('amount', editAmount)}
                onKeyDown={e => e.key === 'Enter' && handleSave('amount', editAmount)}
                className="h-7 w-28 text-sm text-right"
                autoFocus
              />
            </div>
          ) : (
            <span
              className={`font-medium tabular-nums text-sm ${isDraft ? 'cursor-pointer hover:underline' : ''}`}
              onClick={() => isDraft && (setEditAmount(fee.amount.toString()), setEditingField('amount'))}
            >
              {currency} {fee.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
          {isDraft && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Tax + meta badges (always shown) */}
      <div className="flex items-center gap-2 flex-wrap">
        {isDraft ? (
          <>
            <Select value={fee.tax_mode} onValueChange={v => handleSave('tax_mode', v)}>
              <SelectTrigger className="h-6 w-[70px] text-[10px] px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inclusive">Incl</SelectItem>
                <SelectItem value="exclusive">Excl</SelectItem>
              </SelectContent>
            </Select>
            {editingField === 'tax_rate' ? (
              <Input
                type="number"
                value={editTaxRate}
                onChange={e => setEditTaxRate(e.target.value)}
                onBlur={() => handleSave('tax_rate', editTaxRate)}
                onKeyDown={e => e.key === 'Enter' && handleSave('tax_rate', editTaxRate)}
                className="h-6 w-16 text-[10px]"
                autoFocus
              />
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-accent"
                onClick={() => { setEditTaxRate(fee.tax_rate.toString()); setEditingField('tax_rate'); }}
              >
                {fee.tax_rate}% tax
              </Badge>
            )}
            {fee.tax_amount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                (tax: {currency} {fee.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
              </span>
            )}
            <Select value={fee.revenue_type} onValueChange={v => handleSave('revenue_type', v)}>
              <SelectTrigger className="h-6 w-[100px] text-[10px] px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue_from_client">Client Rev</SelectItem>
                <SelectItem value="commission_from_partner">Commission</SelectItem>
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            {fee.tax_rate > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {fee.tax_mode === 'inclusive' ? 'incl' : 'excl'} {fee.tax_rate}%
              </Badge>
            )}
            {fee.tax_amount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                (tax: {currency} {fee.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
              </span>
            )}
            {isCommission && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Commission</Badge>
            )}
          </>
        )}
      </div>

      {/* Row 3: Installments */}
      {isDraft && (
        <div className="flex items-center gap-2">
          <Select value={fee.installment_type} onValueChange={v => handleSave('installment_type', v)}>
            <SelectTrigger className="h-6 w-[90px] text-[10px] px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equal">Equal</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {editingField === 'num_installments' ? (
            <Input
              type="number"
              min={1}
              value={editNumInstallments}
              onChange={e => setEditNumInstallments(e.target.value)}
              onBlur={() => handleSave('num_installments', editNumInstallments)}
              onKeyDown={e => e.key === 'Enter' && handleSave('num_installments', editNumInstallments)}
              className="h-6 w-14 text-[10px]"
              autoFocus
            />
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-accent"
              onClick={() => { setEditNumInstallments(fee.num_installments.toString()); setEditingField('num_installments'); }}
            >
              {fee.num_installments}x installment{fee.num_installments > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      {/* Installment details (non-draft or custom) */}
      {fee.num_installments > 1 && fee.installment_details?.length > 0 && (
        <Collapsible open={showInstallments} onOpenChange={setShowInstallments}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1">
              {showInstallments ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              Installments
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pl-2 space-y-1 mt-1">
              {fee.installment_details.map((inst: InstallmentDetail, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{inst.label || `#${inst.index}`}</span>
                  <span className="tabular-nums">{currency} {inst.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {inst.due_date && <span>due {inst.due_date}</span>}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
