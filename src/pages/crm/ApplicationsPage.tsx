import { useState } from 'react';
import { Search, Plus, MoreHorizontal, FileStack, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageBody } from '@/components/ui/page-body';
import { useServiceApplications } from '@/services/useCRMServices';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import type { ServiceApplication } from '@/types/crm-services';
import { format } from 'date-fns';

const statusColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  submitted: 'secondary',
  in_review: 'default',
  approved: 'default',
  rejected: 'destructive',
  completed: 'secondary',
};

const priorityColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  low: 'outline',
  medium: 'secondary',
  high: 'destructive',
};

const ApplicationsPage = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { navigateOrg } = useOrgNavigation();

  const { data, isLoading } = useServiceApplications({
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    per_page: 20,
  });

  const applications = data?.data || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const getApplicantName = (app: ServiceApplication) => {
    if (app.crm_contact) return `${app.crm_contact.first_name} ${app.crm_contact.last_name || ''}`.trim();
    if (app.agent_partner) return `via ${app.agent_partner.name}`;
    return '—';
  };

  return (
    <PageBody>
      <div className="space-y-6 pt-4 md:pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileStack className="h-6 w-6" />
              Service Applications
            </h1>
            <p className="text-muted-foreground hidden md:block">Track and manage service applications</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="hidden md:table-cell">Applicant</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Priority</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : applications.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No applications found</TableCell></TableRow>
              ) : (
                applications.map((app) => (
                  <TableRow key={app.id} className="cursor-pointer" onClick={() => navigateOrg(`/crm/applications/${app.id}`)}>
                    <TableCell>
                      <p className="font-medium">{app.service?.name || '—'}</p>
                      {app.service?.category && <p className="text-xs text-muted-foreground">{app.service.category}</p>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{getApplicantName(app)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs capitalize">{app.created_by_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[app.status] || 'outline'} className="capitalize">{app.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={priorityColors[app.priority] || 'outline'} className="capitalize">{app.priority}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {format(new Date(app.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigateOrg(`/crm/applications/${app.id}`)}><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{totalCount} applications total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </PageBody>
  );
};

export default ApplicationsPage;
