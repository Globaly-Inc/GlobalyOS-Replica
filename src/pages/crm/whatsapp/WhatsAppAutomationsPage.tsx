import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useWaAutomations, useCreateWaAutomation, useUpdateWaAutomation, useDeleteWaAutomation } from '@/hooks/useWhatsAppAutomations';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Plus, MoreVertical, Trash2, Workflow, Zap, MessageCircle, Tag, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import AutomationEditorDialog from '@/components/whatsapp/AutomationEditorDialog';

const triggerIcons: Record<string, React.ReactNode> = {
  message_received: <MessageCircle className="h-4 w-4" />,
  keyword: <Tag className="h-4 w-4" />,
  new_contact: <UserPlus className="h-4 w-4" />,
  tag_added: <Tag className="h-4 w-4" />,
  flow_submitted: <Workflow className="h-4 w-4" />,
};

const triggerLabels: Record<string, string> = {
  message_received: 'Message Received',
  keyword: 'Keyword Match',
  new_contact: 'New Contact',
  tag_added: 'Tag Added',
  flow_submitted: 'Flow Submitted',
};

const starterTemplates = [
  { name: 'Welcome Message', description: 'Auto-reply when a new contact messages you', trigger: 'new_contact' },
  { name: 'Out of Hours', description: 'Reply outside business hours with availability info', trigger: 'message_received' },
  { name: 'FAQ Keyword', description: 'Auto-answer common questions based on keywords', trigger: 'keyword' },
  { name: 'Follow-up', description: 'Send a follow-up message after a delay', trigger: 'message_received' },
  { name: 'Lead Qualification', description: 'Tag and assign leads based on keywords', trigger: 'keyword' },
];

const WhatsAppAutomationsPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const { data: automations = [], isLoading } = useWaAutomations(orgId);
  const createMutation = useCreateWaAutomation();
  const updateMutation = useUpdateWaAutomation();
  const deleteMutation = useDeleteWaAutomation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCreate = (data: {
    name: string;
    description: string;
    trigger_type: string;
    trigger_config: Record<string, unknown>;
    nodes: unknown[];
    edges: unknown[];
  }) => {
    if (!orgId) return;
    createMutation.mutate(
      { organization_id: orgId, ...data },
      {
        onSuccess: () => { toast.success('Automation created'); setDialogOpen(false); },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleToggle = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    updateMutation.mutate(
      { id, status: newStatus },
      {
        onSuccess: () => toast.success(`Automation ${newStatus}`),
        onError: (e) => toast.error(e.message),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Automation deleted'),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleUseStarter = (starter: typeof starterTemplates[number]) => {
    if (!orgId) return;
    createMutation.mutate(
      {
        organization_id: orgId,
        name: starter.name,
        description: starter.description,
        trigger_type: starter.trigger,
        trigger_config: {},
        nodes: [],
        edges: [],
      },
      {
        onSuccess: () => toast.success(`"${starter.name}" automation created as draft`),
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
            <h1 className="text-2xl font-bold text-foreground">Automations</h1>
            <p className="text-sm text-muted-foreground mt-1">Automate WhatsApp workflows with triggers and actions</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Automation
          </Button>
        </div>

        {/* Starter Templates */}
        {automations.length === 0 && !isLoading && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Start Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {starterTemplates.map((s) => (
                <Card key={s.name} className="p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleUseStarter(s)}>
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{s.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                      <Badge variant="outline" className="text-xs mt-2">{triggerLabels[s.trigger]}</Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Automations List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : automations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Workflow className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No automations yet</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Use a starter template above or create a custom automation.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {automations.map((a) => {
              const nodeCount = Array.isArray(a.nodes) ? a.nodes.length : 0;
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="rounded-full bg-primary/10 p-2">
                        {triggerIcons[a.trigger_type] || <Zap className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm text-foreground">{a.name}</h3>
                          <Badge variant={a.status === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">
                            {a.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{triggerLabels[a.trigger_type] || a.trigger_type}</span>
                          <span>{nodeCount} {nodeCount === 1 ? 'step' : 'steps'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={a.status === 'active'}
                        onCheckedChange={() => handleToggle(a.id, a.status)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(a.id)}>
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

        <AutomationEditorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleCreate}
          isSaving={createMutation.isPending}
        />
      </PageBody>
    </>
  );
};

export default WhatsAppAutomationsPage;
