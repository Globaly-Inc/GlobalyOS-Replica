import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateCRMCompany } from '@/services/useCRM';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCompanyDialog = ({ open, onOpenChange }: Props) => {
  const [form, setForm] = useState({
    name: '',
    industry: '',
    website: '',
    phone: '',
    email: '',
    rating: '',
    source: '',
    notes: '',
  });

  const createMutation = useCreateCRMCompany();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    createMutation.mutate(
      {
        name: form.name,
        industry: form.industry || null,
        website: form.website || null,
        phone: form.phone || null,
        email: form.email || null,
        rating: (form.rating || null) as any,
        source: form.source || null,
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          toast.success('Company created');
          onOpenChange(false);
          setForm({ name: '', industry: '', website: '', phone: '', email: '', rating: '', source: '', notes: '' });
        },
        onError: () => toast.error('Failed to create company'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5 col-span-2">
            <Label>Company Name *</Label>
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Input value={form.industry} onChange={(e) => setForm(f => ({ ...f, industry: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Rating</Label>
            <Select value={form.rating} onValueChange={(v) => setForm(f => ({ ...f, rating: v }))}>
              <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hot">🔥 Hot</SelectItem>
                <SelectItem value="warm">🤝 Warm</SelectItem>
                <SelectItem value="cold">❄️ Cold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Input placeholder="e.g. referral, event" value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Add Company'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
