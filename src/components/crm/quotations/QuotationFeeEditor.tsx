/**
 * QuotationFeeEditor - Display and manage individual fee items
 */
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CRMQuotationServiceFee } from '@/types/crm-quotation';

interface QuotationFeeEditorProps {
  fee: CRMQuotationServiceFee;
  currency: string;
  isDraft: boolean;
  onDelete: () => void;
}

export const QuotationFeeEditor = ({ fee, currency, isDraft, onDelete }: QuotationFeeEditorProps) => {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-accent/20 group">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground truncate">{fee.fee_name}</span>
        {fee.tax_rate > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {fee.tax_mode === 'inclusive' ? 'incl' : 'excl'} {fee.tax_rate}%
          </Badge>
        )}
        {fee.revenue_type === 'commission_from_partner' && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Commission</Badge>
        )}
        {fee.num_installments > 1 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {fee.num_installments}x
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span className="font-medium tabular-nums">
            {currency} {fee.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          {fee.tax_amount > 0 && (
            <span className="text-xs text-muted-foreground ml-1">
              (tax: {currency} {fee.tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
            </span>
          )}
        </div>
        {isDraft && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
