/**
 * Email Templates Library
 * Browse, preview, and manage reusable email templates
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, MoreVertical, FileText, Trash2, Copy, Edit } from 'lucide-react';
import { useEmailTemplates, useDeleteEmailTemplate, useCreateEmailTemplate } from '@/services/useCampaigns';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import type { EmailTemplate } from '@/types/campaigns';

const CATEGORY_COLORS: Record<string, string> = {
  marketing: 'bg-blue-100 text-blue-700',
  newsletter: 'bg-green-100 text-green-700',
  announcement: 'bg-purple-100 text-purple-700',
  promotion: 'bg-orange-100 text-orange-700',
  custom: 'bg-muted text-muted-foreground',
};

export default function TemplatesPage() {
  const { navigateOrg } = useOrgNavigation();
  const navigate = useNavigate();
  const { isOwner, isAdmin, isHR } = useUserRole();
  const canManage = isOwner || isAdmin || isHR;

  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useEmailTemplates();
  const deleteMutation = useDeleteEmailTemplate();
  const createMutation = useCreateEmailTemplate();

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleteId(null);
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      await createMutation.mutateAsync({
        name: `${template.name} (Copy)`,
        category: template.category,
        content_json: template.content_json,
      });
      toast.success('Template duplicated');
    } catch {
      toast.error('Failed to duplicate template');
    }
  };

  const handleCreateBlank = async () => {
    try {
      const newTemplate = await createMutation.mutateAsync({
        name: 'Untitled Template',
        category: 'custom',
        content_json: {
          blocks: [],
          globalStyles: {
            backgroundColor: '#f3f4f6',
            fontFamily: 'Inter, sans-serif',
            maxWidth: 600,
          },
        },
      });
      if (newTemplate?.id) {
        navigateOrg(`/crm/campaigns/templates/${newTemplate.id}/edit`);
      }
    } catch {
      toast.error('Failed to create template');
    }
  };

  return (
    <div className="container px-4 md:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reusable email designs for your campaigns
          </p>
        </div>
        {canManage && (
          <Button onClick={handleCreateBlank}>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted rounded-t-lg" />
              <CardFooter className="pt-3 pb-3">
                <div className="h-4 bg-muted rounded w-3/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            {search ? 'No templates found' : 'No templates yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search
              ? 'Try a different search term'
              : 'Create a reusable template to speed up campaign creation'}
          </p>
          {canManage && !search && (
            <Button onClick={handleCreateBlank}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(template => (
            <Card key={template.id} className="group overflow-hidden hover:shadow-md transition-shadow">
              {/* Preview thumbnail */}
              <div className="h-40 bg-gradient-to-b from-muted/30 to-muted/60 flex items-center justify-center border-b relative overflow-hidden">
                <FileText className="h-12 w-12 text-muted-foreground/40" />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
              </div>

              <CardContent className="pt-3 pb-0 px-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">{template.name}</p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] mt-1 capitalize ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom}`}
                    >
                      {template.category}
                    </Badge>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 shrink-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(template.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-3 px-3">
                <p className="text-xs text-muted-foreground">
                  {(template.content_json?.blocks?.length ?? 0)} blocks
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Campaigns using this template will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
