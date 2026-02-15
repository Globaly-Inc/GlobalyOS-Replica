import { useState } from 'react';
import { formatPositionAsRichText } from '@/utils/formatPositionAsRichText';
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
import { useOrganization } from '@/hooks/useOrganization';
import { generateJobSlug } from '@/types/hiring';
import { ArrowLeft, Loader2, Save, Sparkles, Wand2, CalendarIcon, Globe } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { OrgLink } from '@/components/OrgLink';
import { supabase } from '@/integrations/supabase/client';
import { PositionCombobox } from '@/components/hiring/PositionCombobox';
import { JobPostPreview } from '@/components/hiring/JobPostPreview';
import { CurrencyCombobox } from '@/components/hiring/CurrencyCombobox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

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
  const { currentOrg } = useOrganization();
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
    application_close_date: '',
    auto_close_on_deadline: false,
    target_start_date: '',
    justification: '',
    description: '',
    is_internal_visible: true,
    is_internal_apply: false,
    is_public_visible: true,
  });

  const [isGeneratingJD, setIsGeneratingJD] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Reset auto_close flag when close date is cleared
      if (field === 'application_close_date' && !value) {
        next.auto_close_on_deadline = false;
      }
      return next;
    });
  };

  const handleSubmit = async (publish: boolean = false) => {
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

      if (publish) {
        // Immediately set status to open
        await supabase
          .from('jobs')
          .update({ status: 'open', published_at: new Date().toISOString() })
          .eq('id', job.id);
        toast.success('Job vacancy published');
      } else {
        toast.success('Job saved as draft');
      }
      navigateOrg(`/hiring/jobs/${job.slug}`);
    } catch (error) {
      toast.error('Failed to create job');
    }
  };

  // Check if description has meaningful content
  const hasDescriptionContent = formData.description.trim().length > 50;

  const generateJobDescription = async () => {
    if (!formData.title) {
      toast.error('Please enter a job title first');
      return;
    }

    const mode = hasDescriptionContent ? 'improve' : 'generate';
    setIsGeneratingJD(true);
    try {
      const selectedDept = departments.find(d => d.id === formData.department_id);
      const selectedOffice = offices.find(o => o.id === formData.office_id);
      
      const { data, error } = await supabase.functions.invoke('generate-job-description', {
        body: {
          organization_id: currentOrg?.id,
          title: formData.title,
          department: selectedDept?.name,
          location: formData.location || selectedOffice?.city,
          office_country: selectedOffice?.country,
          office_region: (selectedOffice as any)?.region,
          work_model: formData.work_model,
          employment_type: formData.employment_type,
          salary_min: formData.salary_min ? parseFloat(formData.salary_min) : undefined,
          salary_max: formData.salary_max ? parseFloat(formData.salary_max) : undefined,
          salary_currency: formData.salary_currency,
          salary_visible: formData.salary_visible,
          company_name: currentOrg?.name,
          industry: currentOrg?.industry,
          company_size: currentOrg?.company_size,
          application_deadline: formData.application_close_date || undefined,
          mode,
          existing_description: mode === 'improve' ? formData.description : undefined,
        },
      });

      if (error) throw error;

      if (data?.success && data?.description) {
        handleChange('description', data.description);
        toast.success(mode === 'improve' ? 'Job description improved!' : 'Job description generated!');
      } else {
        throw new Error(data?.message || 'Failed to generate description');
      }
    } catch (error: any) {
      console.error('Error generating job description:', error);
      toast.error('Failed to generate job description');
    } finally {
      setIsGeneratingJD(false);
    }
  };

  // Dynamic button label and icon
  const aiButtonLabel = isGeneratingJD 
    ? (hasDescriptionContent ? 'Improving...' : 'Generating...') 
    : (hasDescriptionContent ? 'Improve with AI' : 'Generate with AI');
  const AiButtonIcon = hasDescriptionContent ? Wand2 : Sparkles;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <OrgLink to="/hiring?tab=jobs">
            <ArrowLeft className="h-4 w-4" />
          </OrgLink>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Create Job Vacancy</h1>
          <p className="text-muted-foreground">
            Define the role and requirements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <OrgLink to="/hiring?tab=jobs">Cancel</OrgLink>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={createJob.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={createJob.isPending}
          >
            {createJob.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Globe className="h-4 w-4 mr-2" />
            )}
            Publish Vacancy
          </Button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
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
                  <PositionCombobox
                    value={formData.title}
                    onChange={(value, description, responsibilities) => {
                      handleChange('title', value);
                      // Auto-fill description if position has one and current description is empty
                      if ((description || responsibilities?.length) && !formData.description) {
                        const formattedHtml = formatPositionAsRichText(description, responsibilities);
                        handleChange('description', formattedHtml);
                      }
                    }}
                    departmentId={formData.department_id || undefined}
                    placeholder="Select or create position..."
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
                  <Label htmlFor="headcount">Number of Positions</Label>
                  <Input
                    id="headcount"
                    type="number"
                    min={1}
                    value={formData.headcount}
                    onChange={(e) => handleChange('headcount', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Application Close Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.application_close_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.application_close_date ? (
                          format(new Date(formData.application_close_date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.application_close_date ? new Date(formData.application_close_date) : undefined}
                        onSelect={(date) => handleChange('application_close_date', date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Checkbox
                      id="auto_close_on_deadline"
                      checked={formData.auto_close_on_deadline}
                      onCheckedChange={(checked) => handleChange('auto_close_on_deadline', !!checked)}
                      disabled={!formData.application_close_date}
                    />
                    <label
                      htmlFor="auto_close_on_deadline"
                      className="text-sm text-muted-foreground cursor-pointer select-none"
                    >
                      Auto close after this date
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Target Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.target_start_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.target_start_date ? (
                          format(new Date(formData.target_start_date), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.target_start_date ? new Date(formData.target_start_date) : undefined}
                        onSelect={(date) => handleChange('target_start_date', date ? format(date, 'yyyy-MM-dd') : '')}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compensation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Compensation</CardTitle>
                  <CardDescription>Salary range for this position</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="salary_visible"
                    checked={formData.salary_visible}
                    onCheckedChange={(checked) => handleChange('salary_visible', checked)}
                  />
                  <Label htmlFor="salary_visible" className="cursor-pointer text-sm">
                    Show on posting
                  </Label>
                </div>
              </div>
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
                  <Label>Currency</Label>
                  <CurrencyCombobox
                    value={formData.salary_currency}
                    onChange={(value) => handleChange('salary_currency', value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Description */}
          <Card>
            <CardHeader>
              <CardTitle>Job Vacancy Description</CardTitle>
              <CardDescription>Detailed role description and requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => handleChange('description', value)}
                  placeholder="Write a detailed job description..."
                  minHeight="300px"
                  renderToolbarRight={() => (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateJobDescription}
                      disabled={isGeneratingJD}
                      className="h-8 gap-1.5 text-xs"
                    >
                      {isGeneratingJD ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <AiButtonIcon className="h-3.5 w-3.5" />
                      )}
                      {aiButtonLabel}
                    </Button>
                  )}
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


        </div>

        {/* Right Column - Publishing + Preview (1/3) */}
        <div className="hidden lg:block space-y-6">
          {/* Publishing Options */}
          <Card>
            <CardHeader>
              <CardTitle>Publishing Options</CardTitle>
              <CardDescription>Control where this job is visible</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="is_internal_visible"
                    checked={formData.is_internal_visible}
                    onCheckedChange={(checked) => {
                      handleChange('is_internal_visible', checked);
                      if (!checked) handleChange('is_internal_apply', false);
                    }}
                  />
                  <div>
                    <Label htmlFor="is_internal_visible" className="cursor-pointer">
                      Show on internal job board
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Visible to employees on home page with share/refer option</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-6 mt-3">
                  <Switch
                    id="is_internal_apply"
                    checked={formData.is_internal_apply}
                    onCheckedChange={(checked) => handleChange('is_internal_apply', checked)}
                    disabled={!formData.is_internal_visible}
                  />
                  <div className={!formData.is_internal_visible ? 'opacity-50' : ''}>
                    <Label htmlFor="is_internal_apply" className="cursor-pointer">
                      Allow internal applications
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">Team members can apply directly to this position</p>
                  </div>
                </div>
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

          <JobPostPreview
            formData={formData}
            departments={departments}
            offices={offices}
            companyName={currentOrg?.name}
          />
        </div>
      </div>
    </div>
  );
}
