/**
 * Full-page editor for creating/editing assignment templates.
 * Replaces the previous dialog-based approach for more space.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageBody } from '@/components/ui/page-body';
import { OrgLink } from '@/components/OrgLink';
import { AssignmentTypeCombobox } from '@/components/hiring/AssignmentTypeCombobox';
import { PositionMultiSelect } from '@/components/hiring/PositionMultiSelect';
import { useAssignmentTemplates } from '@/services/useHiring';
import {
  useCreateAssignmentTemplate,
  useUpdateAssignmentTemplate,
} from '@/services/useHiringMutations';
import { useOrganization } from '@/hooks/useOrganization';

export default function AssignmentTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const isEditMode = !!templateId;

  const { data: templates, isLoading } = useAssignmentTemplates();
  const createTemplate = useCreateAssignmentTemplate();
  const updateTemplate = useUpdateAssignmentTemplate();

  const [formData, setFormData] = useState({
    name: '',
    type: 'coding',
    instructions: '',
    default_deadline_hours: 72,
    recommended_effort: '',
    role_tags: [] as string[],
    position_ids: [] as string[],
    expected_deliverables: {
      files: false,
      url_fields: [] as string[],
    },
  });

  // Load template data for edit mode
  useEffect(() => {
    if (isEditMode && templates) {
      const template = templates.find((t: any) => t.id === templateId);
      if (template) {
        setFormData({
          name: template.name,
          type: template.type || 'coding',
          instructions: template.instructions,
          default_deadline_hours: template.default_deadline_hours || 72,
          recommended_effort: template.recommended_effort || '',
          role_tags: template.role_tags || [],
          position_ids: template.position_ids || [],
          expected_deliverables: template.expected_deliverables || {
            files: false,
            url_fields: [],
          },
        });
      }
    }
  }, [isEditMode, templates, templateId]);

  const goBack = () => {
    navigate(`/org/${currentOrg?.slug}/hiring/settings?tab=assignments`);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.instructions) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (isEditMode) {
        await updateTemplate.mutateAsync({
          id: templateId!,
          input: formData,
        });
      } else {
        await createTemplate.mutateAsync(formData);
      }
      goBack();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  if (isLoading && isEditMode) {
    return (
      <PageBody>
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </PageBody>
    );
  }

  return (
    <PageBody>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditMode ? 'Edit Assignment Template' : 'Create Assignment Template'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode
                ? 'Update your assignment template details'
                : 'Define a reusable assignment that can be sent to candidates'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Template'}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main content - 2 cols */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <AssignmentTypeCombobox
                    value={formData.type}
                    onChange={(v) => setFormData({ ...formData, type: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Instructions *</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                rows={16}
                placeholder="Describe what the candidate needs to complete..."
                className="min-h-[300px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 col */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Default Deadline (hours)</Label>
                <Input
                  type="number"
                  value={formData.default_deadline_hours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      default_deadline_hours: parseInt(e.target.value) || 72,
                    })
                  }
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <PositionMultiSelect
                value={formData.position_ids}
                onChange={(ids) => setFormData({ ...formData, position_ids: ids })}
                placeholder="Select positions this template applies to..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Expected Deliverables</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.expected_deliverables.files}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_deliverables: {
                        ...formData.expected_deliverables,
                        files: e.target.checked,
                      },
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">File uploads</span>
              </label>
              <div className="space-y-1">
                <Label className="text-xs">URL Fields (comma-separated)</Label>
                <Input
                  value={formData.expected_deliverables.url_fields.join(', ')}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_deliverables: {
                        ...formData.expected_deliverables,
                        url_fields: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                  placeholder="e.g., GitHub Repo, Live Demo"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageBody>
  );
}
