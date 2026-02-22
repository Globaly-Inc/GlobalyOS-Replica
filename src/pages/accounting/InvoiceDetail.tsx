import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CheckCircle, Send, DollarSign, XCircle, Link2, Loader2, Share2, Copy, MessageSquare } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { PaymentApplicationDialog } from '@/components/accounting/PaymentApplicationDialog';
import { IncomeSharingDialog } from '@/components/accounting/IncomeSharingDialog';
import { InvoiceComments } from '@/components/accounting/InvoiceComments';
import {
  useInvoice, useInvoiceServices, useInvoiceLines, useInvoicePayments,
  useUpdateInvoiceStatus, useGeneratePublicToken,
} from '@/services/useAccountingInvoices';
import type { InvoiceStatus } from '@/types/accounting';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft', approved: 'Approved', sent: 'Sent', paid: 'Paid',
  partially_paid: 'Partially Paid', overdue: 'Overdue', voided: 'Voided',
};

const InvoiceDetail = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const { isAdmin } = useUserRole();
  const { navigateOrg } = useOrgNavigation();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: services = [] } = useInvoiceServices(invoiceId);
  const { data: lines = [] } = useInvoiceLines(invoiceId);
  const { data: payments = [] } = useInvoicePayments(invoiceId);
  const updateStatus = useUpdateInvoiceStatus();
  const generateToken = useGeneratePublicToken();

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice?.currency || 'AUD' }).format(amount);

  const getRecipientName = () => {
    if (invoice?.crm_contacts) return `${invoice.crm_contacts.first_name} ${invoice.crm_contacts.last_name || ''}`.trim();
    if (invoice?.crm_partners) return invoice.crm_partners.name;
    if (invoice?.accounting_contacts) return invoice.accounting_contacts.name;
    return 'No recipient';
  };

  const handleCopyLink = async () => {
    let token = invoice?.public_token;
    if (!token) {
      try {
        token = await generateToken.mutateAsync(invoiceId!);
      } catch { toast.error('Failed to generate link'); return; }
    }
    const url = `${window.location.origin}/invoice/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success('Invoice link copied');
  };

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ invoiceId: invoiceId!, status });
      toast.success('Invoice updated');
    } catch (err: any) { toast.error(err.message); }
  };

  // Group lines by service
  const serviceLines = services.map((svc: any) => ({
    ...svc,
    lines: lines.filter((l: any) => l.invoice_service_id === svc.id),
  }));
  const ungroupedLines = lines.filter((l: any) => !l.invoice_service_id);

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!invoice) return <div className="text-center py-20 text-muted-foreground">Invoice not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <OrgLink to="/accounting/invoices">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </OrgLink>
          <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
          <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'}>
            {STATUS_LABELS[invoice.status as InvoiceStatus]}
          </Badge>
          {invoice.invoice_type && invoice.invoice_type !== 'general' && (
            <Badge variant="outline" className="capitalize">{invoice.invoice_type}</Badge>
          )}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={generateToken.isPending}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
            </Button>
            {invoice.status === 'draft' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('approved')}>
                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
            )}
            {invoice.status === 'approved' && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange('sent')}>
                <Send className="h-3.5 w-3.5 mr-1" /> Mark Sent
              </Button>
            )}
            {['approved', 'sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setSharingOpen(true)}>
                  <Share2 className="h-3.5 w-3.5 mr-1" /> Income Sharing
                </Button>
                <Button size="sm" onClick={() => setPaymentOpen(true)}>
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Record Payment
                </Button>
              </>
            )}
            {invoice.status === 'draft' && (
              <Button variant="destructive" size="sm" onClick={() => handleStatusChange('voided')}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Void
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Invoice info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">To</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{getRecipientName()}</p>
            {invoice.recipient_type && <p className="text-xs text-muted-foreground capitalize">{invoice.recipient_type}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{invoice.date}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{invoice.due_date}</span></div>
            {invoice.reference && <div className="flex justify-between"><span className="text-muted-foreground">Ref</span><span>{invoice.reference}</span></div>}
            {invoice.tax_type && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="capitalize">{invoice.tax_type}</span></div>}
          </CardContent>
        </Card>
      </div>

      {/* Service blocks */}
      {serviceLines.length > 0 && serviceLines.map((svc: any) => (
        <Card key={svc.id} className="border-l-4 border-l-primary/30">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{svc.service_name}</CardTitle>
                {svc.provider_name && <p className="text-xs text-muted-foreground">Provider: {svc.provider_name}</p>}
              </div>
              <span className="font-semibold">{formatCurrency(svc.total)}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="w-[60px] text-right">Qty</TableHead>
                  <TableHead className="w-[90px] text-right">Price</TableHead>
                  <TableHead className="w-[120px]">Account</TableHead>
                  <TableHead className="w-[80px]">Tax</TableHead>
                  <TableHead className="w-[90px] text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {svc.lines.map((l: any) => (
                  <TableRow key={l.id} className={l.is_discount ? 'bg-destructive/5' : ''}>
                    <TableCell className="text-sm">{l.description}</TableCell>
                    <TableCell className="text-xs">{l.fee_type || '—'}</TableCell>
                    <TableCell className="text-right text-sm">{l.quantity}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(l.unit_price)}</TableCell>
                    <TableCell className="text-xs">{l.chart_of_accounts?.code} — {l.chart_of_accounts?.name}</TableCell>
                    <TableCell className="text-xs">{l.tax_rates?.name || '—'}</TableCell>
                    <TableCell className={`text-right font-medium text-sm ${l.is_discount ? 'text-destructive' : ''}`}>
                      {l.is_discount ? '-' : ''}{formatCurrency(Math.abs(l.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Ungrouped lines (legacy) */}
      {ungroupedLines.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[60px] text-right">Qty</TableHead>
                  <TableHead className="w-[90px] text-right">Price</TableHead>
                  <TableHead className="w-[120px]">Account</TableHead>
                  <TableHead className="w-[80px]">Tax</TableHead>
                  <TableHead className="w-[90px] text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ungroupedLines.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.description}</TableCell>
                    <TableCell className="text-right">{l.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(l.unit_price)}</TableCell>
                    <TableCell className="text-xs">{l.chart_of_accounts?.code} — {l.chart_of_accounts?.name}</TableCell>
                    <TableCell className="text-xs">{l.tax_rates?.name || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(l.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Totals */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col items-end space-y-1">
            <div className="flex justify-between w-64">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {(invoice.discount_total || 0) > 0 && (
              <div className="flex justify-between w-64">
                <span className="text-sm text-destructive">Discount</span>
                <span className="text-destructive">-{formatCurrency(invoice.discount_total)}</span>
              </div>
            )}
            {invoice.tax_total > 0 && (
              <div className="flex justify-between w-64">
                <span className="text-sm text-muted-foreground">Tax</span>
                <span>{formatCurrency(invoice.tax_total)}</span>
              </div>
            )}
            <Separator className="w-64" />
            <div className="flex justify-between w-64">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between w-64">
              <span className="text-sm text-muted-foreground">Paid</span>
              <span>{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between w-64 border-t pt-1">
              <span className="font-semibold">Amount Due</span>
              <span className="font-bold text-lg">{formatCurrency(invoice.amount_due ?? (invoice.total - invoice.amount_paid))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments & Comments tabs */}
      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="comments"><MessageSquare className="h-3.5 w-3.5 mr-1" /> Comments</TabsTrigger>
        </TabsList>
        <TabsContent value="payments">
          {payments.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.date}</TableCell>
                        <TableCell className="capitalize">{p.method?.replace('_', ' ')}</TableCell>
                        <TableCell>{p.reference || '—'}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">No payments recorded</CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="comments">
          <Card>
            <CardContent className="pt-4">
              <InvoiceComments invoiceId={invoiceId!} authorType="staff" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notes */}
      {(invoice.notes || invoice.terms) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoice.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{invoice.notes}</p></CardContent>
            </Card>
          )}
          {invoice.terms && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Terms</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{invoice.terms}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <PaymentApplicationDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        invoiceId={invoiceId!}
        amountDue={invoice.amount_due ?? (invoice.total - invoice.amount_paid)}
        amountPaid={invoice.amount_paid}
        invoiceTotal={invoice.total}
        currency={invoice.currency}
      />
      <IncomeSharingDialog
        open={sharingOpen}
        onOpenChange={setSharingOpen}
        invoiceId={invoiceId!}
        services={services}
        currency={invoice.currency}
      />
    </div>
  );
};

export default InvoiceDetail;
