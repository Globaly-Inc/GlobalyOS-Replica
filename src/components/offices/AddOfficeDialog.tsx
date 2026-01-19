import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/address-autocomplete';
import type { Office } from '@/pages/ManageOffices';

interface AddOfficeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOfficeCreated: (office: Office) => void;
}

export const AddOfficeDialog = ({ open, onOpenChange, onOfficeCreated }: AddOfficeDialogProps) => {
  const { currentOrg } = useOrganization();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    addressComponents: null as AddressComponents | null,
  });

  const handleAddressChange = (address: string, components?: AddressComponents) => {
    setFormData(prev => ({
      ...prev,
      address,
      addressComponents: components || null,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg?.id || !formData.name.trim()) return;

    const city = formData.addressComponents?.locality || '';
    const country = formData.addressComponents?.country_code || '';

    setSaving(true);
    const { data, error } = await supabase
      .from('offices')
      .insert({
        organization_id: currentOrg.id,
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        city: city || null,
        country: country || null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error('Failed to create office');
      console.error('Error creating office:', error);
      return;
    }

    toast.success('Office created successfully');
    onOfficeCreated({ ...data, employee_count: 0 } as Office);
    setFormData({ name: '', address: '', addressComponents: null });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Office</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Office Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Headquarters, Sydney Office"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <AddressAutocomplete
              value={formData.address}
              onChange={handleAddressChange}
              placeholder="Start typing the office address..."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.name.trim()}>
              {saving ? 'Creating...' : 'Create Office'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
