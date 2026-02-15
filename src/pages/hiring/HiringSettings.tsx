/**
 * Hiring Settings Page
 * Manage hiring configuration, email templates, and assignment templates
 */

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgLink } from '@/components/OrgLink';
import { useHiringEmailTemplates, useAssignmentTemplates } from '@/services/useHiring';
import { 
  useCreateEmailTemplate, 
  useUpdateEmailTemplate,
} from '@/services/useHiringMutations';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Mail, 
  ClipboardList, 
  Settings2,
  Plus,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { EMAIL_TRIGGER_LABELS, ASSIGNMENT_TYPE_LABELS } from '@/types/hiring';
import type { EmailTrigger } from '@/types/hiring';
import { usePositions } from '@/hooks/usePositions';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';

export default function HiringSettings() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'templates';
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
            Manage email templates, assignment templates, and configuration
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Assignment Templates
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <EmailTemplatesSection />
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
// EMAIL TEMPLATES SECTION
// ============================================

function EmailTemplatesSection() {
  const { data: templates, isLoading } = useHiringEmailTemplates();
  const createTemplate = useCreateEmailTemplate();
  const updateTemplate = useUpdateEmailTemplate();
  
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    template_type: '' as string,
    subject: '',
    body: '',
    is_active: true,
  });

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      template_type: template.template_type,
      subject: template.subject,
      body: template.body,
      is_active: template.is_active,
    });
    setEditingTemplate(template);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      template_type: '',
      subject: '',
      body: '',
      is_active: true,
    });
    setEditingTemplate(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.template_type || !formData.subject) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          input: formData as any,
        });
      } else {
        await createTemplate.mutateAsync(formData as any);
      }
      setShowDialog(false);
    } catch (error) {
      // Error handled by mutation
    }
  };


  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Customize automated emails sent during the hiring process
          </CardDescription>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
              </DialogTitle>
              <DialogDescription>
                Configure when and what emails are sent to candidates
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Application Received"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trigger *</Label>
                  <Select
                    value={formData.template_type}
                    onValueChange={(v) => setFormData({ ...formData, template_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EMAIL_TRIGGER_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Thank you for applying to {{job_title}}"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{candidate_name}}"}, {"{{job_title}}"}, {"{{company_name}}"} for dynamic values
                </p>
              </div>

              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={10}
                  placeholder="Dear {{candidate_name}},&#10;&#10;Thank you for applying..."
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createTemplate.isPending || updateTemplate.isPending}
              >
                {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {templates && templates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {EMAIL_TRIGGER_LABELS[(template as any).template_type as keyof typeof EMAIL_TRIGGER_LABELS] || (template as any).template_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'secondary'}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No email templates yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create custom email templates for your hiring process, or they'll be auto-generated when your organization is set up.
            </p>
            <Button variant="outline" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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

  const handleCreate = () => {
    navigate(`/org/${currentOrg?.slug}/hiring/settings/assignments/new`);
  };

  const handleEdit = (template: any) => {
    navigate(`/org/${currentOrg?.slug}/hiring/settings/assignments/${template.id}/edit`);
  };

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
                <TableHead className="w-20">Actions</TableHead>
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
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
    </Card>
  );
}

// ============================================
// CONFIGURATION SECTION
// ============================================

function ConfigurationSection() {
  const { data: emailTemplates, isLoading } = useHiringEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();

  const templateTypes = [
    { type: 'application_received', label: 'Auto-send application received email', description: 'Send confirmation when a candidate applies' },
    { type: 'application_rejected', label: 'Auto-send rejection email', description: 'Notify candidates when rejected' },
    { type: 'interview_scheduled', label: 'Auto-send interview scheduled email', description: 'Notify candidates when an interview is scheduled' },
    { type: 'assignment_sent', label: 'Auto-send assignment email', description: 'Notify candidates when an assignment is sent' },
    { type: 'assignment_reminder', label: 'Auto-send assignment reminder', description: 'Remind candidates of upcoming assignment deadlines' },
    { type: 'offer_sent', label: 'Auto-send offer email', description: 'Notify candidates when an offer is extended' },
  ];

  const getTemplateActive = (templateType: string) => {
    const template = emailTemplates?.find((t: any) => t.template_type === templateType);
    return template?.is_active ?? true;
  };

  const handleToggle = (templateType: string, checked: boolean) => {
    const template = emailTemplates?.find((t: any) => t.template_type === templateType);
    if (template) {
      updateTemplate.mutate({ id: template.id, input: { is_active: checked } });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Automation</CardTitle>
          <CardDescription>
            Control which emails are automatically sent during the hiring process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            templateTypes.map(({ type, label, description }) => (
              <div key={type} className="flex items-center justify-between py-2">
                <div>
                  <Label>{label}</Label>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <Switch
                  checked={getTemplateActive(type)}
                  onCheckedChange={(checked) => handleToggle(type, checked)}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
