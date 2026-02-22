import { useQuery } from '@tanstack/react-query';
import { useAgentApi } from '@/hooks/useAgentApi';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, FileStack, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  submitted: 'bg-blue-100 text-blue-800',
  in_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-emerald-100 text-emerald-800',
};

const AgentApplicationsPage = () => {
  const { orgCode } = useParams<{ orgCode: string }>();
  const navigate = useNavigate();
  const { agentFetch } = useAgentApi();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['agent-applications'],
    queryFn: () => agentFetch('list-applications'),
  });

  const applications = (data?.applications || []).filter((a: any) =>
    !search ||
    a.crm_services?.name?.toLowerCase().includes(search.toLowerCase()) ||
    `${a.partner_customers?.first_name} ${a.partner_customers?.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
        <p className="text-muted-foreground">Track all service applications</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search applications..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileStack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No applications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app: any) => (
            <Card
              key={app.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/agent/${orgCode}/applications/${app.id}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{app.crm_services?.name || 'Unknown Service'}</p>
                    <p className="text-sm text-muted-foreground">
                      Customer: {app.partner_customers?.first_name} {app.partner_customers?.last_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={statusColors[app.status] || ''}>
                      {app.status?.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {app.created_at ? format(new Date(app.created_at), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentApplicationsPage;
