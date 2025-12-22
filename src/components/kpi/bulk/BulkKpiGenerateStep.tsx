import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { BulkKpiWizardState, GeneratedKpi } from "@/pages/BulkKpiCreate";
import { toast } from "sonner";

interface Props {
  state: BulkKpiWizardState;
  updateState: (updates: Partial<BulkKpiWizardState>) => void;
}

export const BulkKpiGenerateStep = ({ state, updateState }: Props) => {
  const { currentOrg } = useOrganization();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch organization context
  const { data: orgContext } = useQuery({
    queryKey: ["org-context-for-kpi", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return null;

      // Fetch employees with profiles
      const { data: employees } = await supabase
        .from("employees")
        .select("id, department, office_id, position, profiles(full_name)")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");

      // Fetch offices
      const { data: offices } = await supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id);

      // Fetch projects
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg.id);

      // Fetch employee-project assignments
      const { data: employeeProjects } = await supabase
        .from("employee_projects")
        .select("employee_id, project_id")
        .eq("organization_id", currentOrg.id);

      const departments = [...new Set(employees?.map(e => e.department).filter(Boolean))];

      return {
        name: currentOrg.name || "Organization",
        departments: departments as string[],
        offices: offices || [],
        projects: projects || [],
        employeeProjects: employeeProjects || [],
        employees: (employees || []).map(e => ({
          id: e.id,
          name: (e.profiles as any)?.full_name || "Unknown",
          department: e.department || "",
          position: e.position || "",
          officeId: e.office_id || "",
        })),
      };
    },
    enabled: !!currentOrg?.id,
  });

  const handleGenerate = async () => {
    if (!orgContext) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bulk-generate-kpis", {
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

      const kpisWithSelection: GeneratedKpi[] = (data.kpis || []).map((kpi: any) => ({
        ...kpi,
        selected: true,
      }));

      updateState({ generatedKpis: kpisWithSelection });
      toast.success(`Generated ${kpisWithSelection.length} KPIs`);
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate KPIs");
      toast.error("Failed to generate KPIs");
    } finally {
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

          {/* Generate Button */}
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

          {/* Loading State */}
          {isGenerating && (
            <div className="py-12 text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
              </div>
              <div>
                <p className="font-medium">Generating KPIs...</p>
                <p className="text-sm text-muted-foreground">
                  AI is analyzing your organization structure
                  {state.documentContent && " and document"}
                </p>
              </div>
              <Progress value={33} className="w-64 mx-auto" />
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
