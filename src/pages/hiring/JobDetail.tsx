import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { OrgLink } from '@/components/OrgLink';
import { useJob, useJobStages, useApplications } from '@/services/useHiring';
import { useHiringApplications } from '@/services';
import { useUpdateJob, useApproveJob } from '@/services/useHiringMutations';
import type { JobStatus } from '@/types/hiring';
import { getJobStatusLabel, getJobStatusColor, APPLICATION_STAGE_LABELS } from '@/types/hiring';
import { countryToFlag } from '@/utils/countryFlag';
import { HiringKanbanBoard } from '@/components/hiring/pipeline/HiringKanbanBoard';
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
  CheckCircle,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Archive,
  Trash2,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

function useJobApplications(jobId: string | undefined) {
  return useApplications(jobId ? { job_id: jobId } : undefined);
}

export default function JobDetail() {
  const { jobSlug } = useParams<{ jobSlug: string }>();
  const { navigateOrg } = useOrgNavigation();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { data: job, isLoading: jobLoading } = useJob(jobSlug || '');
  const { data: stages } = useJobStages(job?.id || '');
  const { data: applications, isLoading: applicationsLoading } = useJobApplications(job?.id);
  const updateJob = useUpdateJob();
  const approveJob = useApproveJob();

  const isDraft = job?.status === 'draft';
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  const resolvedTab = activeTab ?? (isDraft ? 'description' : 'pipeline');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleApprove = async () => {
    if (!job) return;
    try {
      await approveJob.mutateAsync(job.id);
      toast.success('Job vacancy approved and opened');
    } catch (error) {
      toast.error('Failed to approve job');
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <OrgLink to="/hiring?tab=jobs">
              <ArrowLeft className="h-4 w-4" />
            </OrgLink>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
              <Badge className={getJobStatusColor(job.status)}>
                {getJobStatusLabel(job.status)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              {(() => {
                const city = job.location || (job as any).office?.city;
                const country = (job as any).office?.country;
                const locationText = [city, country].filter(Boolean).join(', ');
                const flag = countryToFlag(country);
                if (!locationText) return null;
                return (
                  <span className="flex items-center gap-1">
                    {flag ? <span className="text-base">{flag}</span> : <MapPin className="h-4 w-4" />}
                    {locationText}
                  </span>
                );
              })()}
              {departmentName && (
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {departmentName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {job.work_model ? job.work_model.charAt(0).toUpperCase() + job.work_model.slice(1) : 'On-site'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {job.employment_type ? job.employment_type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Full-time'}
              </span>
              {(job as any).application_close_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Apply by {new Date((job as any).application_close_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {candidateCount} candidates
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {job.status === 'submitted' && (
            <Button onClick={handleApprove} disabled={approveJob.isPending}>
              {approveJob.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approve & Open
            </Button>
          )}
          {isDraft && (
            <Button onClick={() => handleStatusChange('open')}>
              <Globe className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
          {job.is_public_visible && (
            <Button variant="outline" asChild>
              <a
                href={`/careers/${job.organization_id}/${job.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public Page
              </a>
            </Button>
          )}
          {!isClosed && (
            <Button variant="outline" asChild>
              <OrgLink to={`/hiring/jobs/${job.slug}/edit`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </OrgLink>
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
                <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Vacancy
                </DropdownMenuItem>
              )}
              {job.status === 'paused' && (
                <DropdownMenuItem onClick={() => handleStatusChange('open')}>
                  <Play className="h-4 w-4 mr-2" />
                  Resume Vacancy
                </DropdownMenuItem>
              )}
              {(job.status === 'open' || job.status === 'paused') && (
                <DropdownMenuItem onClick={() => handleStatusChange('closed')}>
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

      {/* Job Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Employment Type</p>
              <p className="mt-1 font-medium capitalize">{job.employment_type?.replace('_', ' ') || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Work Model</p>
              <p className="mt-1 font-medium capitalize">{job.work_model || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Positions</p>
              <p className="mt-1 font-medium">{job.headcount || 1}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Salary Range</p>
              <p className="mt-1 font-medium">
                {job.salary_min && job.salary_max ? (
                  <>
                    {job.salary_currency} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                  </>
                ) : (
                  'Not specified'
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={resolvedTab} onValueChange={setActiveTab}>
        <TabsList>
          {!isDraft && <TabsTrigger value="pipeline">Pipeline</TabsTrigger>}
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

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
              />
            )}
          </TabsContent>
        )}

        <TabsContent value="description" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vacancy Description</CardTitle>
            </CardHeader>
            <CardContent>
              {job.description ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans">{job.description}</pre>
                </div>
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
    </div>
  );
}
