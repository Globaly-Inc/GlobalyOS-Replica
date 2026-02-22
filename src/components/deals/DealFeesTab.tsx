import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, DollarSign, Calendar } from 'lucide-react';
import { useDealFees, useAddDealFee, useAddDealFeeInstalment } from '@/services/useCRMDeals';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  dealId: string;
}

const FEE_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  invoiced: { label: 'Invoiced', variant: 'outline' },
  paid: { label: 'Paid', variant: 'default' },
  waived: { label: 'Waived', variant: 'secondary' },
};

export function DealFeesTab({ dealId }: Props) {
  const { data: fees, isLoading } = useDealFees(dealId);
  const addFee = useAddDealFee();
  const addInstalment = useAddDealFeeInstalment();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ fee_name: '', amount: '', currency: 'USD' });
  const [openFees, setOpenFees] = useState<Set<string>>(new Set());

  // Instalment dialog
  const [showInstalment, setShowInstalment] = useState(false);
  const [instalmentFeeId, setInstalmentFeeId] = useState('');
  const [instalmentForm, setInstalmentForm] = useState({ amount: '', due_date: '' });

  const handleAddFee = async () => {
    if (!form.fee_name.trim() || !form.amount) return;
    await addFee.mutateAsync({
      deal_id: dealId,
      fee_name: form.fee_name,
      amount: parseFloat(form.amount),
      currency: form.currency,
    });
    setShowAdd(false);
    setForm({ fee_name: '', amount: '', currency: 'USD' });
  };

  const handleAddInstalment = async () => {
    if (!instalmentForm.amount || !instalmentForm.due_date) return;
    await addInstalment.mutateAsync({
      deal_fee_id: instalmentFeeId,
      amount: parseFloat(instalmentForm.amount),
      due_date: instalmentForm.due_date,
    });
    setShowInstalment(false);
    setInstalmentForm({ amount: '', due_date: '' });
  };

  const toggleFee = (id: string) => {
    setOpenFees(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalFees = fees?.reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0) || 0;

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Total: {fees?.[0]?.currency || 'USD'} {totalFees.toLocaleString()}</span>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Fee
        </Button>
      </div>

      {!fees?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">No fees added yet</p>
      ) : (
        <div className="space-y-2">
          {fees.map((fee: any) => {
            const cfg = FEE_STATUS[fee.status] || FEE_STATUS.pending;
            return (
              <Card key={fee.id} className="overflow-hidden">
                <Collapsible open={openFees.has(fee.id)} onOpenChange={() => toggleFee(fee.id)}>
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{fee.fee_name}</p>
                      <p className="text-xs text-muted-foreground">{fee.currency} {Number(fee.amount).toLocaleString()}</p>
                    </div>
                    <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
                    <Badge variant="outline" className="text-[10px]">{fee.instalments?.length || 0} instalment(s)</Badge>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ChevronDown className={`h-4 w-4 transition-transform ${openFees.has(fee.id) ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="border-t px-3 py-2 bg-muted/30 space-y-2">
                      {fee.instalments?.length ? (
                        fee.instalments
                          .sort((a: any, b: any) => a.instalment_number - b.instalment_number)
                          .map((inst: any) => (
                            <div key={inst.id} className="flex items-center gap-3 p-2 rounded bg-card border text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>#{inst.instalment_number}</span>
                              <span className="font-medium">{fee.currency} {Number(inst.amount).toLocaleString()}</span>
                              <span className="text-muted-foreground text-xs">Due: {format(new Date(inst.due_date), 'dd MMM yyyy')}</span>
                              <Badge variant={inst.status === 'paid' ? 'default' : inst.status === 'overdue' ? 'destructive' : 'secondary'} className="ml-auto text-[10px]">
                                {inst.status}
                              </Badge>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">No instalments</p>
                      )}
                      <Button variant="outline" size="sm" className="w-full gap-1 text-xs" onClick={() => { setInstalmentFeeId(fee.id); setShowInstalment(true); }}>
                        <Plus className="h-3 w-3" /> Add Instalment
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Fee Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fee</DialogTitle>
            <DialogDescription>Add a fee to this deal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fee Name</Label>
              <Input value={form.fee_name} onChange={e => setForm({ ...form, fee_name: e.target.value })} placeholder="e.g. Processing Fee" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddFee} disabled={!form.fee_name.trim() || !form.amount || addFee.isPending}>Add Fee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Instalment Dialog */}
      <Dialog open={showInstalment} onOpenChange={setShowInstalment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Instalment</DialogTitle>
            <DialogDescription>Schedule a payment instalment</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount</Label>
              <Input type="number" value={instalmentForm.amount} onChange={e => setInstalmentForm({ ...instalmentForm, amount: e.target.value })} placeholder="0.00" />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={instalmentForm.due_date} onChange={e => setInstalmentForm({ ...instalmentForm, due_date: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstalment(false)}>Cancel</Button>
            <Button onClick={handleAddInstalment} disabled={!instalmentForm.amount || !instalmentForm.due_date || addInstalment.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
