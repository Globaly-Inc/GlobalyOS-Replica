/**
 * IncomeSharingDialog - Add/manage income sharing entries on an invoice
 */
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInvoiceIncomeSharing,
  useCreateIncomeSharing,
  useDeleteIncomeSharing,
} from '@/services/useAccountingInvoices';
import type { IncomeSharingReceiverType, InvoiceTaxType, AccountingInvoiceService } from '@/types/accounting';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  services?: AccountingInvoiceService[];
  currency?: string;
}

export const IncomeSharingDialog = ({ open, onOpenChange, invoiceId, services = [], currency = 'AUD' }: Props) => {
  const { data: entries = [], isLoading } = useInvoiceIncomeSharing(invoiceId);
  const createMutation = useCreateIncomeSharing();
  const deleteMutation = useDeleteIncomeSharing();

  const [receiverType, setReceiverType] = useState<IncomeSharingReceiverType>('partner');
  const [receiverName, setReceiverName] = useState('');
  const [receiverId, setReceiverId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [taxMode, setTaxMode] = useState<InvoiceTaxType>('inclusive');
  const [taxRate, setTaxRate] = useState('10');

  const handleAdd = async () => {
    if (!receiverName || !amount) {
      toast.error('Receiver name and amount are required');
      return;
    }
    const sharingAmount = parseFloat(amount);
    const rate = parseFloat(taxRate) || 0;
    let taxAmount = 0;
    let totalAmount = sharingAmount;

    if (taxMode === 'inclusive') {
      taxAmount = sharingAmount - sharingAmount / (1 + rate / 100);
    } else {
      taxAmount = sharingAmount * (rate / 100);
      totalAmount = sharingAmount + taxAmount;
    }

    try {
      await createMutation.mutateAsync({
        invoice_id: invoiceId,
        invoice_service_id: serviceId || null,
        receiver_type: receiverType,
        receiver_id: receiverId || crypto.randomUUID(),
        receiver_name: receiverName,
        sharing_amount: sharingAmount,
        tax_mode: taxMode,
        tax_rate: rate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
      });
      toast.success('Income sharing added');
      setReceiverName('');
      setReceiverId('');
      setAmount('');
      setServiceId('');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id, invoiceId });
      toast.success('Income sharing removed');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const statusColor = (status: string) => {
    if (status === 'paid') return 'default';
    if (status === 'partially_paid') return 'outline';
    return 'secondary';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Income Sharing</DialogTitle>
        </DialogHeader>

        {/* Existing entries */}
        {entries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receiver</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.receiver_name}</TableCell>
                  <TableCell className="capitalize text-xs">{e.receiver_type}</TableCell>
                  <TableCell className="text-xs">
                    {services.find((s) => s.id === e.invoice_service_id)?.service_name || '—'}
                  </TableCell>
                  <TableCell className="text-right">{formatAmount(e.sharing_amount)}</TableCell>
                  <TableCell className="text-right">{formatAmount(e.tax_amount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatAmount(e.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor(e.status) as any} className="capitalize text-xs">
                      {e.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDelete(e.id)}
                      disabled={e.status !== 'unpaid'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Add new */}
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Add Income Sharing</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Receiver Type</Label>
              <Select value={receiverType} onValueChange={(v) => setReceiverType(v as IncomeSharingReceiverType)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Receiver Name</Label>
              <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className="h-8 text-xs" placeholder="e.g. Partner ABC" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Service</Label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Services</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.service_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-xs" placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tax Mode</Label>
              <Select value={taxMode} onValueChange={(v) => setTaxMode(v as InvoiceTaxType)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inclusive">Inclusive</SelectItem>
                  <SelectItem value="exclusive">Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tax Rate (%)</Label>
              <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="col-span-2 flex items-end">
              <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending} className="w-full">
                <Plus className="h-3 w-3 mr-1" /> Add Sharing
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
