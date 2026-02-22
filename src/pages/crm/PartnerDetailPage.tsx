import { useParams } from 'react-router-dom';
import { ArrowLeft, Handshake, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageBody } from '@/components/ui/page-body';
import { useCRMPartner, useUpdateCRMPartner } from '@/services/useCRMServices';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const PartnerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { data: partner, isLoading } = useCRMPartner(id || null);
  const updateMutation = useUpdateCRMPartner();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '', trading_name: '', email: '', phone: '', website: '',
    type: 'agent' as 'agent' | 'provider' | 'both',
    contract_status: 'active' as 'active' | 'inactive',
    primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '',
    address_street: '', address_city: '', address_state: '', address_postcode: '', address_country: '',
    notes: '',
  });

  useEffect(() => {
    if (partner) {
      setForm({
        name: partner.name || '',
        trading_name: partner.trading_name || '',
        email: partner.email || '',
        phone: partner.phone || '',
        website: partner.website || '',
        type: partner.type,
        contract_status: partner.contract_status,
        primary_contact_name: partner.primary_contact_name || '',
        primary_contact_email: partner.primary_contact_email || '',
        primary_contact_phone: partner.primary_contact_phone || '',
        address_street: partner.address_street || '',
        address_city: partner.address_city || '',
        address_state: partner.address_state || '',
        address_postcode: partner.address_postcode || '',
        address_country: partner.address_country || '',
        notes: partner.notes || '',
      });
    }
  }, [partner]);

  const handleSave = () => {
    if (!id) return;
    updateMutation.mutate(
      {
        id,
        name: form.name,
        trading_name: form.trading_name || null,
        email: form.email || null,
        phone: form.phone || null,
        website: form.website || null,
        type: form.type,
        contract_status: form.contract_status,
        primary_contact_name: form.primary_contact_name || null,
        primary_contact_email: form.primary_contact_email || null,
        primary_contact_phone: form.primary_contact_phone || null,
        address_street: form.address_street || null,
        address_city: form.address_city || null,
        address_state: form.address_state || null,
        address_postcode: form.address_postcode || null,
        address_country: form.address_country || null,
        notes: form.notes || null,
      },
      {
        onSuccess: () => { toast.success('Partner updated'); setEditing(false); },
        onError: (err: any) => toast.error(err.message || 'Failed to update'),
      }
    );
  };

  if (isLoading) return <PageBody><div className="pt-8 text-center text-muted-foreground">Loading...</div></PageBody>;
  if (!partner) return <PageBody><div className="pt-8 text-center text-muted-foreground">Partner not found</div></PageBody>;

  return (
    <PageBody>
      <div className="space-y-6 pt-4 md:pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateOrg('/crm/partners')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Handshake className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{partner.name}</h1>
              <Badge variant={partner.contract_status === 'active' ? 'default' : 'secondary'} className="capitalize">{partner.contract_status}</Badge>
              <Badge variant="outline" className="capitalize">{partner.type}</Badge>
            </div>
            {partner.trading_name && <p className="text-muted-foreground mt-1">{partner.trading_name}</p>}
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}><Save className="h-4 w-4 mr-1" />Save</Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Edit className="h-4 w-4 mr-1" />Edit</Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="users">Agent Users</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle>Partner Details</CardTitle></CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Trading Name</Label><Input value={form.trading_name} onChange={e => setForm(f => ({ ...f, trading_name: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="provider">Provider</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Contract Status</Label>
                        <Select value={form.contract_status} onValueChange={(v: any) => setForm(f => ({ ...f, contract_status: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2"><Label>Primary Contact Name</Label><Input value={form.primary_contact_name} onChange={e => setForm(f => ({ ...f, primary_contact_name: e.target.value }))} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Primary Contact Email</Label><Input value={form.primary_contact_email} onChange={e => setForm(f => ({ ...f, primary_contact_email: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>Primary Contact Phone</Label><Input value={form.primary_contact_phone} onChange={e => setForm(f => ({ ...f, primary_contact_phone: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{partner.email || '—'}</p></div>
                      <div><span className="text-sm text-muted-foreground">Phone</span><p className="font-medium">{partner.phone || '—'}</p></div>
                      <div><span className="text-sm text-muted-foreground">Website</span><p className="font-medium">{partner.website || '—'}</p></div>
                    </div>
                    <div className="space-y-3">
                      <div><span className="text-sm text-muted-foreground">Primary Contact</span><p className="font-medium">{partner.primary_contact_name || '—'}</p></div>
                      <div><span className="text-sm text-muted-foreground">Contact Email</span><p className="font-medium">{partner.primary_contact_email || '—'}</p></div>
                      <div><span className="text-sm text-muted-foreground">Notes</span><p className="text-sm">{partner.notes || '—'}</p></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branches">
            <Card><CardHeader><CardTitle>Branches</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm">Branch management coming in the next phase.</p></CardContent></Card>
          </TabsContent>
          <TabsContent value="products">
            <Card><CardHeader><CardTitle>Associated Products</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm">Products associated with this partner will be shown here.</p></CardContent></Card>
          </TabsContent>
          <TabsContent value="users">
            <Card><CardHeader><CardTitle>Agent Users</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm">Agent portal users for this partner will be managed here.</p></CardContent></Card>
          </TabsContent>
          <TabsContent value="promotions">
            <Card><CardHeader><CardTitle>Promotions</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm">Promotions management coming in the next phase.</p></CardContent></Card>
          </TabsContent>
          <TabsContent value="customers">
            <Card><CardHeader><CardTitle>Customers</CardTitle></CardHeader><CardContent><p className="text-muted-foreground text-sm">Agent-managed customers will be listed here.</p></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageBody>
  );
};

export default PartnerDetailPage;
