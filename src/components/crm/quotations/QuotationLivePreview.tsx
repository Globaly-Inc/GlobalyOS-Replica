/**
 * QuotationLivePreview - Client-facing preview panel
 */
import { Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { CRMQuotation } from '@/types/crm-quotation';

interface QuotationLivePreviewProps {
  quotation: CRMQuotation;
}

export const QuotationLivePreview = ({ quotation }: QuotationLivePreviewProps) => {
  const contactName = quotation.contact
    ? `${quotation.contact.first_name} ${quotation.contact.last_name || ''}`.trim()
    : 'Client';

  return (
    <div className="h-full overflow-y-auto bg-muted/30 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        <span>Client preview — this is how your client will see the quotation</span>
      </div>

      {/* Preview card */}
      <div className="bg-card rounded-xl border shadow-sm max-w-lg mx-auto">
        {/* Branding header */}
        <div className="bg-primary/5 rounded-t-xl px-6 py-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Quotation</p>
          <p className="text-lg font-semibold mt-1">{quotation.quotation_number}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span>To: <span className="text-foreground font-medium">{contactName}</span></span>
            {quotation.company && <span>• {quotation.company.name}</span>}
          </div>
        </div>

        {/* Cover letter */}
        {quotation.cover_letter && (
          <div className="px-6 py-4 border-b">
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quotation.cover_letter}</p>
          </div>
        )}

        {/* Options */}
        <div className="px-6 py-4 space-y-4">
          {quotation.options?.map((option, idx) => (
            <div key={option.id} className={`rounded-lg border p-4 ${option.is_approved ? 'border-emerald-500 bg-emerald-50/50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm">{option.name}</h3>
                  {option.description && <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>}
                </div>
                {option.is_approved && <Badge className="bg-emerald-600 text-white text-xs">Approved</Badge>}
              </div>

              {/* Services table */}
              {option.services?.map(svc => (
                <div key={svc.id} className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{svc.service_name}</p>
                  {svc.fees?.map(fee => (
                    <div key={fee.id} className="flex justify-between text-sm pl-3 py-0.5">
                      <span className="text-muted-foreground">{fee.fee_name}</span>
                      <span className="tabular-nums font-medium">
                        {quotation.currency} {fee.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              ))}

              <Separator className="my-2" />
              <div className="flex justify-between text-sm font-semibold">
                <span>Option Total</span>
                <span className="tabular-nums">{quotation.currency} {option.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-muted/30 rounded-b-xl space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{quotation.currency} {quotation.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {quotation.tax_total > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">{quotation.currency} {quotation.tax_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {quotation.discount_amount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Discount {quotation.discount_description && `(${quotation.discount_description})`}</span>
              <span className="tabular-nums">-{quotation.currency} {quotation.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Grand Total</span>
            <span className="tabular-nums">{quotation.currency} {quotation.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Valid until */}
      {quotation.valid_until && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          Valid until {new Date(quotation.valid_until).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};
