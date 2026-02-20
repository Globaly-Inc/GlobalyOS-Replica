import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useAuth } from '@/hooks/useAuth';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CheckCircle, DollarSign, XCircle } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import type { AccountingBill, BillStatus } from '@/types/accounting';

const STATUS_LABELS: Record<BillStatus, string> = {
  draft: 'Draft', approved: 'Approved', paid: 'Paid',
  partially_paid: 'Partially Paid', overdue: 'Overdue', voided: 'Voided',
};

const BillDetail = () => {
  const { billId } = useParams<{ billId: string }>();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { navigateOrg } = useOrgNavigation();
  const queryClient = useQueryClient();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const { data: bill, isLoading } = useQuery({
    queryKey: ['accounting-bill', billId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_bills')
        .select('*, accounting_contacts(name, email)')
        .eq('id', billId!)
        .single();
      if (error) throw error;
      return data as AccountingBill & { accounting_contacts: { name: string; email: string | null } | null };
    },
    enabled: !!billId,
  });

  const { data: lines = [] } = useQuery({
    queryKey: ['accounting-bill-lines', billId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_bill_lines')
        .select('*, chart_of_accounts(code, name), tax_rates(name, rate)')
        .eq('bill_id', billId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!billId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['accounting-bill-payments', billId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_bill_payments')
        .select('*')
        .eq('bill_id', billId!)
        .order('date');
      if (error) throw error;
      return data;
    },
    enabled: !!billId,
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from('accounting_bills').update(updates).eq('id', billId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-bill', billId] });
      queryClient.invalidateQueries({ queryKey: ['accounting-bills'] });
      toast.success('Bill updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(paymentAmount);
      if (!amount || amount <= 0) throw new Error('Invalid amount');

      const { error: pErr } = await supabase.from('accounting_bill_payments').insert({
        bill_id: billId!,
        amount,
        reference: paymentRef || null,
        method: 'bank_transfer',
      });
      if (pErr) throw pErr;

      const newAmountPaid = (bill?.amount_paid || 0) + amount;
      const newStatus = newAmountPaid >= (bill?.total || 0) ? 'paid' : 'partially_paid';
      const { error: uErr } = await supabase
        .from('accounting_bills')
        .update({ amount_paid: newAmountPaid, status: newStatus })
        .eq('id', billId!);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-bill', billId] });
      queryClient.invalidateQueries({ queryKey: ['accounting-bill-payments', billId] });
      queryClient.invalidateQueries({ queryKey: ['accounting-bills'] });
      toast.success('Payment recorded');
      setPaymentOpen(false);
      setPaymentAmount('');
      setPaymentRef('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: bill?.currency || 'AUD' }).format(amount);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!bill) {
    return <div className="text-center py-20 text-muted-foreground">Bill not found</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OrgLink to="/accounting/bills">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </OrgLink>
          <h1 className="text-2xl font-bold">Bill {bill.bill_number}</h1>
          <Badge variant={bill.status === 'paid' ? 'default' : bill.status === 'overdue' ? 'destructive' : 'secondary'}>
            {STATUS_LABELS[bill.status]}
          </Badge>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            {bill.status === 'draft' && (
              <Button variant="outline" onClick={() => updateStatus.mutate('approved')}>
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
            )}
            {['approved', 'partially_paid', 'overdue'].includes(bill.status) && (
              <Button onClick={() => { setPaymentAmount(String(bill.amount_due)); setPaymentOpen(true); }}>
                <DollarSign className="h-4 w-4 mr-2" /> Record Payment
              </Button>
            )}
            {bill.status === 'draft' && (
              <Button variant="destructive" size="sm" onClick={() => updateStatus.mutate('voided')}>
                <XCircle className="h-4 w-4 mr-2" /> Void
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">From (Supplier)</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{bill.accounting_contacts?.name || 'No supplier'}</p>
            {bill.accounting_contacts?.email && (
              <p className="text-sm text-muted-foreground">{bill.accounting_contacts.email}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Details</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{bill.date}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due</span><span>{bill.due_date}</span></div>
            {bill.reference && <div className="flex justify-between"><span className="text-muted-foreground">Ref</span><span>{bill.reference}</span></div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-[80px] text-right">Qty</TableHead>
                <TableHead className="w-[100px] text-right">Price</TableHead>
                <TableHead className="w-[140px]">Account</TableHead>
                <TableHead className="w-[100px]">Tax</TableHead>
                <TableHead className="w-[100px] text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l: any) => (
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

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col items-end space-y-1">
            <div className="flex justify-between w-60">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {bill.tax_total > 0 && (
              <div className="flex justify-between w-60">
                <span className="text-sm text-muted-foreground">Tax</span>
                <span>{formatCurrency(bill.tax_total)}</span>
              </div>
            )}
            <Separator className="w-60" />
            <div className="flex justify-between w-60">
              <span className="font-semibold">Total</span>
              <span className="font-bold">{formatCurrency(bill.total)}</span>
            </div>
            <div className="flex justify-between w-60">
              <span className="text-sm text-muted-foreground">Paid</span>
              <span>{formatCurrency(bill.amount_paid)}</span>
            </div>
            <div className="flex justify-between w-60 border-t pt-1">
              <span className="font-semibold">Amount Due</span>
              <span className="font-bold text-lg">{formatCurrency(bill.amount_due)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Payments</CardTitle></CardHeader>
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
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.reference || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {bill.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{bill.notes}</p></CardContent>
        </Card>
      )}

      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Bank ref, check #" />
            </div>
            <Button className="w-full" onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BillDetail;
