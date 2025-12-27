import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ChevronLeft, 
  History, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  FileText,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface KpiGenerationJob {
  id: string;
  organization_id: string;
  status: string;
  progress: number;
  progress_message: string | null;
  config: any;
  generated_kpis: any[] | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

const KpiGenerationHistory = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { buildOrgPath } = useOrgNavigation();
  const { currentOrg } = useOrganization();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    searchParams.get("jobId")
  );

  // Fetch all generation jobs for this org
  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ["kpi-generation-jobs", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const { data, error } = await supabase
        .from("kpi_generation_jobs")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as KpiGenerationJob[];
    },
    enabled: !!currentOrg?.id,
    refetchInterval: 5000, // Refresh every 5 seconds to show progress
  });

  const selectedJob = jobs?.find(j => j.id === selectedJobId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="bg-primary/10 text-primary">Processing</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const formatJobDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return dateStr;
    }
  };

  const getJobSummary = (job: KpiGenerationJob) => {
    const config = job.config as any;
    const parts: string[] = [];
    
    if (config?.periodType === "annual") {
      parts.push(`FY ${config.year}`);
    } else {
      parts.push(`Q${config.quarter} ${config.year}`);
    }
    
    const kpiCount = job.generated_kpis?.length || 0;
    if (kpiCount > 0) {
      parts.push(`${kpiCount} KPIs`);
    }
    
    return parts.join(" • ");
  };

  const handleUseKpis = (job: KpiGenerationJob) => {
    // Navigate to bulk create with pre-loaded KPIs from this job
    navigate(buildOrgPath(`/kpi/bulk-create?loadJobId=${job.id}`));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pt-4 pb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(buildOrgPath("/kpi-dashboard"))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <History className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">KPI Generation History</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Generation Jobs</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Past AI-powered KPI generation runs
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : jobs?.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No generation jobs yet</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate(buildOrgPath("/kpi/bulk-create"))}
                    className="mt-2"
                  >
                    Create your first bulk KPIs
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {jobs?.map(job => (
                    <button
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                        selectedJobId === job.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(job.status)}
                          <span className="font-medium text-sm">
                            {getJobSummary(job)}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </div>
                      {job.status === "processing" && (
                        <div className="mt-2">
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {job.progress_message || `${job.progress}%`}
                          </p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Job Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedJob ? (
              <div className="space-y-6">
                {/* Status Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(selectedJob.status)}
                    <span className="text-sm text-muted-foreground">
                      {formatJobDate(selectedJob.created_at)}
                    </span>
                  </div>
                  {selectedJob.status === "completed" && selectedJob.generated_kpis?.length > 0 && (
                    <Button onClick={() => handleUseKpis(selectedJob)}>
                      Use These KPIs
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>

                {/* Progress for processing jobs */}
                {selectedJob.status === "processing" && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{selectedJob.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${selectedJob.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {selectedJob.progress_message || "Processing..."}
                    </p>
                  </div>
                )}

                {/* Error message */}
                {selectedJob.status === "failed" && selectedJob.error_message && (
                  <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive">Generation Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedJob.error_message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Config Summary */}
                <div className="space-y-3">
                  <h4 className="font-medium">Configuration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Period:</span>
                      <span className="ml-2">
                        {selectedJob.config?.periodType === "annual" 
                          ? `FY ${selectedJob.config?.year}`
                          : `Q${selectedJob.config?.quarter} ${selectedJob.config?.year}`
                        }
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Breakdown:</span>
                      <span className="ml-2">
                        {selectedJob.config?.quarterlyBreakdown ? "Quarterly" : "None"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedJob.config?.cascadeConfig?.includeOrganization && (
                      <Badge variant="outline">Organization</Badge>
                    )}
                    {selectedJob.config?.cascadeConfig?.includeDepartments && (
                      <Badge variant="outline">Departments</Badge>
                    )}
                    {selectedJob.config?.cascadeConfig?.includeProjects && (
                      <Badge variant="outline">Projects</Badge>
                    )}
                    {selectedJob.config?.cascadeConfig?.includeOffices && (
                      <Badge variant="outline">Offices</Badge>
                    )}
                    {selectedJob.config?.cascadeConfig?.includeIndividuals && (
                      <Badge variant="outline">Individuals</Badge>
                    )}
                  </div>
                </div>

                {/* Generated KPIs Summary */}
                {selectedJob.generated_kpis && selectedJob.generated_kpis.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">
                      Generated KPIs ({selectedJob.generated_kpis.length})
                    </h4>
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <div className="divide-y">
                        {selectedJob.generated_kpis.map((kpi: any, idx: number) => (
                          <div key={idx} className="p-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs capitalize">
                                {kpi.scopeType}
                              </Badge>
                              <span className="font-medium truncate">{kpi.title}</span>
                            </div>
                            <p className="text-muted-foreground text-xs mt-1 truncate">
                              Target: {kpi.targetValue} {kpi.unit}
                              {kpi.scopeValue && ` • ${kpi.scopeValue}`}
                              {kpi.employeeName && ` • ${kpi.employeeName}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Timing */}
                <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
                  <div>Created: {formatJobDate(selectedJob.created_at)}</div>
                  {selectedJob.started_at && (
                    <div>Started: {formatJobDate(selectedJob.started_at)}</div>
                  )}
                  {selectedJob.completed_at && (
                    <div>Completed: {formatJobDate(selectedJob.completed_at)}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a job to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KpiGenerationHistory;
