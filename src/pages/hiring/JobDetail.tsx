import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrgLink } from '@/components/OrgLink';
import { useJob, useJobStages } from '@/services/useHiring';
import { useHiringApplications } from '@/services';
import { useUpdateJob, useApproveJob } from '@/services/useHiringMutations';
import { getJobStatusLabel, getJobStatusColor, APPLICATION_STAGE_LABELS } from '@/types/hiring';
import { HiringKanbanBoard } from '@/components/hiring/pipeline/HiringKanbanBoard';
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
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Create a local hook to fetch applications for a job
function useJobApplications(jobId: string | undefined) {
  const { useApplications } = require('@/services/useHiring');
  return useApplications(jobId ? { job_id: jobId } : undefined);
}

export default function JobDetail() {
  const { jobSlug } = useParams<{ jobSlug: string }>();
  const { data: job, isLoading: jobLoading } = useJob(jobSlug || '');
  const { data: stages } = useJobStages(job?.id || '');
  const { data: applications, isLoading: applicationsLoading } = useJobApplications(job?.id);
  const updateJob = useUpdateJob();
  const approveJob = useApproveJob();

  const [activeTab, setActiveTab] = useState('pipeline');

  const handleApprove = async () => {
    if (!job) return;
    try {
      await approveJob.mutateAsync(job.id);
      toast.success('Job approved and opened');
    } catch (error) {
      toast.error('Failed to approve job');
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
        <h2 className="text-xl font-semibold mb-2">Job not found</h2>
        <p className="text-muted-foreground mb-4">The job you're looking for doesn't exist.</p>
        <Button asChild>
          <OrgLink to="/hiring/jobs">Back to Jobs</OrgLink>
        </Button>
      </div>
    );
  }

  const departmentName = typeof job.department === 'object' ? job.department?.name : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <OrgLink to="/hiring/jobs">
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
              {departmentName && (
                <span className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {departmentName}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {format(new Date(job.created_at), 'MMM d, yyyy')}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {applications?.length || 0} candidates
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
          <Button variant="outline" asChild>
            <OrgLink to={`/hiring/jobs/${job.slug}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </OrgLink>
          </Button>
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

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

        <TabsContent value="description" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
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
    </div>
  );
}
