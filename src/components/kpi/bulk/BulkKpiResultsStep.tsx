import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  Building,
  MapPin,
  Users,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { sendKpiNotifications } from "@/services/kpiNotifications";
import type { BulkKpiWizardState, GeneratedKpi } from "@/pages/BulkKpiCreate";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { addDays, nextMonday, setHours, setMinutes, setSeconds } from "date-fns";

interface Props {
  state: BulkKpiWizardState;
  updateState: (updates: Partial<BulkKpiWizardState>) => void;
}

interface CreatedKpiMapping {
  tempId: string;
  realId: string;
}

export const BulkKpiResultsStep = ({ state, updateState }: Props) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee, isLoading: isEmployeeLoading } = useCurrentEmployee();
  const queryClient = useQueryClient();
  
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState("");
  const [createdMappings, setCreatedMappings] = useState<CreatedKpiMapping[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  // Guard ref to prevent double execution
  const hasStartedRef = useRef(false);

  const selectedKpis = state.generatedKpis.filter(k => k.selected);

  // Check if data is ready
  const isDataReady = !!currentOrg?.id && !!currentEmployee?.id;

  // Auto-start creation when step loads and data is ready
  useEffect(() => {
    if (
      isDataReady && 
      !isCreating && 
      !completed && 
      selectedKpis.length > 0 && 
      !hasStartedRef.current
    ) {
      hasStartedRef.current = true;
      createKpis();
    }
  }, [isDataReady, isCreating, completed, selectedKpis.length]);

  // Calculate next biweekly reminder (next Monday at 9 AM, at least 2 weeks out)
  const calculateNextBiweeklyReminder = (): string => {
    const now = new Date();
    let nextDate = nextMonday(now);
    // Ensure it's at least 2 weeks out
    nextDate = addDays(nextDate, 14);
    // Set to 9 AM
    nextDate = setHours(setMinutes(setSeconds(nextDate, 0), 0), 9);
    return nextDate.toISOString();
  };

  // Find managers for a group KPI based on scope
  const findGroupKpiOwners = async (
    kpi: GeneratedKpi,
    organizationId: string
  ): Promise<string[]> => {
    const ownerIds: string[] = [];

    try {
      if (kpi.scopeType === "department" && kpi.scopeValue) {
        // Find employees in this department who have direct reports (are managers)
        const { data: deptEmployees } = await supabase
          .from("employees")
          .select("id, manager_id")
          .eq("organization_id", organizationId)
          .eq("department", kpi.scopeValue)
          .eq("status", "active");

        if (deptEmployees && deptEmployees.length > 0) {
          // Get unique manager IDs within the department
          const managerIds = [...new Set(
            deptEmployees
              .map(e => e.manager_id)
              .filter(Boolean) as string[]
          )];

          // Also find employees in the department who manage others
          const employeeIds = deptEmployees.map(e => e.id);
          const { data: managersInDept } = await supabase
            .from("employees")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("department", kpi.scopeValue)
            .eq("status", "active")
            .in("id", managerIds);

          if (managersInDept) {
            managersInDept.forEach(m => {
              if (!ownerIds.includes(m.id)) ownerIds.push(m.id);
            });
          }

          // If no managers found in dept, add managers of dept employees
          if (ownerIds.length === 0 && managerIds.length > 0) {
            managerIds.slice(0, 3).forEach(id => {
              if (!ownerIds.includes(id)) ownerIds.push(id);
            });
          }
        }
      } else if (kpi.scopeType === "office" && kpi.scopeId) {
        // Find managers of employees in this office
        const { data: officeEmployees } = await supabase
          .from("employees")
          .select("id, manager_id")
          .eq("organization_id", organizationId)
          .eq("office_id", kpi.scopeId)
          .eq("status", "active");

        if (officeEmployees && officeEmployees.length > 0) {
          const managerIds = [...new Set(
            officeEmployees
              .map(e => e.manager_id)
              .filter(Boolean) as string[]
          )];

          // Find managers who are also in this office
          const employeeIds = officeEmployees.map(e => e.id);
          const managersInOffice = managerIds.filter(mid => employeeIds.includes(mid));

          if (managersInOffice.length > 0) {
            managersInOffice.slice(0, 3).forEach(id => {
              if (!ownerIds.includes(id)) ownerIds.push(id);
            });
          } else if (managerIds.length > 0) {
            // Fallback to managers of office employees
            managerIds.slice(0, 3).forEach(id => {
              if (!ownerIds.includes(id)) ownerIds.push(id);
            });
          }
        }
      } else if (kpi.scopeType === "project" && kpi.scopeId) {
        // Find managers of project members
        const { data: projectMembers } = await supabase
          .from("employee_projects")
          .select("employee_id")
          .eq("project_id", kpi.scopeId);

        if (projectMembers && projectMembers.length > 0) {
          const memberIds = projectMembers.map(pm => pm.employee_id);

          const { data: members } = await supabase
            .from("employees")
            .select("id, manager_id")
            .in("id", memberIds)
            .eq("status", "active");

          if (members) {
            const managerIds = [...new Set(
              members
                .map(e => e.manager_id)
                .filter(Boolean) as string[]
            )];

            // Find managers who are also project members
            const managersInProject = managerIds.filter(mid => memberIds.includes(mid));

            if (managersInProject.length > 0) {
              managersInProject.slice(0, 3).forEach(id => {
                if (!ownerIds.includes(id)) ownerIds.push(id);
              });
            } else if (managerIds.length > 0) {
              // Fallback to managers of project members
              managerIds.slice(0, 3).forEach(id => {
                if (!ownerIds.includes(id)) ownerIds.push(id);
              });
            }
          }
        }
      }
    } catch (err) {
      console.error("Error finding group KPI owners:", err);
    }

    return ownerIds;
  };

  const createKpis = async () => {
    if (!currentOrg?.id || !currentEmployee?.id) return;

    setIsCreating(true);
    setProgress(0);
    setCreatedMappings([]);
    setErrors([]);

    const mappings: CreatedKpiMapping[] = [];
    const errorList: string[] = [];
    
    // Sort KPIs by hierarchy - parents first, then quarterly breakdown children
    const sortedKpis = [...selectedKpis].sort((a, b) => {
      const order = { organization: 0, department: 1, project: 2, office: 3, individual: 4 };
      const orderA = order[a.scopeType] ?? 5;
      const orderB = order[b.scopeType] ?? 5;
      if (orderA !== orderB) return orderA - orderB;
      // Put annual KPIs before their quarterly children
      if (a.isQuarterlyChild && !b.isQuarterlyChild) return 1;
      if (!a.isQuarterlyChild && b.isQuarterlyChild) return -1;
      // Sort quarterly children by quarter
      if (a.quarter && b.quarter) return a.quarter - b.quarter;
      return 0;
    });

    for (let i = 0; i < sortedKpis.length; i++) {
      const kpi = sortedKpis[i];
      setCurrentItem(kpi.title);
      setProgress(((i + 1) / sortedKpis.length) * 100);

      try {
        // Find real parent ID if there's a parent temp ID
        let parentKpiId: string | null = null;
        if (kpi.parentTempId) {
          const parentMapping = mappings.find(m => m.tempId === kpi.parentTempId);
          if (parentMapping) {
            parentKpiId = parentMapping.realId;
          }
        }

        // Determine quarter value for the KPI
        let kpiQuarter: number | null = null;
        if (state.periodType === "quarterly") {
          kpiQuarter = state.quarter;
        } else if (kpi.quarter) {
          kpiQuarter = kpi.quarter;
        }

        // Build KPI data based on scope type
        const kpiData: any = {
          organization_id: currentOrg.id,
          title: kpi.title,
          description: kpi.description,
          target_value: kpi.targetValue,
          current_value: 0,
          unit: kpi.unit,
          status: "on_track",
          quarter: kpiQuarter,
          year: state.year,
          scope_type: kpi.scopeType,
          parent_kpi_id: parentKpiId,
          child_contribution_weight: 1,
          auto_rollup: kpi.scopeType !== "individual",
        };

        // Set scope-specific fields
        if (kpi.scopeType === "department") {
          kpiData.scope_department = kpi.scopeValue;
        } else if (kpi.scopeType === "office") {
          kpiData.scope_office_id = kpi.scopeId;
        } else if (kpi.scopeType === "individual") {
          kpiData.employee_id = kpi.employeeId;
        }

        const { data, error } = await supabase
          .from("kpis")
          .insert(kpiData)
          .select("id")
          .single();

        if (error) throw error;

        mappings.push({ tempId: kpi.tempId, realId: data.id });
        setCreatedMappings([...mappings]);

        // Create default 2-week reminder for this KPI
        const { error: reminderError } = await supabase
          .from("kpi_update_settings")
          .insert({
            kpi_id: data.id,
            organization_id: currentOrg.id,
            frequency: "biweekly",
            day_of_week: 1, // Monday
            reminder_time: "09:00:00",
            is_enabled: true,
            next_reminder_at: calculateNextBiweeklyReminder(),
            created_by: currentEmployee.id,
          });

        if (reminderError) {
          console.error("Error creating reminder settings:", reminderError);
        }

        // Auto-assign owners for group KPIs (department, office, project)
        if (["department", "office", "project"].includes(kpi.scopeType)) {
          const ownerIds = await findGroupKpiOwners(kpi, currentOrg.id);
          
          if (ownerIds.length > 0) {
            const ownerRecords = ownerIds.map((empId, index) => ({
              kpi_id: data.id,
              employee_id: empId,
              organization_id: currentOrg.id,
              is_primary: index === 0, // First one is primary
            }));

            const { error: ownerError } = await supabase
              .from("kpi_owners")
              .insert(ownerRecords);

            if (ownerError) {
              console.error("Error assigning KPI owners:", ownerError);
            }
          }
        }

        // Send notifications for the created KPI
        if (currentEmployee?.id && data?.id) {
          await sendKpiNotifications({
            kpiId: data.id,
            kpiTitle: kpi.title,
            scopeType: kpi.scopeType as any,
            organizationId: currentOrg.id,
            actorEmployeeId: currentEmployee.id,
            targetEmployeeId: kpi.employeeId,
            scopeDepartment: kpi.scopeType === 'department' ? kpi.scopeValue : undefined,
            scopeOfficeId: kpi.scopeType === 'office' ? kpi.scopeId : undefined,
            scopeProjectId: kpi.scopeType === 'project' ? kpi.scopeId : undefined,
            scopeName: kpi.scopeValue,
          });
        }
      } catch (err: any) {
        console.error("Error creating KPI:", err);
        errorList.push(`${kpi.title}: ${err.message}`);
        setErrors([...errorList]);
      }
    }

    setIsCreating(false);
    setCompleted(true);
    
    // Update state with results
    updateState({
      creationResults: {
        success: mappings.length,
        failed: errorList.length,
        errors: errorList,
      },
    });

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["team-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["employee-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["group-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["organization-kpis"] });
    queryClient.invalidateQueries({ queryKey: ["kpi-owners"] });

    if (errorList.length === 0) {
      toast.success(`Successfully created ${mappings.length} KPIs with default reminders`);
    } else {
      toast.warning(`Created ${mappings.length} KPIs with ${errorList.length} errors`);
    }
  };

  const getScopeIcon = (scopeType: string) => {
    switch (scopeType) {
      case "organization": return Globe;
      case "department": return Building;
      case "office": return MapPin;
      case "individual": return Users;
      default: return Globe;
    }
  };

  const getScopeColor = (scopeType: string) => {
    switch (scopeType) {
      case "organization": return "text-purple-600";
      case "department": return "text-blue-600";
      case "office": return "text-green-600";
      case "individual": return "text-amber-600";
      default: return "";
    }
  };

  // Group by scope for summary
  const scopeCounts = selectedKpis.reduce((acc, kpi) => {
    acc[kpi.scopeType] = (acc[kpi.scopeType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const successCount = state.creationResults.success || createdMappings.length;
  const failedCount = state.creationResults.failed || errors.length;

  // Show loading state while waiting for data
  if (!isDataReady && !completed) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Loading organization data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isCreating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : completed ? (
              failedCount === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )
            ) : null}
            {isCreating 
              ? "Creating KPIs..." 
              : completed 
                ? failedCount === 0 
                  ? "All KPIs Created Successfully" 
                  : "Creation Completed with Errors"
                : "Ready to Create"
            }
          </CardTitle>
          <CardDescription>
            {isCreating 
              ? `Processing: ${currentItem}` 
              : completed 
                ? `${successCount} KPIs created${failedCount > 0 ? `, ${failedCount} failed` : ""}`
                : `${selectedKpis.length} KPIs will be created`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          {/* Scope Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            {Object.entries(scopeCounts).map(([scope, count]) => {
              const Icon = getScopeIcon(scope);
              return (
                <div 
                  key={scope}
                  className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                >
                  <Icon className={cn("h-5 w-5", getScopeColor(scope))} />
                  <div>
                    <p className="text-sm font-medium capitalize">{scope}</p>
                    <p className="text-xs text-muted-foreground">{count} KPIs</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {completed && (
        <>
          {/* Success Summary */}
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Successfully Created ({successCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {selectedKpis
                  .filter(kpi => createdMappings.some(m => m.tempId === kpi.tempId))
                  .map(kpi => {
                    const Icon = getScopeIcon(kpi.scopeType);
                    return (
                      <div 
                        key={kpi.tempId}
                        className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-md"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <Icon className={cn("h-4 w-4 flex-shrink-0", getScopeColor(kpi.scopeType))} />
                        <span className="text-sm truncate">{kpi.title}</span>
                        {(kpi.scopeValue || kpi.employeeName) && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            {kpi.employeeName || kpi.scopeValue}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {errors.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Failed ({errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {errors.map((error, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md"
                    >
                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
