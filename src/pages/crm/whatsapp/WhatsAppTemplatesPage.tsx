import { useState } from 'react';
import { PageBody } from '@/components/ui/page-body';
import { WhatsAppSubNav } from '@/components/whatsapp/WhatsAppSubNav';
import { useOrganization } from '@/hooks/useOrganization';
import { useWaTemplates, useCreateWaTemplate, useUpdateWaTemplate, useDeleteWaTemplate, useSyncWaTemplates } from '@/hooks/useWhatsAppTemplates';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, RefreshCw, MoreVertical, Pencil, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import TemplateEditorDialog from '@/components/whatsapp/TemplateEditorDialog';
import type { WaTemplate } from '@/types/whatsapp';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const WhatsAppTemplatesPage = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const { data: templates = [], isLoading } = useWaTemplates(orgId);
  const createMutation = useCreateWaTemplate();
  const updateMutation = useUpdateWaTemplate();
  const deleteMutation = useDeleteWaTemplate();
  const syncMutation = useSyncWaTemplates();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WaTemplate | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (t: WaTemplate) => {
    setEditingTemplate(t);
    setDialogOpen(true);
  };

  const handleSave = (data: { name: string; category: string; language: string; components: unknown[] }) => {
    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, ...data },
        {
          onSuccess: () => { toast.success('Template updated'); setDialogOpen(false); },
          onError: (e) => toast.error(e.message),
        }
      );
    } else {
      createMutation.mutate(
        { organization_id: orgId!, ...data },
        {
          onSuccess: () => { toast.success('Template created'); setDialogOpen(false); },
          onError: (e) => toast.error(e.message),
        }
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success('Template deleted'),
      onError: (e) => toast.error(e.message),
    });
  };

  const handleSync = () => {
    if (!orgId) return;
    syncMutation.mutate(orgId, {
      onSuccess: () => toast.success('Templates synced'),
      onError: (e) => toast.error(e.message),
    });
  };

  const getBodyText = (t: WaTemplate) => {
    const body = (t.components as any[])?.find((c: any) => c.type === 'BODY');
    return body?.text || '';
  };

  return (
    <>
      <WhatsAppSubNav />
      <PageBody>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Message Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">Create and manage WhatsApp message templates</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">No templates yet</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Create your first message template to start sending outbound WhatsApp messages.
            </p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {templates.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm text-foreground font-mono">{t.name}</h3>
                      <Badge className={`text-xs ${statusColors[t.status] || ''}`}>
                        {t.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize">{t.category}</Badge>
                      <Badge variant="outline" className="text-xs">{t.language}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{getBodyText(t)}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Updated {format(new Date(t.updated_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(t)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}

        <TemplateEditorDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          template={editingTemplate}
          onSave={handleSave}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      </PageBody>
    </>
  );
};

export default WhatsAppTemplatesPage;
