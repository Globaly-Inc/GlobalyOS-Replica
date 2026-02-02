/**
 * Job Edit Page
 * Edit an existing job posting
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useJob } from '@/services/useHiring';
import { useUpdateJob, usePublishJob } from '@/services/useHiringMutations';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useDepartments, useOffices } from '@/hooks/useOrganizationData';
import type { WorkModel, HiringEmploymentType } from '@/types/hiring';
import { OrgLink } from '@/components/OrgLink';
import { ArrowLeft, Loader2, Save, Globe } from 'lucide-react';
import { toast } from 'sonner';

const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const WORK_MODELS = [
  { value: 'onsite', label: 'On-site' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function JobEdit() {
  const { jobSlug } = useParams<{ jobSlug: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { data: job, isLoading } = useJob(jobSlug);
  const updateJob = useUpdateJob();
  const publishJob = usePublishJob();
  const { data: departments = [] } = useDepartments();
  const { data: offices = [] } = useOffices();

  const [formData, setFormData] = useState({
    title: '',
    department_id: '',
    office_id: '',
    location: '',
    work_model: 'onsite' as WorkModel,
    employment_type: 'full_time' as HiringEmploymentType,
    headcount: 1,
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
    salary_visible: false,
    target_start_date: '',
    justification: '',
    description: '',
    requirements: '',
    benefits: '',
    is_internal_visible: true,
    is_public_visible: false,
  });

  // Populate form when job loads
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        department_id: job.department_id || '',
        office_id: job.office_id || '',
        location: job.location || '',
        work_model: (job.work_model || 'onsite') as WorkModel,
        employment_type: (job.employment_type || 'full_time') as HiringEmploymentType,
        headcount: job.headcount || 1,
        salary_min: job.salary_min?.toString() || '',
        salary_max: job.salary_max?.toString() || '',
        salary_currency: job.salary_currency || 'USD',
        salary_visible: job.salary_visible || false,
        target_start_date: job.target_start_date?.split('T')[0] || '',
        justification: job.justification || '',
        description: job.description || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        is_internal_visible: job.is_internal_visible ?? true,
        is_public_visible: job.is_public_visible ?? false,
      });
    }
  }, [job]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!job?.id || !formData.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        input: {
          title: formData.title,
          department_id: formData.department_id || null,
          office_id: formData.office_id || null,
          location: formData.location || null,
          work_model: formData.work_model,
          employment_type: formData.employment_type,
          headcount: formData.headcount,
          salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
          salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
          salary_currency: formData.salary_currency,
          salary_visible: formData.salary_visible,
          target_start_date: formData.target_start_date || null,
          justification: formData.justification || null,
          description: formData.description || null,
          requirements: formData.requirements || null,
          benefits: formData.benefits || null,
          is_internal_visible: formData.is_internal_visible,
          is_public_visible: formData.is_public_visible,
        },
      });
      toast.success('Job updated');
    } catch (error) {
      toast.error('Failed to update job');
    }
  };

  const handlePublish = async () => {
    if (!job?.id) return;
    await handleSave();
    try {
      await publishJob.mutateAsync({
        jobId: job.id,
        isInternal: formData.is_internal_visible,
        isPublic: formData.is_public_visible,
      });
      toast.success('Job published');
    } catch (error) {
      toast.error('Failed to publish job');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-xl font-semibold mb-2">Job not found</h2>
        <p className="text-muted-foreground mb-4">The job you're looking for doesn't exist.</p>
        <Button asChild>
          <OrgLink to="/hiring/jobs">Back to Jobs</OrgLink>
        </Button>
      </div>
    );
  }

  const canPublish = job.status === 'approved' || job.status === 'open' || job.status === 'draft';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <OrgLink to={`/hiring/jobs/${job.slug}`}>
            <ArrowLeft className="h-4 w-4" />
          </OrgLink>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Job</h1>
          <p className="text-muted-foreground">
            Update job details and requirements
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core details about the position</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Senior Software Engineer"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <Select
                value={formData.department_id}
                onValueChange={(value) => handleChange('department_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="office_id">Office</Label>
              <Select
                value={formData.office_id}
                onValueChange={(value) => handleChange('office_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select office" />
                </SelectTrigger>
                <SelectContent>
                  {offices.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name} {office.city ? `(${office.city})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location Override</Label>
              <Input
                id="location"
                placeholder="e.g. San Francisco, CA (optional)"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="work_model">Work Model</Label>
              <Select
                value={formData.work_model}
                onValueChange={(value) => handleChange('work_model', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODELS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employment_type">Employment Type</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(value) => handleChange('employment_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="headcount">Positions</Label>
              <Input
                id="headcount"
                type="number"
                min={1}
                value={formData.headcount}
                onChange={(e) => handleChange('headcount', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_start_date">Target Start Date</Label>
            <Input
              id="target_start_date"
              type="date"
              value={formData.target_start_date}
              className="max-w-xs"
              onChange={(e) => handleChange('target_start_date', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Compensation */}
      <Card>
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
          <CardDescription>Salary range for this position</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="salary_min">Minimum Salary</Label>
              <Input
                id="salary_min"
                type="number"
                placeholder="50000"
                value={formData.salary_min}
                onChange={(e) => handleChange('salary_min', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_max">Maximum Salary</Label>
              <Input
                id="salary_max"
                type="number"
                placeholder="80000"
                value={formData.salary_max}
                onChange={(e) => handleChange('salary_max', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_currency">Currency</Label>
              <Select
                value={formData.salary_currency}
                onValueChange={(value) => handleChange('salary_currency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                  <SelectItem value="NPR">NPR</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="salary_visible"
              checked={formData.salary_visible}
              onCheckedChange={(checked) => handleChange('salary_visible', checked)}
            />
            <Label htmlFor="salary_visible" className="cursor-pointer">
              Show salary range on job posting
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Job Description */}
      <Card>
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
          <CardDescription>Detailed role description and requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the role, responsibilities, and what success looks like..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="List the skills, experience, and qualifications needed..."
              value={formData.requirements}
              onChange={(e) => handleChange('requirements', e.target.value)}
              className="min-h-[150px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Benefits</Label>
            <Textarea
              id="benefits"
              placeholder="Describe the benefits and perks of the role..."
              value={formData.benefits}
              onChange={(e) => handleChange('benefits', e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Business Justification (Internal)</Label>
            <Textarea
              id="justification"
              placeholder="Why is this role needed?"
              value={formData.justification}
              onChange={(e) => handleChange('justification', e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Publishing */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing Options</CardTitle>
          <CardDescription>Control where this job is visible</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="is_internal_visible"
              checked={formData.is_internal_visible}
              onCheckedChange={(checked) => handleChange('is_internal_visible', checked)}
            />
            <Label htmlFor="is_internal_visible" className="cursor-pointer">
              Show on internal job board (visible to employees)
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="is_public_visible"
              checked={formData.is_public_visible}
              onCheckedChange={(checked) => handleChange('is_public_visible', checked)}
            />
            <Label htmlFor="is_public_visible" className="cursor-pointer">
              Show on public careers site
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" asChild>
          <OrgLink to={`/hiring/jobs/${job.slug}`}>Cancel</OrgLink>
        </Button>
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={updateJob.isPending}
        >
          {updateJob.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
        {canPublish && (
          <Button
            onClick={handlePublish}
            disabled={publishJob.isPending}
          >
            {publishJob.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Publish
          </Button>
        )}
      </div>
    </div>
  );
}
