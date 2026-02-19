import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useWaFlows, useCreateWaFlow, useUpdateWaFlow, useDeleteWaFlow, useWaFlowSubmissions } from '@/hooks/useWhatsAppFlows';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MoreVertical, Trash2, FileText, Eye, Pencil, ClipboardList, Archive, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import FlowBuilderDialog from '@/components/whatsapp/FlowBuilderDialog';
import type { WaFlow, WaFlowScreen, WaFlowFieldMapping } from '@/types/whatsapp';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'secondary',
  active: 'default',
  archived: 'outline',
};

const flowTemplates = [
  { name: 'Lead Qualification', description: 'Capture name, email, company & budget to qualify leads', screens: [{ id: 'lq1', title: 'Tell us about you', fields: [{ id: 'f1', type: 'text' as const, label: 'Full Name', required: true }, { id: 'f2', type: 'email' as const, label: 'Email', required: true }, { id: 'f3', type: 'text' as const, label: 'Company', required: false }, { id: 'f4', type: 'select' as const, label: 'Budget Range', required: true, options: ['< $1k', '$1k - $10k', '$10k - $50k', '$50k+'] }] }] },
  { name: 'Appointment Request', description: 'Collect preferred date, time, and reason for booking', screens: [{ id: 'ar1', title: 'Book Appointment', fields: [{ id: 'f1', type: 'text' as const, label: 'Full Name', required: true }, { id: 'f2', type: 'phone' as const, label: 'Phone', required: true }, { id: 'f3', type: 'date' as const, label: 'Preferred Date', required: true }, { id: 'f4', type: 'textarea' as const, label: 'Reason', required: false }] }] },
  { name: 'Support Triage', description: 'Categorize support issues before routing to an agent', screens: [{ id: 'st1', title: 'Support Request', fields: [{ id: 'f1', type: 'select' as const, label: 'Issue Type', required: true, options: ['Billing', 'Technical', 'Account', 'Other'] }, { id: 'f2', type: 'textarea' as const, label: 'Describe the issue', required: true }, { id: 'f3', type: 'select' as const, label: 'Urgency', required: true, options: ['Low', 'Medium', 'High'] }] }] },
  { name: 'Quote Request', description: 'Gather product/service details to generate a quote', screens: [{ id: 'qr1', title: 'Request a Quote', fields: [{ id: 'f1', type: 'text' as const, label: 'Company Name', required: true }, { id: 'f2', type: 'email' as const, label: 'Email', required: true }, { id: 'f3', type: 'select' as const, label: 'Service', required: true, options: ['Consulting', 'Development', 'Support', 'Training'] }, { id: 'f4', type: 'number' as const, label: 'Estimated Users', required: false }] }] },
];

const WhatsAppFlowsPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const { data: flows = [], isLoading } = useWaFlows(orgId);
  const createMutation = useCreateWaFlow();
  const updateMutation = useUpdateWaFlow();
  const deleteMutation = useDeleteWaFlow();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingFlow, setEditingFlow] = useState<WaFlow | null>(null);
  const [viewingFlowId, setViewingFlowId] = useState<string | null>(null);

  const handleCreate = (data: { name: string; description: string; screens: WaFlowScreen[]; field_mapping: WaFlowFieldMapping[] }) => {
    if (!orgId) return;
    createMutation.mutate(
      { organization_id: orgId, ...data },
      {
        onSuccess: () => { toast.success('Flow created'); setBuilderOpen(false); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleUpdate = (data: { name: string; description: string; screens: WaFlowScreen[]; field_mapping: WaFlowFieldMapping[] }) => {
    if (!editingFlow) return;
    updateMutation.mutate(
      { id: editingFlow.id, ...data },
      {
        onSuccess: () => { toast.success('Flow updated'); setEditingFlow(null); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleToggleStatus = (flow: WaFlow) => {
    const newStatus = flow.status === 'active' ? 'draft' : 'active';
    updateMutation.mutate(
      { id: flow.id, status: newStatus },
      {
        onSuccess: () => toast.success(`Flow ${newStatus === 'active' ? 'activated' : 'deactivated'}`),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleArchive = (id: string) => {
    updateMutation.mutate(
      { id, status: 'archived' },
      {
        onSuccess: () => toast.success('Flow archived'),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Flow deleted'),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleUseTemplate = (tpl: typeof flowTemplates[number]) => {
    if (!orgId) return;
    createMutation.mutate(
      { organization_id: orgId, name: tpl.name, description: tpl.description, screens: tpl.screens as any, field_mapping: [] },
      {
        onSuccess: () => toast.success(`"${tpl.name}" flow created`),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Flows</h1>
            <p className="text-sm text-muted-foreground mt-1">Interactive forms for lead capture, qualification, booking & more</p>
          </div>
          <Button size="sm" onClick={() => setBuilderOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create Flow
          </Button>
        </div>

        {/* Templates */}
        {flows.length === 0 && !isLoading && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Start Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {flowTemplates.map((t) => (
                <Card key={t.name} className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleUseTemplate(t)}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <ClipboardList className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{t.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No flows yet</h2>
            <p className="text-muted-foreground mt-2 max-w-md">Use a template above or create a custom flow to start capturing data.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {flows.map((flow) => {
              const totalFields = flow.screens?.reduce((sum, s) => sum + (s.fields?.length ?? 0), 0) ?? 0;
              return (
                <Card key={flow.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="rounded-full bg-primary/10 p-2">
                        <ClipboardList className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-foreground">{flow.name}</h3>
                          <Badge variant={statusColors[flow.status] as any} className="text-xs capitalize">{flow.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{flow.screens?.length ?? 0} {(flow.screens?.length ?? 0) === 1 ? 'screen' : 'screens'}</span>
                          <span>{totalFields} {totalFields === 1 ? 'field' : 'fields'}</span>
                          <span>{flow.submission_count} submissions</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {flow.status !== 'archived' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleToggleStatus(flow)}
                        >
                          {flow.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => setViewingFlowId(flow.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingFlow(flow)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {flow.status !== 'archived' && (
                            <DropdownMenuItem onClick={() => handleArchive(flow.id)}>
                              <Archive className="h-4 w-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(flow.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create dialog */}
        <FlowBuilderDialog
          open={builderOpen}
          onOpenChange={setBuilderOpen}
          onSave={handleCreate}
          isSaving={createMutation.isPending}
        />

        {/* Edit dialog */}
        {editingFlow && (
          <FlowBuilderDialog
            open={!!editingFlow}
            onOpenChange={(open) => !open && setEditingFlow(null)}
            onSave={handleUpdate}
            isSaving={updateMutation.isPending}
            initial={{
              name: editingFlow.name,
              description: editingFlow.description,
              screens: editingFlow.screens ?? [],
              field_mapping: editingFlow.field_mapping ?? [],
            }}
          />
        )}

        {/* Submissions viewer */}
        {viewingFlowId && (
          <SubmissionsDialog flowId={viewingFlowId} onClose={() => setViewingFlowId(null)} />
        )}
      </PageBody>
    </>
  );
};

function SubmissionsDialog({ flowId, onClose }: { flowId: string; onClose: () => void }) {
  const { data: submissions = [], isLoading } = useWaFlowSubmissions(flowId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submissions</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <Card key={sub.id} className="p-3">
                <div className="text-xs text-muted-foreground mb-1">{format(new Date(sub.created_at), 'PPp')}</div>
                <div className="text-sm space-y-0.5">
                  {Object.entries(sub.data).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium text-foreground">{key}:</span>
                      <span className="text-muted-foreground">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WhatsAppFlowsPage;
