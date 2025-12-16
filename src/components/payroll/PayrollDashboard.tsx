import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLegalEntities, usePayrollProfiles, usePayrollRuns } from "@/services/usePayroll";
import { Building2, Calculator, Clock, DollarSign, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const PayrollDashboard = () => {
  const { data: legalEntities, isLoading: entitiesLoading } = useLegalEntities();
  const { data: profiles, isLoading: profilesLoading } = usePayrollProfiles();
  const { data: runs, isLoading: runsLoading } = usePayrollRuns();

  const recentRuns = runs?.slice(0, 5) || [];
  const completedRuns = runs?.filter(r => r.status === 'locked') || [];
  const pendingRuns = runs?.filter(r => r.status === 'draft' || r.status === 'calculated') || [];

  const totalNetPay = completedRuns.reduce((sum, run) => sum + (run.summary_totals?.total_net_pay || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'locked': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'calculated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRunLabel = (run: typeof runs[0]) => {
    return `${format(new Date(run.period_start), 'MMM yyyy')} Payroll`;
  };

  if (entitiesLoading || profilesLoading || runsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Legal Entities</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{legalEntities?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registered entities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payroll Profiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profiles?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active profiles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Runs</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRuns.length}</div>
            <p className="text-xs text-muted-foreground">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalNetPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">All completed runs</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Runs & Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Payroll Runs
            </CardTitle>
            <CardDescription>Latest payroll processing activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payroll runs yet. Create your first run to get started.
              </p>
            ) : (
              <div className="space-y-4">
                {recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{getRunLabel(run)}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(run.period_start), 'MMM d')} - {format(new Date(run.period_end), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge className={getStatusColor(run.status)}>
                      {run.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRuns.length > 0 ? (
                pendingRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{getRunLabel(run)}</p>
                      <p className="text-sm text-muted-foreground">
                        {run.status === 'draft' ? 'Ready to calculate' : 'Awaiting approval'}
                      </p>
                    </div>
                    <Badge className={getStatusColor(run.status)}>
                      {run.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pending actions
                </p>
              )}

              {(legalEntities?.length || 0) === 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Setup required:</strong> Create a legal entity to start processing payroll.
                  </p>
                </div>
              )}

              {(profiles?.length || 0) === 0 && (legalEntities?.length || 0) > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Setup required:</strong> Create a payroll profile to configure pay schedules.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
