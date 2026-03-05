import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateCRMContact, useCRMCompanies } from '@/services/useCRM';
import { toast } from 'sonner';
import type { CRMContact } from '@/types/crm';

interface Props {
  contact: CRMContact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditContactDialog = ({ contact, open, onOpenChange }: Props) => {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    company_id: '',
    rating: '',
    source: '',
    notes: '',
  });

  const updateMutation = useUpdateCRMContact();
  const { data: companiesData } = useCRMCompanies({ per_page: 100 });
  const companies = companiesData?.data || [];

  useEffect(() => {
    if (contact) {
      setForm({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        job_title: contact.job_title || '',
        company_id: contact.company_id || '',
        rating: contact.rating || '',
        source: contact.source || '',
        notes: contact.notes || '',
      });
    }
  }, [contact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact) return;
    if (!form.first_name.trim()) {
      toast.error('First name is required');
      return;
    }
    updateMutation.mutate(
      {
        id: contact.id,
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        job_title: form.job_title || null,
        company_id: form.company_id || null,
        rating: (form.rating || null) as any,
        source: form.source || null,
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          toast.success('Contact updated');
          onOpenChange(false);
        },
        onError: () => toast.error('Failed to update contact'),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input value={form.first_name} onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Last Name</Label>
            <Input value={form.last_name} onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <Input value={form.job_title} onChange={(e) => setForm(f => ({ ...f, job_title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Company</Label>
            <Select value={form.company_id} onValueChange={(v) => setForm(f => ({ ...f, company_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Input placeholder="e.g. web-form, referral" value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
