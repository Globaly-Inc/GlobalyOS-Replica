/**
 * Hiring Settings Page
 * Manage hiring configuration, email templates, and assignment templates
 */

import { useState } from 'react';
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
  useCreateAssignmentTemplate,
  useUpdateAssignmentTemplate,
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
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { EMAIL_TRIGGER_LABELS, ASSIGNMENT_TYPE_LABELS } from '@/types/hiring';
import type { EmailTrigger, AssignmentType, ExpectedDeliverables } from '@/types/hiring';

export default function HiringSettings() {
  const [activeTab, setActiveTab] = useState('templates');

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
    trigger_type: '' as string,
    subject: '',
    body_template: '',
    is_active: true,
  });

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      trigger_type: template.trigger_type,
      subject: template.subject,
      body_template: template.body_template,
      is_active: template.is_active,
    });
    setEditingTemplate(template);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      trigger_type: '',
      subject: '',
      body_template: '',
      is_active: true,
    });
    setEditingTemplate(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.trigger_type || !formData.subject) {
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
                    value={formData.trigger_type}
                    onValueChange={(v) => setFormData({ ...formData, trigger_type: v })}
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
                  value={formData.body_template}
                  onChange={(e) => setFormData({ ...formData, body_template: e.target.value })}
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
                      {EMAIL_TRIGGER_LABELS[(template as any).trigger_type as keyof typeof EMAIL_TRIGGER_LABELS] || (template as any).trigger_type}
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
          <div className="text-center py-8">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No email templates yet</p>
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
// ASSIGNMENT TEMPLATES SECTION
// ============================================

function AssignmentTemplatesSection() {
  const { data: templates, isLoading } = useAssignmentTemplates();
  const createTemplate = useCreateAssignmentTemplate();
  const updateTemplate = useUpdateAssignmentTemplate();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'coding' as AssignmentType,
    instructions: '',
    default_deadline_hours: 72,
    recommended_effort: '',
    role_tags: [] as string[],
    expected_deliverables: {
      files: false,
      text_questions: [] as string[],
      url_fields: [] as string[],
    },
  });

  const handleEdit = (template: any) => {
    setFormData({
      name: template.name,
      type: (template.type || 'coding') as AssignmentType,
      instructions: template.instructions,
      default_deadline_hours: template.default_deadline_hours || 72,
      recommended_effort: template.recommended_effort || '',
      role_tags: template.role_tags || [],
      expected_deliverables: template.expected_deliverables || {
        files: false,
        text_questions: [],
        url_fields: [],
      },
    });
    setEditingTemplate(template);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      type: 'coding' as AssignmentType,
      instructions: '',
      default_deadline_hours: 72,
      recommended_effort: '',
      role_tags: [],
      expected_deliverables: {
        files: false,
        text_questions: [],
        url_fields: [],
      },
    });
    setEditingTemplate(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.instructions) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          input: formData,
        });
      } else {
        await createTemplate.mutateAsync(formData);
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
          <CardTitle>Assignment Templates</CardTitle>
          <CardDescription>
            Create reusable templates for candidate assessments
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
                {editingTemplate ? 'Edit Assignment Template' : 'Create Assignment Template'}
              </DialogTitle>
              <DialogDescription>
                Define a reusable assignment that can be sent to candidates
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Frontend Technical Assessment"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as AssignmentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ASSIGNMENT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Instructions *</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  rows={8}
                  placeholder="Describe what the candidate needs to complete..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Deadline (hours)</Label>
                  <Input
                    type="number"
                    value={formData.default_deadline_hours}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      default_deadline_hours: parseInt(e.target.value) || 72 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recommended Effort</Label>
                  <Input
                    value={formData.recommended_effort}
                    onChange={(e) => setFormData({ ...formData, recommended_effort: e.target.value })}
                    placeholder="e.g., 2-3 hours"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role Tags (comma-separated)</Label>
                <Input
                  value={formData.role_tags.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    role_tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) 
                  })}
                  placeholder="e.g., engineering, frontend, senior"
                />
              </div>

              <div className="space-y-2">
                <Label>Expected Deliverables</Label>
                <div className="space-y-3 p-3 border rounded-md">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.expected_deliverables.files}
                      onChange={(e) => setFormData({
                        ...formData,
                        expected_deliverables: {
                          ...formData.expected_deliverables,
                          files: e.target.checked
                        }
                      })}
                      className="rounded"
                    />
                    <span className="text-sm">File uploads</span>
                  </label>
                  <div className="space-y-1">
                    <Label className="text-xs">URL Fields (comma-separated)</Label>
                    <Input
                      value={formData.expected_deliverables.url_fields.join(', ')}
                      onChange={(e) => setFormData({
                        ...formData,
                        expected_deliverables: {
                          ...formData.expected_deliverables,
                          url_fields: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        }
                      })}
                      placeholder="e.g., GitHub Repo, Live Demo"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Text Questions (one per line)</Label>
                    <Textarea
                      value={formData.expected_deliverables.text_questions.join('\n')}
                      onChange={(e) => setFormData({
                        ...formData,
                        expected_deliverables: {
                          ...formData.expected_deliverables,
                          text_questions: e.target.value.split('\n').filter(Boolean)
                        }
                      })}
                      rows={3}
                      placeholder="What was your approach?&#10;What challenges did you face?"
                    />
                  </div>
                </div>
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
                <TableHead>Type</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ASSIGNMENT_TYPE_LABELS[template.type] || template.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{template.default_deadline_hours}h</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.role_tags?.slice(0, 2).map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(template.role_tags?.length || 0) > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.role_tags!.length - 2}
                        </Badge>
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
  const [config, setConfig] = useState({
    auto_send_application_received: true,
    require_cover_letter: false,
    allow_internal_applications: true,
    default_rejection_delay_days: 3,
    careers_page_enabled: true,
    careers_page_title: 'Join Our Team',
    careers_page_description: '',
  });

  const handleSave = () => {
    // Would save to org settings
    toast.success('Settings saved');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Configure how candidates apply to your jobs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-send application confirmation</Label>
              <p className="text-sm text-muted-foreground">
                Send an email when a candidate applies
              </p>
            </div>
            <Switch
              checked={config.auto_send_application_received}
              onCheckedChange={(checked) => 
                setConfig({ ...config, auto_send_application_received: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Require cover letter</Label>
              <p className="text-sm text-muted-foreground">
                Make cover letter mandatory for applications
              </p>
            </div>
            <Switch
              checked={config.require_cover_letter}
              onCheckedChange={(checked) => 
                setConfig({ ...config, require_cover_letter: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Allow internal applications</Label>
              <p className="text-sm text-muted-foreground">
                Let existing employees apply for open positions
              </p>
            </div>
            <Switch
              checked={config.allow_internal_applications}
              onCheckedChange={(checked) => 
                setConfig({ ...config, allow_internal_applications: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Careers Page</CardTitle>
          <CardDescription>
            Customize your public careers page
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable careers page</Label>
              <p className="text-sm text-muted-foreground">
                Show your open jobs on a public page
              </p>
            </div>
            <Switch
              checked={config.careers_page_enabled}
              onCheckedChange={(checked) => 
                setConfig({ ...config, careers_page_enabled: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Page Title</Label>
            <Input
              value={config.careers_page_title}
              onChange={(e) => setConfig({ ...config, careers_page_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Page Description</Label>
            <Textarea
              value={config.careers_page_description}
              onChange={(e) => setConfig({ ...config, careers_page_description: e.target.value })}
              rows={3}
              placeholder="Describe your company and culture..."
            />
          </div>

          <Button onClick={handleSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
