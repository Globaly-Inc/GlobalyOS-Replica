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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useJobs } from '@/services/useHiring';
import { useUpdateJob } from '@/services/useHiringMutations';
import { JobStatus, getJobStatusLabel, getJobStatusColor } from '@/types/hiring';
import { 
  Plus, 
  Search, 
  MoreHorizontal,
  MapPin,
  Building,
  Users,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  Pause,
  Play,
  Archive
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
  const { data: jobs, isLoading } = useJobs(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );
  const updateJob = useUpdateJob();

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

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }
    // Note: Delete functionality would need to be implemented in mutations
    toast.error('Delete functionality not yet implemented');
  };

  return (
    <div className="space-y-6">
      {/* Mobile Filters */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
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
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-4">
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
                          {job._count?.candidate_applications || 0} candidates
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <OrgLink to={`/hiring/jobs/${job.slug}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View Pipeline
                        </OrgLink>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <OrgLink to={`/hiring/jobs/${job.slug}/edit`} className="flex items-center">
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Job
                            </OrgLink>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {job.status === 'open' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'paused')}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause Job
                            </DropdownMenuItem>
                          )}
                          {job.status === 'paused' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'open')}>
                              <Play className="h-4 w-4 mr-2" />
                              Resume Job
                            </DropdownMenuItem>
                          )}
                          {(job.status === 'open' || job.status === 'paused') && (
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, 'closed')}>
                              <Archive className="h-4 w-4 mr-2" />
                              Close Job
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first job posting to start hiring'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button asChild>
                <OrgLink to="/hiring/jobs/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Job
                </OrgLink>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
