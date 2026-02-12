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
import { useOrganization } from '@/hooks/useOrganization';
import type { WorkModel, HiringEmploymentType } from '@/types/hiring';
import { OrgLink } from '@/components/OrgLink';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { ArrowLeft, Loader2, Save, Globe, Sparkles, Wand2, CalendarIcon, Info, MoreHorizontal, Pause, Play, Archive, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useApplications } from '@/services/useHiring';
import { useQueryClient } from '@tanstack/react-query';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { JobPostPreview } from '@/components/hiring/JobPostPreview';
import { CurrencyCombobox } from '@/components/hiring/CurrencyCombobox';
import { PositionCombobox } from '@/components/hiring/PositionCombobox';
import { formatPositionAsRichText } from '@/utils/formatPositionAsRichText';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  submitted: { label: 'Submitted', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved: { label: 'Approved', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  open: { label: 'Open', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  paused: { label: 'Paused', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
};

function QuickInfoCard({ job }: { job: import('@/types/hiring').JobWithRelations | null | undefined }) {
  const { formatDateTime } = useFormattedDate();

  if (!job) return null;

  const statusCfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.draft;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          Quick Info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status</span>
          <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Created</span>
          <span className="font-medium">{formatDateTime(job.created_at)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Created By</span>
          <span className="font-medium">{job.creator?.profiles?.full_name ?? '—'}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JobEdit() {
  const { jobSlug } = useParams<{ jobSlug: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { data: job, isLoading } = useJob(jobSlug);
  const updateJob = useUpdateJob();
  const publishJob = usePublishJob();
  const { data: departments = [] } = useDepartments();
  const { data: offices = [] } = useOffices();
  const { data: jobApplications } = useApplications(job?.id ? { job_id: job.id } : undefined);
  const [isGeneratingJD, setIsGeneratingJD] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    application_close_date: '',
    target_start_date: '',
    justification: '',
    description: '',
    requirements: '',
    benefits: '',
    is_internal_visible: true,
    is_public_visible: true,
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
        application_close_date: (job as any).application_close_date?.split('T')[0] || '',
        justification: job.justification || '',
        description: job.description || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        is_internal_visible: job.is_internal_visible ?? true,
        is_public_visible: job.is_public_visible ?? false,
      });
    }
  }, [job]);

  // Redirect closed vacancies — they cannot be edited
  useEffect(() => {
    if (job && job.status === 'closed') {
      toast.error('Closed vacancies cannot be edited');
      navigateOrg(`/hiring/jobs/${job.slug}`);
    }
  }, [job?.status]);

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
          application_close_date: formData.application_close_date || null,
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

  const handlePause = async () => {
    if (!job?.id) return;
    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        input: { status: 'paused' },
      });
      toast.success('Vacancy paused');
    } catch (error) {
      toast.error('Failed to pause vacancy');
    }
  };

  const handleResume = async () => {
    if (!job?.id) return;
    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        input: { status: 'open' },
      });
      toast.success('Vacancy resumed');
    } catch (error) {
      toast.error('Failed to resume vacancy');
    }
  };

  const handleClose = async () => {
    if (!job?.id) return;
    try {
      await updateJob.mutateAsync({
        jobId: job.id,
        input: { status: 'closed' },
      });
      toast.success('Vacancy closed');
      navigateOrg(`/hiring/jobs/${job.slug}`);
    } catch (error) {
      toast.error('Failed to close vacancy');
    }
  };

  const handleDeleteClick = () => {
    if (!job) return;
    if (job.status !== 'draft' && (jobApplications?.length || 0) > 0) {
      toast.error('Remove all candidates before deleting this vacancy');
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!job || !currentOrg?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id)
        .eq('organization_id', currentOrg.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['hiring', 'jobs'] });
      toast.success('Vacancy deleted');
      navigateOrg('/hiring?tab=jobs');
    } catch (error) {
      toast.error('Failed to delete vacancy');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
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
        <h2 className="text-xl font-semibold mb-2">Job vacancy not found</h2>
        <p className="text-muted-foreground mb-4">The vacancy you're looking for doesn't exist.</p>
        <Button asChild>
          <OrgLink to="/hiring?tab=jobs">Back to Vacancies</OrgLink>
        </Button>
      </div>
    );
  }

  const canPublish = job.status === 'draft' || job.status === 'approved';
  const candidateCount = jobApplications?.length || 0;


  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <OrgLink to={`/hiring/jobs/${job.slug}`}>
            <ArrowLeft className="h-4 w-4" />
          </OrgLink>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Edit Job Vacancy</h1>
          <p className="text-muted-foreground">
            Update job details and requirements
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            Save
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await handleSave();
              navigateOrg('/hiring?tab=jobs');
            }}
            disabled={updateJob.isPending}
          >
            {updateJob.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save & Close
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {job.status === 'open' && (
                <DropdownMenuItem onClick={handlePause}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Vacancy
                </DropdownMenuItem>
              )}
              {job.status === 'paused' && (
                <DropdownMenuItem onClick={handleResume}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume Vacancy
                </DropdownMenuItem>
              )}
              {(job.status === 'open' || job.status === 'paused') && (
                <DropdownMenuItem onClick={handleClose}>
                  <Archive className="h-4 w-4 mr-2" />
                  Close Vacancy
                </DropdownMenuItem>
              )}
              {(job.status === 'open' || job.status === 'paused' || job.status === 'draft') && (
                <DropdownMenuSeparator />
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Vacancy
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                    onChange={(title, description, responsibilities) => {
                      handleChange('title', title);
                      if ((description || responsibilities?.length) && !formData.description) {
                        const formattedHtml = formatPositionAsRichText(description, responsibilities);
                        handleChange('description', formattedHtml);
                      }
                    }}
                    departmentId={formData.department_id}
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
                  <Label htmlFor="salary_currency">Currency</Label>
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
                <Label>Description</Label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => handleChange('description', value)}
                  placeholder="Describe the role, responsibilities, and what success looks like..."
                  minHeight="200px"
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
          {/* Quick Info */}
          <QuickInfoCard job={job} />

          {/* Publishing Options */}
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

          <JobPostPreview
            formData={{
              title: formData.title,
              department_id: formData.department_id,
              office_id: formData.office_id,
              location: formData.location,
              work_model: formData.work_model,
              employment_type: formData.employment_type,
              headcount: formData.headcount,
              salary_min: formData.salary_min,
              salary_max: formData.salary_max,
              salary_currency: formData.salary_currency,
              salary_visible: formData.salary_visible,
              target_start_date: formData.target_start_date,
              application_close_date: formData.application_close_date,
              description: formData.description,
            }}
            departments={departments}
            offices={offices}
            companyName={currentOrg?.name}
          />
        </div>
      </div>
    </div>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vacancy</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{job.title}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
