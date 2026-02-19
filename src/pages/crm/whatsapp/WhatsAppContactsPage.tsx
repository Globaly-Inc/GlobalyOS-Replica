import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useWaContacts, useUpdateWaContact, useCreateWaContact } from '@/hooks/useWhatsAppAutomations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Plus, Search, Users, Phone, CheckCircle, XCircle, Clock,
  MoreVertical, Tag, ShieldCheck, ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const optInColors: Record<string, { icon: React.ReactNode; cls: string }> = {
  opted_in: { icon: <CheckCircle className="h-3.5 w-3.5" />, cls: 'text-green-600 dark:text-green-400' },
  opted_out: { icon: <XCircle className="h-3.5 w-3.5" />, cls: 'text-destructive' },
  pending: { icon: <Clock className="h-3.5 w-3.5" />, cls: 'text-amber-600 dark:text-amber-400' },
};

const WhatsAppContactsPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const { data: contacts = [], isLoading } = useWaContacts(orgId);
  const updateMutation = useUpdateWaContact();
  const createMutation = useCreateWaContact();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newOptIn, setNewOptIn] = useState('pending');

  const filtered = contacts.filter((c) => {
    const matchesSearch = !search || (c.name || '').toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || c.opt_in_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAdd = () => {
    if (!orgId || !newPhone.trim()) return;
    createMutation.mutate(
      { organization_id: orgId, phone: newPhone.trim(), name: newName.trim() || undefined, opt_in_status: newOptIn },
      {
        onSuccess: () => {
          toast.success('Contact added');
          setAddDialogOpen(false);
          setNewPhone('');
          setNewName('');
          setNewOptIn('pending');
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleOptToggle = (id: string, current: string) => {
    const next = current === 'opted_in' ? 'opted_out' : 'opted_in';
    updateMutation.mutate(
      { id, opt_in_status: next },
      {
        onSuccess: () => toast.success(`Contact ${next === 'opted_in' ? 'opted in' : 'opted out'}`),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const statusFilters = ['all', 'opted_in', 'opted_out', 'pending'];

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">WhatsApp Contacts</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage contacts, consent, and opt-in preferences</p>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5">
            {statusFilters.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full capitalize transition-colors',
                  statusFilter === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Contact List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No contacts found</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Add contacts or they will appear here when they message you.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            {filtered.map((c) => {
              const opt = optInColors[c.opt_in_status] || optInColors.pending;
              return (
                <Card key={c.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="rounded-full bg-muted p-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">{c.name || c.phone}</span>
                          <span className={cn('flex items-center gap-1 text-xs', opt.cls)}>
                            {opt.icon}
                            {c.opt_in_status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{c.phone}</span>
                          {c.tags && c.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {c.tags.join(', ')}
                            </span>
                          )}
                          {c.last_inbound_at && (
                            <span>Last msg: {format(new Date(c.last_inbound_at), 'MMM d')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {c.opt_in_status === 'opted_in' ? (
                          <DropdownMenuItem onClick={() => handleOptToggle(c.id, c.opt_in_status)}>
                            <ShieldOff className="h-4 w-4 mr-2" /> Opt Out
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleOptToggle(c.id, c.opt_in_status)}>
                            <ShieldCheck className="h-4 w-4 mr-2" /> Opt In
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {contacts.length > 0 && (
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span>{contacts.length} total contacts</span>
            <span>{contacts.filter((c) => c.opt_in_status === 'opted_in').length} opted in</span>
            <span>{contacts.filter((c) => c.opt_in_status === 'opted_out').length} opted out</span>
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1234567890" className="mt-1" />
              </div>
              <div>
                <Label>Name (optional)</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" className="mt-1" />
              </div>
              <div>
                <Label>Consent Status</Label>
                <Select value={newOptIn} onValueChange={setNewOptIn}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opted_in">Opted In</SelectItem>
                    <SelectItem value="opted_out">Opted Out</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!newPhone.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Adding...' : 'Add Contact'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageBody>
    </>
  );
};

export default WhatsAppContactsPage;
