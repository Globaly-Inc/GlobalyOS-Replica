import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { PageBody } from '@/components/ui/page-body';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Edit, Trash2, GitBranch, ArrowRight } from 'lucide-react';
import { useCRMPipelines, useCreatePipeline, useUpdatePipeline, useDeletePipeline } from '@/services/useCRMPipelines';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import type { CRMPipeline } from '@/types/crm-pipeline';

const SettingsPipelines = () => {
  const { data: pipelines, isLoading } = useCRMPipelines();
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();
  const { navigateOrg } = useOrgNavigation();

  const [showCreate, setShowCreate] = useState(false);
  const [editPipeline, setEditPipeline] = useState<CRMPipeline | null>(null);
  const [form, setForm] = useState({ name: '', description: '', service_required: true });

  const openCreate = () => {
    setForm({ name: '', description: '', service_required: true });
    setEditPipeline(null);
    setShowCreate(true);
  };

  const openEdit = (p: CRMPipeline) => {
    setForm({ name: p.name, description: p.description || '', service_required: p.service_required });
    setEditPipeline(p);
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editPipeline) {
      await updatePipeline.mutateAsync({ id: editPipeline.id, name: form.name, description: form.description || null, service_required: form.service_required });
    } else {
      await createPipeline.mutateAsync(form);
    }
    setShowCreate(false);
  };

  return (
    <PageBody>
      <PageHeader title="Pipelines" subtitle="Configure deal pipelines, stages, and requirements">
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Pipeline
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
        </div>
      ) : !pipelines?.length ? (
        <Card className="p-12 text-center">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No pipelines yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-4">Create your first pipeline to start managing deals and applications.</p>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Create Pipeline
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pipelines.map(p => (
            <Card key={p.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigateOrg(`/settings/pipelines/${p.id}`)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                    {p.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-3">
                    <Badge variant={p.service_required ? 'default' : 'outline'} className="text-xs">
                      {p.service_required ? 'Service Pipeline' : 'Opportunity Pipeline'}
                    </Badge>
                    {!p.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigateOrg(`/settings/pipelines/${p.id}`); }}>
                      <ArrowRight className="h-4 w-4 mr-2" /> Configure Stages
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); deletePipeline.mutate(p.id); }}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPipeline ? 'Edit Pipeline' : 'Create Pipeline'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Visa Application Pipeline" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe this pipeline..." rows={3} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Service Required</Label>
                <p className="text-xs text-muted-foreground">When disabled, this becomes an opportunity/lead pipeline</p>
              </div>
              <Switch checked={form.service_required} onCheckedChange={v => setForm({ ...form, service_required: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || createPipeline.isPending || updatePipeline.isPending}>
              {editPipeline ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageBody>
  );
};

export default SettingsPipelines;
