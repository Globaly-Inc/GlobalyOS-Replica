import { useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { GitBranch, Search, Settings, UserPlus, UserMinus, Clock, CheckCircle2 } from "lucide-react";
import { useAllWorkflows, useWorkflowRealtime } from "@/services/useWorkflows";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { OrgLink } from "@/components/OrgLink";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowStatus, WorkflowType } from "@/types/workflow";

export default function Workflows() {
  const navigate = useNavigate();
  const { orgCode } = useParams<{ orgCode: string }>();
  const { isOwner, isAdmin, isHR, loading: roleLoading } = useUserRole();
  const { orgCode: navOrgCode } = useOrgNavigation();
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('active');
  const [typeFilter, setTypeFilter] = useState<WorkflowType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Enable realtime updates
  useWorkflowRealtime();
  
  const { data: workflows, isLoading } = useAllWorkflows({
    status: statusFilter,
    type: typeFilter,
    search: searchQuery,
  });
  
  const activeCount = workflows?.filter(w => w.status === 'active').length ?? 0;
  const completedCount = workflows?.filter(w => w.status === 'completed').length ?? 0;
  
  const handleWorkflowClick = (workflowId: string) => {
    navigate(`/org/${orgCode}/workflows/${workflowId}`);
  };
  
  // Loading state
  if (roleLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <PageHeader title="HR Workflows" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  // Only admin/HR can access
  if (!isOwner && !isAdmin && !isHR) {
    return <Navigate to={`/org/${navOrgCode}`} replace />;
  }
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader 
          title="HR Workflows" 
          subtitle="Manage onboarding and offboarding workflows across your organization"
        />
        <OrgLink to="/settings">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </OrgLink>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkflowStatus | 'all')}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabsList>
                <TabsTrigger value="active" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Active
                  {activeCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                  {completedCount > 0 && (
                    <Badge variant="secondary" className="ml-1">{completedCount}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as WorkflowType | 'all')}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="onboarding">
                      <span className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Onboarding
                      </span>
                    </SelectItem>
                    <SelectItem value="offboarding">
                      <span className="flex items-center gap-2">
                        <UserMinus className="h-4 w-4" />
                        Offboarding
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="relative flex-1 sm:w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            
            <TabsContent value={statusFilter} className="mt-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : workflows?.length === 0 ? (
                <EmptyState status={statusFilter} search={searchQuery} />
              ) : (
                <div className="space-y-3">
                  {workflows?.map((workflow: any) => (
                    <WorkflowCard
                      key={workflow.id}
                      workflow={workflow as any}
                      onClick={() => handleWorkflowClick(workflow.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ status, search }: { status: string; search: string }) {
  if (search) {
    return (
      <div className="text-center py-12">
        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">No workflows found</h3>
        <p className="text-muted-foreground mt-1">
          No workflows match "{search}". Try adjusting your search.
        </p>
      </div>
    );
  }
  
  return (
    <div className="text-center py-12">
      <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="font-medium text-lg">
        {status === 'active' ? 'No active workflows' : 
         status === 'completed' ? 'No completed workflows yet' : 
         'No workflows'}
      </h3>
      <p className="text-muted-foreground mt-1 max-w-md mx-auto">
        Workflows are created automatically when:
        <br />• New employees are onboarded (is_new_hire = true)
        <br />• Employees are set for offboarding (last_working_day is set)
      </p>
      <OrgLink to="/settings">
        <Button variant="outline" className="mt-4">
          <Settings className="h-4 w-4 mr-2" />
          Configure workflow templates
        </Button>
      </OrgLink>
    </div>
  );
}
