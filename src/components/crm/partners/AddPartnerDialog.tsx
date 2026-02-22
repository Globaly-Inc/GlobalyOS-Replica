import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCRMPartner } from '@/services/useCRMServices';
import { toast } from 'sonner';

interface AddPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddPartnerDialog = ({ open, onOpenChange }: AddPartnerDialogProps) => {
  const [name, setName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<'agent' | 'provider' | 'both'>('agent');
  const [notes, setNotes] = useState('');
  const createMutation = useCreateCRMPartner();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Partner name is required');
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        trading_name: tradingName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        type,
        notes: notes.trim() || null,
        contract_status: 'active',
      },
      {
        onSuccess: () => {
          toast.success('Partner created');
          onOpenChange(false);
          setName(''); setTradingName(''); setEmail(''); setPhone(''); setType('agent'); setNotes('');
        },
        onError: (err: any) => toast.error(err.message || 'Failed to create partner'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Partner</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Partner company name" />
          </div>
          <div className="space-y-2">
            <Label>Trading Name</Label>
            <Input value={tradingName} onChange={e => setTradingName(e.target.value)} placeholder="Optional trading name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Partner Type</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="provider">Provider</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Partner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
