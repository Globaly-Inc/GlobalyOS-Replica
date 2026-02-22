import { useQuery } from '@tanstack/react-query';
import { useAgentAuth } from '@/hooks/useAgentAuth';
import { useAgentApi } from '@/hooks/useAgentApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileStack, Users, Package, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AgentDashboardPage = () => {
  const { user } = useAgentAuth();
  const { agentFetch } = useAgentApi();

  const { data, isLoading } = useQuery({
    queryKey: ['agent-dashboard'],
    queryFn: () => agentFetch('dashboard'),
  });

  const stats = [
    {
      label: 'Total Applications',
      value: data?.applications?.total || 0,
      icon: FileStack,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      label: 'My Customers',
      value: data?.customers?.total || 0,
      icon: Users,
      color: 'text-green-600 bg-green-100',
    },
    {
      label: 'In Review',
      value: data?.applications?.by_status?.in_review || 0,
      icon: Clock,
      color: 'text-amber-600 bg-amber-100',
    },
    {
      label: 'Completed',
      value: data?.applications?.by_status?.completed || 0,
      icon: Package,
      color: 'text-emerald-600 bg-emerald-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.full_name || user?.email}
        </h1>
        <p className="text-muted-foreground mt-1">
          {user?.partner_name} — Agent Dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AgentDashboardPage;
