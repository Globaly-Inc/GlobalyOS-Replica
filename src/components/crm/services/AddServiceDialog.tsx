import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCRMService } from '@/services/useCRMServices';
import { ServiceCategorySelect } from '@/components/crm/services/ServiceCategorySelect';
import { toast } from 'sonner';

interface AddServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddServiceDialog = ({ open, onOpenChange }: AddServiceDialogProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [serviceType, setServiceType] = useState('direct');
  const [visibility, setVisibility] = useState('internal');
  const createMutation = useCreateCRMService();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Service name is required');
      return;
    }
    createMutation.mutate(
      {
        name: name.trim(),
        category: category.trim() || undefined,
        short_description: shortDesc.trim() || undefined,
        service_type: serviceType,
        visibility,
        status: 'draft',
      },
      {
        onSuccess: () => {
          toast.success('Service created');
          onOpenChange(false);
          resetForm();
        },
        onError: (err: any) => toast.error(err.message || 'Failed to create service'),
      }
    );
  };

  const resetForm = () => {
    setName('');
    setCategory('');
    setShortDesc('');
    setServiceType('direct');
    setVisibility('internal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Name *</Label>
            <Input id="svc-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Student Visa Processing" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <ServiceCategorySelect value={category} onValueChange={setCategory} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-desc">Short Description</Label>
            <Textarea id="svc-desc" value={shortDesc} onChange={e => setShortDesc(e.target.value)} placeholder="Brief description of this service" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="represented_provider">Represented Provider</SelectItem>
                  <SelectItem value="internal_only">Internal Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="client_portal">Client Portal</SelectItem>
                  <SelectItem value="agent_portal">Agent Portal</SelectItem>
                  <SelectItem value="both_portals">Both Portals</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
