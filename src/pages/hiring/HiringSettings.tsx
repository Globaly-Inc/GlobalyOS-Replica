/**
 * Hiring Settings Page
 * Manage hiring configuration, email templates, and assignment templates
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgLink } from '@/components/OrgLink';
import { useAssignmentTemplates } from '@/services/useHiring';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  ClipboardList, 
  Settings2,
  GitBranch,
  Plus,
  Pencil,
  Eye,
} from 'lucide-react';
import { PipelineSettingsSection } from '@/components/hiring/PipelineSettingsSection';
import { AssignmentPreviewDialog } from '@/components/hiring/AssignmentPreviewDialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ASSIGNMENT_TYPE_LABELS } from '@/types/hiring';
import { usePositions } from '@/hooks/usePositions';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';

export default function HiringSettings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'pipeline';
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <OrgLink to="/hiring">
            <ArrowLeft className="h-4 w-4" />
          </OrgLink>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hiring Settings</h1>
          <p className="text-muted-foreground">
            Manage pipelines, assignment templates, and configuration
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Pipeline Settings
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Assignment Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Career Site Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-6">
          <PipelineSettingsSection />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentTemplatesSection />
        </TabsContent>

        <TabsContent value="config" className="mt-6">
          <ConfigurationSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// ASSIGNMENT TEMPLATES SECTION
// ============================================

function AssignmentTemplatesSection() {
  const { data: templates, isLoading } = useAssignmentTemplates();
  const { data: allPositions = [] } = usePositions();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  const handleCreate = () => {
    navigate(`/org/${currentOrg?.slug}/hiring/settings/assignments/new`);
  };

  const handleEdit = (template: any) => {
    navigate(`/org/${currentOrg?.slug}/hiring/settings/assignments/${template.id}/edit`);
  };

  const buildFormData = (template: any) => ({
    name: template.name || '',
    type: template.type || '',
    instructions: template.instructions || '',
    default_deadline_hours: template.default_deadline_hours || 72,
    recommended_effort: template.recommended_effort || '',
    expected_deliverables: {
      files: template.expected_deliverables?.files ?? false,
      url_fields: template.expected_deliverables?.url_fields ?? [],
      questions: template.expected_deliverables?.questions ?? [],
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Assignment Templates</CardTitle>
          <CardDescription>
            Create reusable templates for candidate assessments
          </CardDescription>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
      </CardHeader>
      <CardContent>
        {templates && templates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Positions</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ASSIGNMENT_TYPE_LABELS[template.type] || template.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                  </TableCell>
                  <TableCell>{template.default_deadline_hours}h</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(template.position_ids || []).slice(0, 2).map((pid: string) => {
                        const pos = allPositions.find(p => p.id === pid);
                        return (
                          <Badge key={pid} variant="secondary" className="text-xs">
                            {pos?.name || 'Unknown'}
                          </Badge>
                        );
                      })}
                      {(template.position_ids?.length || 0) > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.position_ids!.length - 2}
                        </Badge>
                      )}
                      {!(template.position_ids?.length) && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewTemplate(template)}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(template)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No assignment templates yet</p>
            <Button variant="outline" className="mt-4" onClick={handleCreate}>
              Create your first template
            </Button>
          </div>
        )}
      </CardContent>

      {previewTemplate && (
        <AssignmentPreviewDialog
          open={!!previewTemplate}
          onOpenChange={(open) => { if (!open) setPreviewTemplate(null); }}
          formData={buildFormData(previewTemplate)}
          isEditMode={false}
        />
      )}
    </Card>
  );
}

// ============================================
// CONFIGURATION SECTION
// ============================================

function ConfigurationSection() {
  const { currentOrg, refreshOrganizations } = useOrganization();
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [headerColor, setHeaderColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load current values from org
  useEffect(() => {
    if (currentOrg && !loaded) {
      setTitle((currentOrg as any).careers_page_title || 'Join Our Team');
      setSubtitle((currentOrg as any).careers_page_subtitle || 'Discover opportunities to grow your career with us. We\'re looking for talented people to help shape the future.');
      setHeaderColor((currentOrg as any).careers_header_color || '');
      setLoaded(true);
    }
  }, [currentOrg, loaded]);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          careers_page_title: title || 'Join Our Team',
          careers_page_subtitle: subtitle || null,
          careers_header_color: headerColor || '#2563eb',
        } as any)
        .eq('id', currentOrg.id);
      if (error) throw error;
      toast.success('Career page settings saved');
      refreshOrganizations();
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Career Page Settings</CardTitle>
          <CardDescription>
            Customize the public careers page for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Page Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Join Our Team"
            />
          </div>

          <div className="space-y-2">
            <Label>Page Subtitle</Label>
            <Textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              rows={3}
              placeholder="Discover opportunities to grow your career with us..."
            />
          </div>

          <div className="space-y-2">
            <Label>Header Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={headerColor || '#2563eb'}
                onChange={(e) => setHeaderColor(e.target.value)}
                className="h-10 w-14 rounded border border-input cursor-pointer"
              />
              <Input
                value={headerColor}
                onChange={(e) => setHeaderColor(e.target.value)}
                placeholder="#2563eb"
                className="flex-1"
              />
              {headerColor && (
                <Button variant="ghost" size="sm" onClick={() => setHeaderColor('#2563eb')}>
                  Reset
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Sets the hero section background color on your public careers page.
            </p>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="rounded-lg p-8 text-center text-white"
              style={{ backgroundColor: headerColor || '#2563eb' }}
            >
              <h2 className="text-2xl font-bold mb-2">{title || 'Join Our Team'}</h2>
              <p className="text-sm opacity-90 max-w-md mx-auto">
                {subtitle || 'Discover opportunities to grow your career with us.'}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
