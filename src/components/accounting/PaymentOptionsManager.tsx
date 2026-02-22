/**
 * PaymentOptionsManager - CRUD for organization payment options (bank accounts, Stripe, etc.)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePaymentOptions,
  useCreatePaymentOption,
  useUpdatePaymentOption,
  useDeletePaymentOption,
} from '@/services/useAccountingInvoices';
import type { PaymentOptionType } from '@/types/accounting';

export const PaymentOptionsManager = () => {
  const { data: options = [], isLoading } = usePaymentOptions();
  const createMut = useCreatePaymentOption();
  const updateMut = useUpdatePaymentOption();
  const deleteMut = useDeletePaymentOption();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<PaymentOptionType>('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bsb, setBsb] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const resetForm = () => {
    setName(''); setType('bank_transfer'); setBankName(''); setAccountName('');
    setBsb(''); setAccountNumber(''); setIsDefault(false); setEditId(null);
  };

  const openNew = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (opt: any) => {
    setEditId(opt.id);
    setName(opt.name);
    setType(opt.type);
    setBankName(opt.bank_details?.bank_name || '');
    setAccountName(opt.bank_details?.account_name || '');
    setBsb(opt.bank_details?.bsb || '');
    setAccountNumber(opt.bank_details?.account_number || '');
    setIsDefault(opt.is_default);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name) { toast.error('Name is required'); return; }
    const bankDetails = type === 'bank_transfer' ? { bank_name: bankName, account_name: accountName, bsb, account_number: accountNumber } : null;
    try {
      if (editId) {
        await updateMut.mutateAsync({ id: editId, name, type, bank_details: bankDetails, is_default: isDefault });
        toast.success('Payment option updated');
      } else {
        await createMut.mutateAsync({ name, type, bank_details: bankDetails, is_default: isDefault, is_active: true });
        toast.success('Payment option created');
      }
      setDialogOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMut.mutateAsync(id);
      toast.success('Payment option deleted');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Payment Options
        </CardTitle>
        <Button size="sm" onClick={openNew}><Plus className="h-3 w-3 mr-1" /> Add</Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Default</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {options.map((opt) => (
              <TableRow key={opt.id}>
                <TableCell className="font-medium">{opt.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize text-xs">{opt.type.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {opt.bank_details?.bank_name && `${opt.bank_details.bank_name}`}
                  {opt.bank_details?.account_number && ` • ****${opt.bank_details.account_number.slice(-4)}`}
                </TableCell>
                <TableCell>{opt.is_default && <Badge variant="default" className="text-xs">Default</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(opt)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(opt.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {options.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No payment options configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit' : 'Add'} Payment Option</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nepal Investment Bank" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as PaymentOptionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === 'bank_transfer' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>BSB / Routing</Label>
                    <Input value={bsb} onChange={(e) => setBsb(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                  </div>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label>Set as default</Label>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {editId ? 'Update' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
