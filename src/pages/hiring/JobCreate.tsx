import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateJob } from '@/services/useHiringMutations';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useDepartments, useOffices } from '@/hooks/useOrganizationData';
import { generateJobSlug } from '@/types/hiring';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { OrgLink } from '@/components/OrgLink';

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

export default function JobCreate() {
  const { navigateOrg } = useOrgNavigation();
  const createJob = useCreateJob();
  const { data: departments = [] } = useDepartments();
  const { data: offices = [] } = useOffices();

  const [formData, setFormData] = useState({
    title: '',
    department_id: '',
    office_id: '',
    location: '',
    work_model: 'onsite' as const,
    employment_type: 'full_time' as const,
    headcount: 1,
    hiring_manager_id: '',
    recruiter_id: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'USD',
    salary_visible: false,
    target_start_date: '',
    justification: '',
    description: '',
    is_internal_visible: true,
    is_public_visible: false,
  });

  const [isGeneratingJD, setIsGeneratingJD] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (submitForApproval: boolean = false) => {
    if (!formData.title.trim()) {
      toast.error('Please enter a job title');
      return;
    }

    try {
      const slug = generateJobSlug(formData.title);
      const job = await createJob.mutateAsync({
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
        hiring_manager_id: formData.hiring_manager_id || null,
        recruiter_id: formData.recruiter_id || null,
        target_start_date: formData.target_start_date || null,
        justification: formData.justification || null,
        description: formData.description || null,
      });

      toast.success(
        submitForApproval
          ? 'Job submitted for approval'
          : 'Job saved as draft'
      );
      navigateOrg(`/hiring/jobs/${job.slug}`);
    } catch (error) {
      toast.error('Failed to create job');
    }
  };

  const generateJobDescription = async () => {
    if (!formData.title) {
      toast.error('Please enter a job title first');
      return;
    }

    setIsGeneratingJD(true);
    try {
      // TODO: Implement AI JD generation via edge function
      // For now, show a placeholder
      const selectedDept = departments.find(d => d.id === formData.department_id);
      const placeholder = `# About the Role

We are looking for a talented ${formData.title} to join our ${selectedDept?.name || 'team'}. This is a ${formData.work_model} position based in ${formData.location || 'our office'}.

## Responsibilities

- Define and execute key initiatives
- Collaborate with cross-functional teams
- Drive continuous improvement and innovation

## Requirements

- Relevant experience in the field
- Strong communication skills
- Problem-solving mindset

## Nice to Have

- Previous startup experience
- Industry-specific knowledge

## Benefits

- Competitive salary
- Health insurance
- Flexible working arrangements
- Professional development opportunities`;

      handleChange('description', placeholder);
      toast.success('Job description generated');
    } catch (error) {
      toast.error('Failed to generate job description');
    } finally {
      setIsGeneratingJD(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <OrgLink to="/hiring/jobs">
            <ArrowLeft className="h-4 w-4" />
          </OrgLink>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Job</h1>
          <p className="text-muted-foreground">
            Define the role and requirements
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="headcount">Number of Positions</Label>
              <Input
                id="headcount"
                type="number"
                min={1}
                value={formData.headcount}
                onChange={(e) => handleChange('headcount', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_start_date">Target Start Date</Label>
              <Input
                id="target_start_date"
                type="date"
                value={formData.target_start_date}
                onChange={(e) => handleChange('target_start_date', e.target.value)}
              />
            </div>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>Detailed role description and requirements</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateJobDescription}
              disabled={isGeneratingJD}
            >
              {isGeneratingJD ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate with AI
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea
              placeholder="Write a detailed job description..."
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Supports Markdown formatting
            </p>
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
          <OrgLink to="/hiring/jobs">Cancel</OrgLink>
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={createJob.isPending}
        >
          Save as Draft
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={createJob.isPending}
        >
          {createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit for Approval
        </Button>
      </div>
    </div>
  );
}
