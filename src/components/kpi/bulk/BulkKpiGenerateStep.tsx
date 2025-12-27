import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Loader2, 
  Globe, 
  Building, 
  MapPin, 
  Users,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Rocket
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { updateKpiGenerationState } from "@/components/kpi/KpiGenerationProgress";
import type { BulkKpiWizardState, GeneratedKpi } from "@/pages/BulkKpiCreate";
import { toast } from "sonner";

interface Props {
  state: BulkKpiWizardState;
  updateState: (updates: Partial<BulkKpiWizardState>) => void;
}

// Calculate employee tenure based on join date
const calculateTenure = (joinDate: string | null): "new" | "experienced" | "veteran" => {
  if (!joinDate) return "experienced";
  const months = Math.floor((Date.now() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 6) return "new";
  if (months > 36) return "veteran";
  return "experienced";
};

// Check if a job is stale (processing for >3 minutes without completion)
const isJobStale = (job: any) => {
  if (!job?.started_at || job.status !== 'processing') return false;
  const ageMinutes = (Date.now() - new Date(job.started_at).getTime()) / 60000;
  return ageMinutes > 3;
};

export const BulkKpiGenerateStep = ({ state, updateState }: Props) => {
  const { currentOrg } = useOrganization();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ value: 0, message: "Initializing..." });
  const [existingJobChecked, setExistingJobChecked] = useState(false);

  // Check for existing in-progress jobs on mount
  const { data: existingJob, refetch: refetchExistingJob } = useQuery({
    queryKey: ["existing-kpi-job", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const { data } = await supabase
        .from("kpi_generation_jobs")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!currentOrg?.id && !existingJobChecked,
    staleTime: 0,
  });

  // Auto-subscribe to existing job if found
  useEffect(() => {
    if (existingJob && !jobId && !existingJobChecked) {
      console.log("Found existing job:", existingJob.id, existingJob.status);
      setJobId(existingJob.id);
      setIsGenerating(true);
      setProgress({
        value: existingJob.progress || 0,
        message: existingJob.progress_message || "Resuming previous generation..."
      });
      setExistingJobChecked(true);
    } else if (!existingJob && !existingJobChecked) {
      setExistingJobChecked(true);
    }
  }, [existingJob, jobId, existingJobChecked]);

  // Cancel a stuck job
  const cancelJob = async (jobIdToCancel: string) => {
    try {
      await supabase
        .from("kpi_generation_jobs")
        .update({
          status: 'failed',
          error_message: 'Cancelled by user - job timed out',
          completed_at: new Date().toISOString()
        })
        .eq("id", jobIdToCancel);
      
      setJobId(null);
      setIsGenerating(false);
      setProgress({ value: 0, message: "Initializing..." });
      setError(null);
      refetchExistingJob();
      toast.success("Job cancelled. You can start fresh.");
    } catch (err) {
      console.error("Failed to cancel job:", err);
      toast.error("Failed to cancel job");
    }
  };

  // Fetch organization context with enhanced data
  const { data: orgContext } = useQuery({
    queryKey: ["org-context-for-kpi", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return null;

      // Fetch organization metadata (industry, company_size)
      const { data: orgMetadata } = await supabase
        .from("organizations")
        .select("industry, company_size")
        .eq("id", currentOrg.id)
        .single();

      // Fetch employees with profiles and tenure info
      const { data: employees } = await supabase
        .from("employees")
        .select("id, department, office_id, position, manager_id, join_date, profiles(full_name)")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");

      // Fetch offices
      const { data: offices } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id);

      // Fetch projects with descriptions
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, description")
        .eq("organization_id", currentOrg.id);

      // Fetch employee-project assignments
      const { data: employeeProjects } = await supabase
        .from("employee_projects")
        .select("employee_id, project_id")
        .eq("organization_id", currentOrg.id);

      // Fetch positions with descriptions and responsibilities
      const { data: positions } = await supabase
        .from("positions")
        .select("name, description, responsibilities")
        .eq("organization_id", currentOrg.id);

      // Fetch last year's KPIs for historical context
      const lastYear = new Date().getFullYear() - 1;
      const { data: pastKpis } = await supabase
        .from("kpis")
        .select("title, target_value, current_value, unit, scope_type, scope_department")
        .eq("organization_id", currentOrg.id)
        .eq("year", lastYear)
        .in("scope_type", ["organization", "department"])
        .limit(15);

      // Fetch KPI templates for naming preferences
      const { data: kpiTemplates } = await supabase
        .from("kpi_templates")
        .select("title, description, unit, category")
        .eq("organization_id", currentOrg.id)
        .limit(10);

      const departments = [...new Set(employees?.map(e => e.department).filter(Boolean))];

      return {
        name: currentOrg.name || "Organization",
        industry: orgMetadata?.industry || "General",
        companySize: orgMetadata?.company_size || "Unknown",
        departments: departments as string[],
        offices: offices || [],
        // Truncate project descriptions to reduce payload size
        projects: (projects || []).map(p => ({
          id: p.id,
          name: p.name,
          description: (p.description || "").slice(0, 150),
        })),
        employeeProjects: employeeProjects || [],
        employees: (employees || []).map(e => {
          const positionDetails = positions?.find(p => p.name === e.position);
          return {
            id: e.id,
            name: (e.profiles as any)?.full_name || "Unknown",
            department: e.department || "",
            position: e.position || "",
            // Truncate description to save payload size
            positionDescription: (positionDetails?.description || "").slice(0, 150),
            // Only include top 3 responsibilities, truncated
            positionResponsibilities: (positionDetails?.responsibilities || [])
              .slice(0, 3)
              .map((r: string) => r.slice(0, 100)),
            officeId: e.office_id || "",
            managerId: e.manager_id || "",
            tenure: calculateTenure(e.join_date),
          };
        }),
        // Historical context for realistic targets
        historicalContext: {
          lastYearKpis: (pastKpis || []).slice(0, 10).map(k => ({
            title: (k.title || "").slice(0, 60),
            target: k.target_value,
            achieved: k.current_value,
            unit: k.unit,
            scope: k.scope_department || "Organization"
          }))
        },
        // KPI template preferences for naming conventions
        preferredKpiStyles: (kpiTemplates || []).map(t => ({
          title: (t.title || "").slice(0, 50),
          unit: t.unit,
          category: t.category
        }))
      };
    },
    enabled: !!currentOrg?.id,
  });

  // Subscribe to job updates via Realtime
  useEffect(() => {
    if (!jobId) return;

    console.log("Subscribing to job updates:", jobId);

    const channel = supabase
      .channel(`kpi-job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kpi_generation_jobs',
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const job = payload.new as any;
          console.log("Job update received:", { 
            status: job.status, 
            progress: job.progress, 
            message: job.progress_message 
          });

          setProgress({ 
            value: job.progress || 0, 
            message: job.progress_message || "" 
          });

          if (job.status === 'completed' && job.generated_kpis) {
            const kpisWithSelection: GeneratedKpi[] = job.generated_kpis.map((kpi: any) => ({
              ...kpi,
              selected: true,
            }));
            updateState({ generatedKpis: kpisWithSelection });
            toast.success(`Generated ${kpisWithSelection.length} KPIs`);
            setIsGenerating(false);
            setJobId(null);
          } else if (job.status === 'failed') {
            setError(job.error_message || "Failed to generate KPIs");
            toast.error("Failed to generate KPIs");
            setIsGenerating(false);
            setJobId(null);
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      console.log("Unsubscribing from job updates");
      supabase.removeChannel(channel);
    };
  }, [jobId, updateState]);

  const handleGenerate = async () => {
    if (!orgContext) return;
    
    setIsGenerating(true);
    setError(null);
    setProgress({ value: 0, message: "Starting generation..." });

    try {
      const { data, error: fnError } = await supabase.functions.invoke("start-kpi-generation", {
        body: {
          documentContent: state.documentContent,
          periodType: state.periodType,
          quarter: state.quarter,
          year: state.year,
          quarterlyBreakdown: state.quarterlyBreakdown,
          aiInstructions: state.aiInstructions,
          cascadeConfig: state.cascadeConfig,
          targetDepartments: state.targetDepartments,
          targetProjects: state.targetProjects,
          targetOffices: state.targetOffices,
          targetEmployees: state.targetEmployees,
          organizationContext: orgContext,
        },
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.jobId) {
        console.log("Job started:", data.jobId);
        setJobId(data.jobId);
        setProgress({ value: 5, message: "Job created, waiting for updates..." });
        
        // Store job ID in global state for the floating progress indicator
        updateKpiGenerationState({ jobId: data.jobId });
      } else {
        throw new Error("No job ID returned");
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      
      // Handle specific error types
      if (err.message?.includes("Failed to fetch") || err.message?.includes("timeout") || err.message?.includes("network")) {
        setError("Request timed out. Please try again.");
      } else if (err.message?.includes("Rate limit") || err.message?.includes("429")) {
        setError("AI rate limit reached. Please wait a moment and try again.");
      } else if (err.message?.includes("402") || err.message?.includes("credits")) {
        setError("AI credits exhausted. Please add credits to continue.");
      } else {
        setError(err.message || "Failed to start KPI generation");
      }
      toast.error("Failed to start generation");
      setIsGenerating(false);
    }
  };

  const getScopeIcon = (scopeType: string) => {
    switch (scopeType) {
      case "organization": return Globe;
      case "department": return Building;
      case "project": return Rocket;
      case "office": return MapPin;
      case "individual": return Users;
      default: return Globe;
    }
  };

  const getScopeColor = (scopeType: string) => {
    switch (scopeType) {
      case "organization": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "department": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "project": return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300";
      case "office": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "individual": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      default: return "";
    }
  };

  // Group KPIs by scope type
  const groupedKpis = state.generatedKpis.reduce((acc, kpi) => {
    if (!acc[kpi.scopeType]) acc[kpi.scopeType] = [];
    acc[kpi.scopeType].push(kpi);
    return acc;
  }, {} as Record<string, GeneratedKpi[]>);

  const scopeOrder = ["organization", "department", "project", "office", "individual"];

  return (
    <div className="space-y-6">
      {/* Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 ai-gradient-icon" />
            AI KPI Generation
          </CardTitle>
          <CardDescription>
            Generate hierarchical KPIs based on your configuration
            {state.documentContent && " and uploaded document"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {state.cascadeConfig.includeOrganization && (
              <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Globe className="h-5 w-5 text-purple-600" />
                <span className="text-sm">Organization</span>
              </div>
            )}
            {state.cascadeConfig.includeDepartments && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Building className="h-5 w-5 text-blue-600" />
                <span className="text-sm">Departments</span>
              </div>
            )}
            {state.cascadeConfig.includeProjects && (
              <div className="flex items-center gap-2 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                <Rocket className="h-5 w-5 text-pink-600" />
                <span className="text-sm">Projects</span>
              </div>
            )}
            {state.cascadeConfig.includeOffices && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <MapPin className="h-5 w-5 text-green-600" />
                <span className="text-sm">Offices</span>
              </div>
            )}
            {state.cascadeConfig.includeIndividuals && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Users className="h-5 w-5 text-amber-600" />
                <span className="text-sm">Individuals</span>
              </div>
            )}
          </div>

          {/* Generate Button or Existing Job UI */}
          {state.generatedKpis.length === 0 && !isGenerating && (
            <div className="text-center py-8">
              <Button
                size="lg"
                onClick={handleGenerate}
                className="ai-gradient-border relative"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                Generate KPIs with AI
              </Button>
              {error && (
                <div className="mt-4 text-sm text-destructive flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Loading State with Real-time Progress */}
          {isGenerating && (
            <div className="py-12 text-center space-y-6">
              {/* Stale job warning */}
              {existingJob && isJobStale(existingJob) && (
                <div className="max-w-md mx-auto p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Job appears stuck</span>
                  </div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                    This job has been processing for over 3 minutes without updates.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => cancelJob(existingJob.id)}
                    className="border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  >
                    Cancel & Start Fresh
                  </Button>
                </div>
              )}
              
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <p className="font-medium text-lg">
                  {existingJob ? "Resuming KPI Generation..." : "Generating KPIs..."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {progress.message || "AI is analyzing your organization structure"}
                </p>
              </div>
              <div className="max-w-sm mx-auto space-y-2">
                <Progress value={progress.value} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {progress.value}% complete
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                This may take 1-2 minutes for large organizations
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated KPIs Preview */}
      {state.generatedKpis.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Generated KPIs
                </CardTitle>
                <CardDescription>
                  {state.generatedKpis.length} KPIs generated. Review and edit in the next step.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {scopeOrder.map(scopeType => {
              const kpis = groupedKpis[scopeType];
              if (!kpis?.length) return null;
              
              const Icon = getScopeIcon(scopeType);
              
              return (
                <div key={scopeType} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${getScopeColor(scopeType)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium capitalize">{scopeType} KPIs</h3>
                    <Badge variant="secondary">{kpis.length}</Badge>
                  </div>
                  
                  <div className="grid gap-2 pl-8">
                    {kpis.map(kpi => (
                      <div 
                        key={kpi.tempId}
                        className="flex items-start justify-between p-3 bg-muted/50 rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{kpi.title}</p>
                            {kpi.quarter && (
                              <Badge variant="secondary" className="text-xs">
                                Q{kpi.quarter}
                              </Badge>
                            )}
                            {kpi.isQuarterlyChild && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Quarterly
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {kpi.description}
                          </p>
                          {(kpi.scopeValue || kpi.employeeName || kpi.projectName) && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {kpi.employeeName || kpi.projectName || kpi.scopeValue}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-mono text-sm font-medium">{kpi.targetValue}</p>
                          <p className="text-xs text-muted-foreground">{kpi.unit}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
