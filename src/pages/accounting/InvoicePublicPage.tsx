/**
 * Public Invoice Page - viewable by anyone with a valid token
 * Two-panel layout: payment options on left, invoice details on right
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Building2, CreditCard, Download, Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  usePublicInvoice, usePublicInvoiceServices, usePublicInvoiceLines,
  usePublicInvoicePayments, usePublicInvoiceComments,
} from '@/services/useAccountingInvoices';
import type { InvoiceStatus } from '@/types/accounting';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft', approved: 'Approved', sent: 'Sent', paid: 'Paid',
  partially_paid: 'Partially Paid', overdue: 'Overdue', voided: 'Voided',
};

const InvoicePublicPage = () => {
  const { token } = useParams<{ token: string }>();
  const { data: invoice, isLoading } = usePublicInvoice(token);
  const { data: services = [] } = usePublicInvoiceServices(invoice?.id);
  const { data: lines = [] } = usePublicInvoiceLines(invoice?.id);
  const { data: payments = [] } = usePublicInvoicePayments(invoice?.id);
  const { data: comments = [] } = usePublicInvoiceComments(invoice?.id);
  const [commentContent, setCommentContent] = useState('');
  const [commentName, setCommentName] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice?.currency || 'AUD' }).format(amount);

  const getRecipientName = () => {
    if (invoice?.crm_contacts) return `${invoice.crm_contacts.first_name} ${invoice.crm_contacts.last_name || ''}`.trim();
    if (invoice?.crm_partners) return invoice.crm_partners.name;
    if (invoice?.accounting_contacts) return invoice.accounting_contacts.name;
    return '';
  };

  const handleAddComment = async () => {
    if (!commentContent.trim() || !invoice) return;
    setSubmittingComment(true);
    try {
      await supabase.from('accounting_invoice_comments').insert({
        invoice_id: invoice.id,
        organization_id: invoice.organization_id,
        author_type: 'client',
        author_name: commentName || 'Client',
        content: commentContent.trim(),
      } as any);
      setCommentContent('');
      toast.success('Comment added');
      // Force refetch
      window.location.reload();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Group lines by service
  const serviceLines = services.map((svc: any) => ({
    ...svc,
    lines: lines.filter((l: any) => l.invoice_service_id === svc.id),
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold">Invoice Not Found</h2>
            <p className="text-sm text-muted-foreground">This invoice link may be invalid or expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amountDue = invoice.amount_due ?? (invoice.total - invoice.amount_paid);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Invoice {invoice.invoice_number}</h1>
            <p className="text-sm text-muted-foreground">To: {getRecipientName()}</p>
          </div>
          <Badge variant={invoice.status === 'paid' ? 'default' : invoice.status === 'overdue' ? 'destructive' : 'secondary'} className="text-sm">
            {STATUS_LABELS[invoice.status as InvoiceStatus]}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel - Payment info */}
          <div className="space-y-4">
            {/* Amount due */}
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">Amount Due</p>
                <p className="text-3xl font-bold">{formatCurrency(amountDue)}</p>
                {invoice.due_date && (
                  <p className="text-xs text-muted-foreground mt-1">Due: {invoice.due_date}</p>
                )}
              </CardContent>
            </Card>

            {/* Payment method */}
            {invoice.enable_online_payment && amountDue > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Pay Online</CardTitle></CardHeader>
                <CardContent>
                  <Button className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" /> Pay Now
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">Secure payment via Stripe</p>
                </CardContent>
              </Card>
            )}

            {/* Bank details (from payment option - show if available) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank Transfer</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="text-muted-foreground">Contact the issuer for bank transfer details.</p>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {comments.map((c: any) => (
                    <div key={c.id} className="flex gap-2">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px]">{(c.author_name || '?')[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-medium">{c.author_name || c.author_type}</p>
                        <p className="text-xs text-muted-foreground">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-xs text-muted-foreground text-center">No comments</p>}
                </div>
                <Separator />
                <Input value={commentName} onChange={(e) => setCommentName(e.target.value)} placeholder="Your name" className="text-xs h-8" />
                <div className="flex gap-2">
                  <Input value={commentContent} onChange={(e) => setCommentContent(e.target.value)} placeholder="Add a comment…" className="text-xs h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()} />
                  <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAddComment} disabled={submittingComment}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel - Invoice details */}
          <div className="lg:col-span-2 space-y-4">
            {/* Invoice info */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Date</span><p className="font-medium">{invoice.date}</p></div>
                  <div><span className="text-muted-foreground">Due Date</span><p className="font-medium">{invoice.due_date}</p></div>
                  <div><span className="text-muted-foreground">Currency</span><p className="font-medium">{invoice.currency}</p></div>
                  {invoice.reference && <div><span className="text-muted-foreground">Reference</span><p className="font-medium">{invoice.reference}</p></div>}
                </div>
              </CardContent>
            </Card>

            {/* Service blocks */}
            {serviceLines.map((svc: any) => (
              <Card key={svc.id} className="border-l-4 border-l-primary/30">
                <CardHeader className="py-3">
                  <div className="flex justify-between items-center">
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
                        <TableHead className="w-[60px] text-right">Qty</TableHead>
                        <TableHead className="w-[80px] text-right">Price</TableHead>
                        <TableHead className="w-[60px] text-right">Tax</TableHead>
                        <TableHead className="w-[80px] text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {svc.lines.map((l: any) => (
                        <TableRow key={l.id} className={l.is_discount ? 'bg-destructive/5' : ''}>
                          <TableCell className="text-sm">{l.description}</TableCell>
                          <TableCell className="text-right text-sm">{l.quantity}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(l.unit_price)}</TableCell>
                          <TableCell className="text-right text-xs">{formatCurrency(l.tax_amount)}</TableCell>
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
                    <span className="font-bold text-lg">{formatCurrency(amountDue)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments */}
            {payments.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Payments Received</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.date}</TableCell>
                          <TableCell className="capitalize">{p.method?.replace('_', ' ')}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {invoice.notes && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{invoice.notes}</p></CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePublicPage;
