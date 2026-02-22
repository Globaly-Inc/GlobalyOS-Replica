import { useParams } from 'react-router-dom';
import { ArrowLeft, Package, Edit, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageBody } from '@/components/ui/page-body';
import { useCRMService, useUpdateCRMService } from '@/services/useCRMServices';
import { ServiceCategorySelect } from '@/components/crm/services/ServiceCategorySelect';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { data: service, isLoading } = useCRMService(id || null);
  const updateMutation = useUpdateCRMService();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    category: '',
    short_description: '',
    long_description: '',
    service_type: 'direct',
    visibility: 'internal',
    status: 'draft',
    eligibility_notes: '',
    sla_target_days: '',
  });

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || '',
        category: service.category || '',
        short_description: service.short_description || '',
        long_description: service.long_description || '',
        service_type: service.service_type,
        visibility: service.visibility,
        status: service.status,
        eligibility_notes: service.eligibility_notes || '',
        sla_target_days: service.sla_target_days?.toString() || '',
      });
    }
  }, [service]);

  const handleSave = () => {
    if (!id) return;
    updateMutation.mutate(
      {
        id,
        name: form.name,
        category: form.category || null,
        short_description: form.short_description || null,
        long_description: form.long_description || null,
        service_type: form.service_type,
        visibility: form.visibility,
        status: form.status,
        eligibility_notes: form.eligibility_notes || null,
        sla_target_days: form.sla_target_days ? parseInt(form.sla_target_days) : null,
      },
      {
        onSuccess: () => { toast.success('Service updated'); setEditing(false); },
        onError: (err: any) => toast.error(err.message || 'Failed to update'),
      }
    );
  };

  if (isLoading) {
    return <PageBody><div className="pt-8 text-center text-muted-foreground">Loading...</div></PageBody>;
  }

  if (!service) {
    return <PageBody><div className="pt-8 text-center text-muted-foreground">Service not found</div></PageBody>;
  }

  return (
    <PageBody>
      <div className="space-y-6 pt-4 md:pt-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigateOrg('/crm/products')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{service.name}</h1>
              <Badge variant={service.status === 'published' ? 'default' : 'outline'} className="capitalize">{service.status}</Badge>
            </div>
            {service.short_description && <p className="text-muted-foreground mt-1">{service.short_description}</p>}
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

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fees">Fees</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader><CardTitle>Service Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {editing ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <ServiceCategorySelect value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Short Description</Label>
                      <Textarea value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>Long Description</Label>
                      <Textarea value={form.long_description} onChange={e => setForm(f => ({ ...f, long_description: e.target.value }))} rows={4} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Service Type</Label>
                        <Select value={form.service_type} onValueChange={v => setForm(f => ({ ...f, service_type: v }))}>
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
                        <Select value={form.visibility} onValueChange={v => setForm(f => ({ ...f, visibility: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="client_portal">Client Portal</SelectItem>
                            <SelectItem value="agent_portal">Agent Portal</SelectItem>
                            <SelectItem value="both_portals">Both Portals</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Eligibility Notes</Label>
                      <Textarea value={form.eligibility_notes} onChange={e => setForm(f => ({ ...f, eligibility_notes: e.target.value }))} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>SLA Target (days)</Label>
                      <Input type="number" value={form.sla_target_days} onChange={e => setForm(f => ({ ...f, sla_target_days: e.target.value }))} className="w-32" />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div><span className="text-sm text-muted-foreground">Category</span><p className="font-medium">{service.category || '—'}</p></div>
                      <div><span className="text-sm text-muted-foreground">Service Type</span><p className="font-medium capitalize">{service.service_type.replace('_', ' ')}</p></div>
                      <div><span className="text-sm text-muted-foreground">Visibility</span><p className="font-medium capitalize">{service.visibility.replace('_', ' ')}</p></div>
                      <div><span className="text-sm text-muted-foreground">SLA Target</span><p className="font-medium">{service.sla_target_days ? `${service.sla_target_days} days` : '—'}</p></div>
                    </div>
                    <div className="space-y-3">
                      <div><span className="text-sm text-muted-foreground">Long Description</span><p className="text-sm">{service.long_description || '—'}</p></div>
                      <div><span className="text-sm text-muted-foreground">Eligibility Notes</span><p className="text-sm">{service.eligibility_notes || '—'}</p></div>
                      {service.tags && service.tags.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Tags</span>
                          <div className="flex flex-wrap gap-1 mt-1">{service.tags.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fees">
            <Card>
              <CardHeader><CardTitle>Product Fees</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Fee management will be available in the next phase.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promotions">
            <Card>
              <CardHeader><CardTitle>Promotions</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Promotions from associated partners will be shown here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader><CardTitle>Activity Log</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">Activity tracking will be available in the next phase.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageBody>
  );
};

export default ProductDetailPage;
