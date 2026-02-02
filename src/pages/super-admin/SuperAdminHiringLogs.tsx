/**
 * Super Admin Hiring Activity Logs
 * Observability view for hiring activity across all organizations
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Search,
  RefreshCw,
  Building2,
  User,
  Briefcase,
  UserCheck,
  FileText,
  Calendar,
  Star,
  Gift,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface HiringActivityLog {
  id: string;
  organization_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  organization?: { name: string };
  actor?: { full_name: string };
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  job_created: <Briefcase className="h-4 w-4" />,
  job_published: <Briefcase className="h-4 w-4 text-primary" />,
  job_closed: <Briefcase className="h-4 w-4 text-muted-foreground" />,
  application_created: <UserCheck className="h-4 w-4 text-primary" />,
  stage_changed: <Activity className="h-4 w-4" />,
  rejected: <UserCheck className="h-4 w-4 text-destructive" />,
  interview_scheduled: <Calendar className="h-4 w-4 text-primary" />,
  scorecard_submitted: <Star className="h-4 w-4 text-accent-foreground" />,
  offer_created: <Gift className="h-4 w-4 text-primary" />,
  assignment_assigned: <FileText className="h-4 w-4 text-muted-foreground" />,
  assignment_submitted: <FileText className="h-4 w-4 text-primary" />,
  hired: <UserCheck className="h-4 w-4 text-primary" />,
  candidate_created: <User className="h-4 w-4 text-primary" />,
};

const ACTION_LABELS: Record<string, string> = {
  job_created: 'Job Created',
  job_published: 'Job Published',
  job_closed: 'Job Closed',
  job_approved: 'Job Approved',
  application_created: 'Application Received',
  stage_changed: 'Stage Changed',
  rejected: 'Rejected',
  interview_scheduled: 'Interview Scheduled',
  interview_completed: 'Interview Completed',
  scorecard_submitted: 'Scorecard Submitted',
  offer_created: 'Offer Created',
  offer_sent: 'Offer Sent',
  offer_accepted: 'Offer Accepted',
  offer_declined: 'Offer Declined',
  hired: 'Hired',
  assignment_assigned: 'Assignment Assigned',
  assignment_submitted: 'Assignment Submitted',
  assignment_reviewed: 'Assignment Reviewed',
  candidate_created: 'Candidate Created',
  email_sent: 'Email Sent',
  note_added: 'Note Added',
  rating_updated: 'Rating Updated',
};

export default function SuperAdminHiringLogs() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [limit, setLimit] = useState(50);

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['super-admin-hiring-logs', actionFilter, limit],
    queryFn: async (): Promise<HiringActivityLog[]> => {
      let query = supabase
        .from('hiring_activity_logs')
        .select(`
          id,
          organization_id,
          action,
          entity_type,
          entity_id,
          actor_id,
          details,
          created_at,
          organization:organizations(name),
          actor:profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as HiringActivityLog[];
    },
  });

  // Get unique action types for filter
  const actionTypes = Object.keys(ACTION_LABELS);

  // Filter by search
  const filteredLogs = logs?.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.entity_type?.toLowerCase().includes(searchLower) ||
      log.organization?.name?.toLowerCase().includes(searchLower) ||
      log.actor?.full_name?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const stats = {
    total: logs?.length || 0,
    today: logs?.filter((l) => {
      const today = new Date();
      const logDate = new Date(l.created_at);
      return logDate.toDateString() === today.toDateString();
    }).length || 0,
    jobs: logs?.filter((l) => l.entity_type === 'job').length || 0,
    applications: logs?.filter((l) => l.entity_type === 'application').length || 0,
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hiring Activity Logs</h1>
            <p className="text-muted-foreground">
              Monitor hiring activity across all organizations
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.today}</p>
                  <p className="text-sm text-muted-foreground">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Briefcase className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.jobs}</p>
                  <p className="text-sm text-muted-foreground">Job Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.applications}</p>
                  <p className="text-sm text-muted-foreground">Application Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by action, entity, organization..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACTION_LABELS[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="200">200 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hiring activity logs found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ACTION_ICONS[log.action] || <Activity className="h-4 w-4" />}
                          <Badge variant="outline">
                            {ACTION_LABELS[log.action] || log.action}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {log.organization?.name || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {log.actor?.full_name || 'System'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {log.entity_type}: {log.entity_id?.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.details && (
                          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate block">
                            {JSON.stringify(log.details).slice(0, 50)}...
                          </code>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), 'MMM d, HH:mm')}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
}
