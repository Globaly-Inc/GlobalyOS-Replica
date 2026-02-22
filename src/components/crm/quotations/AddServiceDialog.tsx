/**
 * AddServiceDialog - Dialog for adding a service to a quotation option
 */
import { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

interface AddServiceDialogProps {
  services: Array<{ id: string; name: string }>;
  onAdd: (serviceId: string | null, serviceName: string, partnerId?: string | null, serviceDate?: string | null) => void;
}

export const AddServiceDialog = ({ services, onAdd }: AddServiceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [mode, setMode] = useState<'select' | 'custom'>('select');

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter(s => s.name.toLowerCase().includes(q));
  }, [services, search]);

  const handleSelect = (svc: { id: string; name: string }) => {
    onAdd(svc.id, svc.name, null, serviceDate || null);
    setOpen(false);
    setSearch('');
    setServiceDate('');
  };

  const handleCustom = () => {
    if (!customName.trim()) return;
    onAdd(null, customName.trim(), null, serviceDate || null);
    setOpen(false);
    setCustomName('');
    setServiceDate('');
    setMode('select');
  };

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) { setSearch(''); setMode('select'); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed w-full text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Service</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Service Date (optional)</Label>
            <Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} className="mt-1" />
          </div>

          {mode === 'select' ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.map(s => (
                  <button
                    key={s.id}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                    onClick={() => handleSelect(s)}
                  >
                    {s.name}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No services found</p>
                )}
              </div>

              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setMode('custom')}>
                <Plus className="h-3 w-3 mr-1" /> Create Custom Service
              </Button>
            </>
          ) : (
            <>
              <div>
                <Label>Custom Service Name</Label>
                <Input value={customName} onChange={e => setCustomName(e.target.value)} className="mt-1" placeholder="e.g. Consultation" />
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setMode('select')}>Back</Button>
                <Button size="sm" onClick={handleCustom} disabled={!customName.trim()}>Add</Button>
              </DialogFooter>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
