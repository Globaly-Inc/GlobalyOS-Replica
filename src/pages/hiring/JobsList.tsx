import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgLink } from '@/components/OrgLink';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useJobs, useApplications } from '@/services/useHiring';
import { useUpdateJob } from '@/services/useHiringMutations';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { JobStatus, getJobStatusLabel, getJobStatusColor } from '@/types/hiring';
import { 
  Plus, 
  Search, 
  MapPin,
  Building,
  Users,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  Pause,
  Play,
  Archive,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface JobsListProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  statusFilter?: JobStatus | 'all';
  onStatusFilterChange?: (value: JobStatus | 'all') => void;
}

export default function JobsList({
  searchQuery = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
}: JobsListProps) {
  const { navigateOrg } = useOrgNavigation();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const { data: jobs, isLoading } = useJobs(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );
  const updateJob = useUpdateJob();

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string; status: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredJobs = jobs?.filter((job) => {
    const departmentName = typeof job.department === 'object' ? job.department?.name : job.department;
    return (
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      departmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  const handleStatusChange = async (jobId: string, newStatus: JobStatus) => {
    try {
      await updateJob.mutateAsync({ jobId, input: { status: newStatus } });
      toast.success(`Job status updated to ${getJobStatusLabel(newStatus)}`);
    } catch (error) {
      toast.error('Failed to update job status');
    }
  };

  const handleDeleteClick = (job: { id: string; title: string; status: string; _count?: { candidate_applications?: number } }) => {
    if (job.status !== 'draft' && ((job as any).candidate_applications?.[0]?.count || 0) > 0) {
      toast.error('Remove all candidates before deleting this vacancy');
      return;
    }
    setDeleteTarget({ id: job.id, title: job.title, status: job.status });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !currentOrg?.id) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', deleteTarget.id)
        .eq('organization_id', currentOrg.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['hiring', 'jobs'] });
      toast.success('Vacancy deleted');
    } catch (error) {
      toast.error('Failed to delete vacancy');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Mobile Filters */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vacancies..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusFilterChange?.(value as JobStatus | 'all')}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const departmentName = typeof job.department === 'object' ? job.department?.name : job.department;
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div>
                          <OrgLink
                            to={`/hiring/jobs/${job.slug}`}
                            className="text-lg font-semibold hover:text-primary transition-colors"
                          >
                            {job.title}
                          </OrgLink>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                            {departmentName && (
                              <span className="flex items-center gap-1">
                                <Building className="h-3.5 w-3.5" />
                                {departmentName}
                              </span>
                            )}
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(job.created_at), 'MMM d, yyyy')}
                          </span>
                            <Badge className={getJobStatusColor(job.status)}>
                              {getJobStatusLabel(job.status)}
                            </Badge>
                            {job.employment_type && (
                              <Badge variant="outline">{job.employment_type}</Badge>
                            )}
                            {job.work_model && (
                              <Badge variant="outline">{job.work_model}</Badge>
                            )}
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {(job as any).candidate_applications?.[0]?.count || 0} candidates
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {job.status === 'draft' ? (
                        <Button size="sm" onClick={() => handleStatusChange(job.id, 'open' as JobStatus)}>
                          <Play className="h-4 w-4 mr-1" />
                          Publish Vacancy
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" asChild>
                          <OrgLink to={`/hiring/jobs/${job.slug}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Pipeline
                          </OrgLink>
                        </Button>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9 p-0" asChild>
                            <OrgLink to={`/hiring/jobs/${job.slug}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </OrgLink>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit Vacancy</TooltipContent>
                      </Tooltip>
                      {job.status === 'open' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => handleStatusChange(job.id, 'paused')}>
                              <Pause className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Pause Vacancy</TooltipContent>
                        </Tooltip>
                      )}
                      {job.status === 'paused' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => handleStatusChange(job.id, 'open')}>
                              <Play className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Resume Vacancy</TooltipContent>
                        </Tooltip>
                      )}
                      {(job.status === 'open' || job.status === 'paused') && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => handleStatusChange(job.id, 'closed')}>
                              <Archive className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Close Vacancy</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteClick(job)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete Vacancy</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No vacancies found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first vacancy to start hiring'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button asChild>
                <OrgLink to="/hiring/jobs/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job Vacancy
                </OrgLink>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>

    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vacancy</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
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
