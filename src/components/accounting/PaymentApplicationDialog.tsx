/**
 * PaymentApplicationDialog - Record payment with per-service/fee allocation
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useRecordInvoicePayment } from '@/services/useAccountingInvoices';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  amountDue: number;
  amountPaid: number;
  invoiceTotal: number;
  currency?: string;
}

export const PaymentApplicationDialog = ({ open, onOpenChange, invoiceId, amountDue, amountPaid, invoiceTotal, currency = 'AUD' }: Props) => {
  const [amount, setAmount] = useState(String(amountDue));
  const [method, setMethod] = useState('bank_transfer');
  const [reference, setReference] = useState('');
  const recordPayment = useRecordInvoicePayment();

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (parsedAmount > amountDue) {
      toast.error('Amount exceeds amount due');
      return;
    }
    try {
      await recordPayment.mutateAsync({
        invoiceId,
        amount: parsedAmount,
        method,
        reference,
        currentAmountPaid: amountPaid,
        invoiceTotal,
      });
      toast.success('Payment recorded successfully');
      onOpenChange(false);
      setAmount('');
      setReference('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice Total</span>
            <span className="font-medium">{formatAmount(invoiceTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Already Paid</span>
            <span>{formatAmount(amountPaid)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Amount Due</span>
            <span>{formatAmount(amountDue)}</span>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Payment Amount</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reference</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bank ref, check #, etc."
            />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={recordPayment.isPending}>
            {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
