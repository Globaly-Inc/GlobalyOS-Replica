import { useState, useMemo } from 'react';
import { InternalApplyDialog } from '@/components/hiring/InternalApplyDialog';
import { ShareVacancyDialog } from '@/components/hiring/ShareVacancyDialog';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrgLink } from '@/components/OrgLink';
import { useJob, useJobStages, useApplications } from '@/services/useHiring';
import { useHiringApplications } from '@/services';
import { useUpdateJob } from '@/services/useHiringMutations';
import { useAssignmentTemplatesForPosition, type AssignmentTemplateForPosition } from '@/hooks/useAssignmentTemplatesForPosition';
import type { JobStatus, ApplicationStage } from '@/types/hiring';
import { getJobStatusLabel, getJobStatusColor, APPLICATION_STAGE_LABELS, APPLICATION_STAGE_COLORS } from '@/types/hiring';
import { countryToFlag } from '@/utils/countryFlag';
import { HiringKanbanBoard } from '@/components/hiring/pipeline/HiringKanbanBoard';
import { AddCandidateToPipelineDialog } from '@/components/hiring/pipeline/AddCandidateToPipelineDialog';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Pencil, 
  ExternalLink,
  MapPin,
  Building,
  Calendar,
  Users,
  DollarSign,
  Loader2,
  UserPlus,
  Send,
  Pause,
  Play,
  Archive,
  Trash2,
  Globe,
  Clock,
  FileText,
  Briefcase,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function useJobApplications(jobId: string | undefined) {
  return useApplications(jobId ? { job_id: jobId } : undefined);
}

export default function JobDetail() {
  const { jobSlug } = useParams<{ jobSlug: string }>();
  const { navigateOrg, orgCode } = useOrgNavigation();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { data: job, isLoading: jobLoading } = useJob(jobSlug || '');
  const { data: stages } = useJobStages(job?.id || '');
  const { data: applications, isLoading: applicationsLoading } = useJobApplications(job?.id);
  const updateJob = useUpdateJob();
  const assignmentData = useAssignmentTemplatesForPosition(job?.title || '').data;

  const isDraft = job?.status === 'draft';
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const resolvedTab = activeTab ?? (isDraft ? 'description' : 'pipeline');
  const [pipelineStage, setPipelineStage] = useState<ApplicationStage>('applied');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AssignmentTemplateForPosition | null>(null);

  const handleStatusChange = async (newStatus: JobStatus) => {
    if (!job) return;
    try {
      await updateJob.mutateAsync({ jobId: job.id, input: { status: newStatus } });
      const labels: Record<string, string> = {
        paused: 'Vacancy paused',
        open: 'Vacancy resumed',
        closed: 'Vacancy closed',
      };
      toast.success(labels[newStatus] || 'Status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteClick = () => {
    if (!job) return;
    if (job.status !== 'draft' && (applications?.length || 0) > 0) {
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

  if (jobLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
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

  const departmentName = typeof job.department === 'object' ? job.department?.name : null;
  const isClosed = job.status === 'closed';
  const candidateCount = applications?.length || 0;
  

  // Compute stage counts for pipeline mini-chart
  const stageCounts = (() => {
    if (!applications?.length) return [];
    const counts: Record<string, number> = {};
    for (const app of applications) {
      const stage = (app as any).stage || 'applied';
      counts[stage] = (counts[stage] || 0) + 1;
    }
    const activeStages: ApplicationStage[] = ['applied', 'screening', 'assignment', 'interview_1', 'interview_2', 'interview_3', 'offer', 'hired'];
    return activeStages
      .filter(s => counts[s])
      .map(s => ({ stage: s, label: APPLICATION_STAGE_LABELS[s], count: counts[s], color: APPLICATION_STAGE_COLORS[s] }));
  })();

  const locationText = (() => {
    const city = job.location || (job as any).office?.city;
    const country = (job as any).office?.country;
    return [city, country].filter(Boolean).join(', ');
  })();
  const locationFlag = countryToFlag((job as any).office?.country);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <OrgLink to="/hiring?tab=jobs" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Vacancies
          </OrgLink>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-bold tracking-tight">Position Pipeline</h1>
        </div>
        <TooltipProvider>
          <div className="flex items-center gap-1.5">

            {job.is_public_visible && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`/careers/${orgCode}/${job.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Public Page
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View public page</TooltipContent>
              </Tooltip>
            )}

            {isDraft && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" onClick={() => handleStatusChange('open')}>
                    <Globe className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Publish vacancy</TooltipContent>
              </Tooltip>
            )}

            {!isClosed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" asChild>
                    <OrgLink to={`/hiring/jobs/${job.slug}/edit`}>
                      <Pencil className="h-4 w-4" />
                    </OrgLink>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit vacancy</TooltipContent>
              </Tooltip>
            )}

            {job.status === 'open' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => handleStatusChange('paused')}>
                    <Pause className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pause vacancy</TooltipContent>
              </Tooltip>
            )}

            {job.status === 'paused' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => handleStatusChange('open')}>
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Resume vacancy</TooltipContent>
              </Tooltip>
            )}

            {(job.status === 'open' || job.status === 'paused') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={() => handleStatusChange('closed')}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close vacancy</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete vacancy</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Position Pipeline Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column: Job Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">{job.title}</h2>
                <Badge className={getJobStatusColor(job.status)}>
                  {getJobStatusLabel(job.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                {locationText && (
                  <span className="flex items-center gap-1">
                    {locationFlag ? <span className="text-base">{locationFlag}</span> : <MapPin className="h-3.5 w-3.5" />}
                    {locationText}
                  </span>
                )}
                {departmentName && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    {departmentName}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {job.work_model ? job.work_model.charAt(0).toUpperCase() + job.work_model.slice(1) : 'On-site'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {job.employment_type ? job.employment_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Full-time'}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {job.headcount || 1} position{(job.headcount || 1) > 1 ? 's' : ''}
                </span>
              </div>
              {(job as any).application_close_date && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Apply by {new Date((job as any).application_close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {(job as any).auto_close_on_deadline && (
                    <Badge variant="outline" className="ml-1 text-xs py-0 px-1.5">Auto</Badge>
                  )}
                </div>
              )}
              {(job.salary_min && job.salary_max) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-3.5 w-3.5" />
                  {job.salary_currency} {job.salary_min.toLocaleString()} – {job.salary_max.toLocaleString()}
                </div>
              )}
            </div>

            {/* Middle Column: Overview */}
            <div className="space-y-4 md:border-l md:pl-6 border-border">
              <div>
                <p className="text-sm text-muted-foreground">Total candidates</p>
                <p className="text-2xl font-bold">{candidateCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assignment</p>
                <div className="mt-1 flex flex-col gap-1 text-sm">
                  {assignmentData?.templates?.length ? (
                    assignmentData.templates.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className="flex items-center gap-1.5 text-left hover:text-primary transition-colors cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium underline-offset-2 hover:underline">{t.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">None</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Pipeline Stats */}
            <div className="md:border-l md:pl-6 border-border">
              <p className="text-sm text-muted-foreground mb-3">Pipeline</p>
              {stageCounts.length > 0 ? (
                <div className="space-y-1.5">
                  {stageCounts.map(({ stage, label, count, color }) => {
                    const maxCount = Math.max(...stageCounts.map(s => s.count));
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={stage} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-24 truncate text-xs">{label}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="font-semibold text-xs w-5 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No candidates yet</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={resolvedTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            {!isDraft && <TabsTrigger value="pipeline">Pipeline</TabsTrigger>}
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          {resolvedTab === 'pipeline' && !isDraft && (
            <Button size="sm" onClick={() => setAddCandidateOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add Candidate
            </Button>
          )}
        </div>

        {!isDraft && (
          <TabsContent value="pipeline" className="mt-6">
            {applicationsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-[400px] w-full" />
              </div>
            ) : (
              <HiringKanbanBoard
                jobId={job.id}
                applications={applications || []}
                stages={stages || []}
                onStageChange={setPipelineStage}
              />
            )}
          </TabsContent>
        )}

        {job && (
          <AddCandidateToPipelineDialog
            open={addCandidateOpen}
            onOpenChange={setAddCandidateOpen}
            jobId={job.id}
            stages={stages || []}
            defaultStage={pipelineStage}
            existingCandidateIds={(applications || []).map(a => a.candidate_id)}
          />
        )}

        <TabsContent value="description" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vacancy Description</CardTitle>
            </CardHeader>
            <CardContent>
              {job.description ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: job.description }}
                />
              ) : (
                <p className="text-muted-foreground">No description provided.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>Recent activity on this job</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Activity timeline coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vacancy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{job.title}"? This action cannot be undone.
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

      {job.status === 'open' && (
        <>
          {(job as any).is_internal_apply && (
            <InternalApplyDialog
              open={applyDialogOpen}
              onOpenChange={setApplyDialogOpen}
              vacancy={{ id: job.id, title: job.title }}
            />
          )}
          <ShareVacancyDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            vacancy={{
              id: job.id,
              title: job.title,
              slug: job.slug,
              location: job.location,
              employment_type: job.employment_type,
              work_model: job.work_model,
            }}
          />
        </>
      )}

      {/* Assignment Template Details Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              {selectedTemplate.type && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <p className="mt-0.5 text-sm capitalize">{selectedTemplate.type}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Instructions</p>
                <p className="mt-0.5 text-sm whitespace-pre-wrap">{selectedTemplate.instructions}</p>
              </div>
              {selectedTemplate.recommended_effort && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recommended Effort</p>
                  <p className="mt-0.5 text-sm">{selectedTemplate.recommended_effort}</p>
                </div>
              )}
              {selectedTemplate.default_deadline_hours && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Default Deadline</p>
                  <p className="mt-0.5 text-sm">{selectedTemplate.default_deadline_hours} hours</p>
                </div>
              )}
              {selectedTemplate.expected_deliverables && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expected Deliverables</p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">
                    {typeof selectedTemplate.expected_deliverables === 'string'
                      ? selectedTemplate.expected_deliverables
                      : JSON.stringify(selectedTemplate.expected_deliverables, null, 2)}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
