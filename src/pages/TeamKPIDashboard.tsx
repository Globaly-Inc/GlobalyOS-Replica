import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { OrgLink } from "@/components/OrgLink";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  ChevronRight,
  LineChart,
  FileText,
  Building,
  FolderKanban,
  X,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KPITemplatesDialog } from "@/components/dialogs/KPITemplatesDialog";
import { EditKPIDialog } from "@/components/dialogs/EditKPIDialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  Tooltip,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { Kpi } from "@/types/kpi";
import { toast } from "sonner";

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

const TeamKPIDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, isHR } = useUserRole();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  
  const [viewMode, setViewMode] = useState<"quarterly" | "annual">("quarterly");
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [year, setYear] = useState(getCurrentYear());
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  
  // Edit/Delete state
  const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);
  const [deletingKpiId, setDeletingKpiId] = useState<string | null>(null);
  
  const canManageKPIs = isAdmin;

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("id, organization_id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch team members (direct reports for managers, all for HR/Admin)
  const { data: teamMembers = [], isLoading: loadingTeam } = useQuery({
    queryKey: ["team-kpi-members", currentEmployee?.id, isAdmin, isHR, currentOrg?.id],
    queryFn: async () => {
      if (!currentEmployee?.id) return [];
      
      let query = supabase
        .from("employees")
        .select("id, position, department, profiles(full_name, avatar_url)")
        .eq("organization_id", currentEmployee.organization_id)
        .eq("status", "active");

      // If not HR/Admin, only show direct reports
      if (!isAdmin && !isHR) {
        query = query.eq("manager_id", currentEmployee.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!currentEmployee?.id,
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch employee-project mappings
  const { data: employeeProjects = [] } = useQuery({
    queryKey: ["employee-projects", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("employee_projects")
        .select("employee_id, project_id")
        .eq("organization_id", currentOrg.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch all KPIs for the team (based on view mode)
  const { data: teamKPIs = [], isLoading: loadingKPIs } = useQuery({
    queryKey: ["team-kpis", teamMembers.map(t => t.id), viewMode, quarter, year],
    queryFn: async () => {
      if (teamMembers.length === 0) return [];
      
      let query = supabase
        .from("kpis")
        .select("*")
        .in("employee_id", teamMembers.map(t => t.id))
        .eq("year", year);
      
      // Only filter by quarter in quarterly mode
      if (viewMode === "quarterly") {
        query = query.eq("quarter", quarter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: teamMembers.length > 0,
  });
  
  // Delete KPI mutation
  const deleteMutation = useMutation({
    mutationFn: async (kpiId: string) => {
      const { error } = await supabase
        .from("kpis")
        .delete()
        .eq("id", kpiId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["employee-kpis"] });
      toast.success("KPI deleted successfully");
      setDeletingKpiId(null);
    },
    onError: (error) => {
      toast.error("Failed to delete KPI");
      console.error(error);
    },
  });

  // Fetch historical KPIs for trend analysis (last 4 quarters)
  const { data: historicalKPIs = [] } = useQuery({
    queryKey: ["team-kpis-historical", teamMembers.map(t => t.id), year],
    queryFn: async () => {
      if (teamMembers.length === 0) return [];
      
      // Get KPIs from current year and previous year for trend analysis
      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .in("employee_id", teamMembers.map(t => t.id))
        .or(`year.eq.${year},year.eq.${year - 1}`)
        .order("year", { ascending: true })
        .order("quarter", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: teamMembers.length > 0,
  });

  // Extract unique departments from team members
  const departments = useMemo(() => {
    const deptSet = new Set(teamMembers.map(m => m.department).filter(Boolean));
    return Array.from(deptSet).sort();
  }, [teamMembers]);

  // Get member count per department
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    teamMembers.forEach(m => {
      if (m.department) {
        counts[m.department] = (counts[m.department] || 0) + 1;
      }
    });
    return counts;
  }, [teamMembers]);

  // Get member count per project
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    employeeProjects.forEach(ep => {
      if (teamMembers.some(m => m.id === ep.employee_id)) {
        counts[ep.project_id] = (counts[ep.project_id] || 0) + 1;
      }
    });
    return counts;
  }, [employeeProjects, teamMembers]);

  // Filter team members based on department and project filters
  const filteredTeamMembers = useMemo(() => {
    return teamMembers.filter(member => {
      if (departmentFilter !== "all" && member.department !== departmentFilter) {
        return false;
      }
      if (projectFilter !== "all") {
        const memberProjectIds = employeeProjects
          .filter(ep => ep.employee_id === member.id)
          .map(ep => ep.project_id);
        if (!memberProjectIds.includes(projectFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [teamMembers, departmentFilter, projectFilter, employeeProjects]);

  // Filter KPIs based on filtered team members
  const filteredTeamKPIs = useMemo(() => {
    const filteredMemberIds = filteredTeamMembers.map(m => m.id);
    return teamKPIs.filter(kpi => filteredMemberIds.includes(kpi.employee_id));
  }, [teamKPIs, filteredTeamMembers]);

  // Process historical data for trend charts
  const trendData = useMemo(() => {
    if (historicalKPIs.length === 0) return [];
    
    // Group by quarter/year
    const quarterlyData: Record<string, {
      period: string;
      quarter: number;
      year: number;
      totalKPIs: number;
      avgProgress: number;
      onTrack: number;
      atRisk: number;
      behind: number;
      completed: number;
    }> = {};

    // Get last 4 quarters including current
    const quarters: { q: number; y: number }[] = [];
    let currentQ = quarter;
    let currentY = year;
    for (let i = 0; i < 4; i++) {
      quarters.unshift({ q: currentQ, y: currentY });
      currentQ--;
      if (currentQ < 1) {
        currentQ = 4;
        currentY--;
      }
    }

    quarters.forEach(({ q, y }) => {
      const key = `Q${q} ${y}`;
      const kpisInQuarter = historicalKPIs.filter(k => k.quarter === q && k.year === y);
      
      const kpisWithTarget = kpisInQuarter.filter(k => k.target_value);
      const avgProgress = kpisWithTarget.length > 0
        ? Math.round(
            kpisWithTarget.reduce((acc, kpi) => {
              return acc + ((kpi.current_value || 0) / (kpi.target_value || 1)) * 100;
            }, 0) / kpisWithTarget.length
          )
        : 0;

      quarterlyData[key] = {
        period: key,
        quarter: q,
        year: y,
        totalKPIs: kpisInQuarter.length,
        avgProgress,
        onTrack: kpisInQuarter.filter(k => k.status === "on_track").length,
        atRisk: kpisInQuarter.filter(k => k.status === "at_risk").length,
        behind: kpisInQuarter.filter(k => k.status === "behind").length,
        completed: kpisInQuarter.filter(k => k.status === "completed").length,
      };
    });

    return quarters.map(({ q, y }) => quarterlyData[`Q${q} ${y}`]);
  }, [historicalKPIs, quarter, year]);

  const chartConfig = {
    avgProgress: {
      label: "Avg Progress",
      color: "hsl(var(--primary))",
    },
    onTrack: {
      label: "On Track",
      color: "hsl(142 76% 36%)",
    },
    atRisk: {
      label: "At Risk",
      color: "hsl(45 93% 47%)",
    },
    behind: {
      label: "Behind",
      color: "hsl(0 84% 60%)",
    },
    completed: {
      label: "Completed",
      color: "hsl(217 91% 60%)",
    },
  };

  // Calculate aggregated stats (from filtered data)
  const stats = {
    totalKPIs: filteredTeamKPIs.length,
    onTrack: filteredTeamKPIs.filter(k => k.status === "on_track").length,
    atRisk: filteredTeamKPIs.filter(k => k.status === "at_risk").length,
    behind: filteredTeamKPIs.filter(k => k.status === "behind").length,
    completed: filteredTeamKPIs.filter(k => k.status === "completed").length,
    avgProgress: filteredTeamKPIs.length > 0
      ? Math.round(
          filteredTeamKPIs.reduce((acc, kpi) => {
            if (!kpi.target_value) return acc;
            return acc + ((kpi.current_value || 0) / kpi.target_value) * 100;
          }, 0) / filteredTeamKPIs.filter(k => k.target_value).length || 0
        )
      : 0,
  };

  // Group KPIs by employee (using filtered members and KPIs)
  const kpisByEmployee = filteredTeamMembers.map(member => {
    const memberKPIs = filteredTeamKPIs.filter(k => k.employee_id === member.id);
    const avgProgress = memberKPIs.length > 0
      ? Math.round(
          memberKPIs.reduce((acc, kpi) => {
            if (!kpi.target_value) return acc;
            return acc + ((kpi.current_value || 0) / kpi.target_value) * 100;
          }, 0) / memberKPIs.filter(k => k.target_value).length || 0
        )
      : 0;
    
    return {
      ...member,
      kpis: memberKPIs,
      avgProgress,
      onTrack: memberKPIs.filter(k => k.status === "on_track").length,
      atRisk: memberKPIs.filter(k => k.status === "at_risk").length,
      behind: memberKPIs.filter(k => k.status === "behind").length,
      completed: memberKPIs.filter(k => k.status === "completed").length,
    };
  }).sort((a, b) => b.kpis.length - a.kpis.length);

  const isLoading = loadingTeam || loadingKPIs;
  const hasActiveFilters = departmentFilter !== "all" || projectFilter !== "all";

  const clearFilters = () => {
    setDepartmentFilter("all");
    setProjectFilter("all");
  };

  return (
    <>
      <div className="container mx-auto py-4 md:py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Team KPI Dashboard
            </h1>
            <p className="text-muted-foreground">
              {isAdmin || isHR ? "Organization-wide" : "Your direct reports'"} KPI overview
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={(v) => v && setViewMode(v as "quarterly" | "annual")}
              className="border rounded-lg"
            >
              <ToggleGroupItem value="quarterly" aria-label="Quarterly view" className="px-3 gap-1.5">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Quarterly</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="annual" aria-label="Annual view" className="px-3 gap-1.5">
                <CalendarDays className="h-4 w-4" />
                <span className="hidden sm:inline">Annual</span>
              </ToggleGroupItem>
            </ToggleGroup>
            
            {(isAdmin || isHR) && (
              <KPITemplatesDialog>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              </KPITemplatesDialog>
            )}
            
            {viewMode === "quarterly" && (
              <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((q) => (
                    <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : teamMembers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No Team Members</h3>
            <p className="text-muted-foreground">
              {isAdmin || isHR
                ? "No active employees in the organization."
                : "You don't have any direct reports assigned."}
            </p>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.totalKPIs}</p>
                      <p className="text-xs text-muted-foreground">Total KPIs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.onTrack + stats.completed}</p>
                      <p className="text-xs text-muted-foreground">On Track / Done</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.atRisk}</p>
                      <p className="text-xs text-muted-foreground">At Risk</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.behind}</p>
                      <p className="text-xs text-muted-foreground">Behind</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.avgProgress}%</p>
                      <p className="text-xs text-muted-foreground">Avg Progress</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Charts */}
            {trendData.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 mb-6">
                {/* Progress Trend Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      Progress Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
                        />
                        <Area
                          type="monotone"
                          dataKey="avgProgress"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#progressGradient)"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Status Distribution Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                      <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="period"
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          className="text-muted-foreground"
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="onTrack" stackId="status" fill="hsl(142 76% 36%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="completed" stackId="status" fill="hsl(217 91% 60%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="atRisk" stackId="status" fill="hsl(45 93% 47%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="behind" stackId="status" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Filter Bar */}
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filter by:</span>
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-[180px]">
                  <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept} ({departmentCounts[dept] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({projectCounts[project.id] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear filters
                </Button>
              )}

              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-auto">
                  {filteredTeamMembers.length} of {teamMembers.length} members
                </Badge>
              )}
            </div>

            {/* All KPIs - Now above Team Progress */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  All KPIs
                  <Badge variant="secondary" className="ml-2">
                    {filteredTeamKPIs.length} KPIs
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredTeamKPIs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {hasActiveFilters 
                        ? "No KPIs match the selected filters" 
                        : viewMode === "annual" 
                          ? `No KPIs set for ${year}`
                          : `No KPIs set for Q${quarter} ${year}`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTeamKPIs.map((kpi) => {
                      const member = filteredTeamMembers.find(m => m.id === kpi.employee_id);
                      const progress = kpi.target_value
                        ? Math.round(((kpi.current_value || 0) / kpi.target_value) * 100)
                        : 0;
                      
                      return (
                        <div
                          key={kpi.id}
                          className="flex items-center gap-4 p-3 border rounded-lg"
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={(member?.profiles as any)?.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {(member?.profiles as any)?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm truncate">{kpi.title}</p>
                              {viewMode === "annual" && (
                                <Badge variant="outline" className="text-xs">
                                  Q{kpi.quarter}
                                </Badge>
                              )}
                              <Badge
                                className={cn(
                                  "text-xs",
                                  kpi.status === "on_track" && "bg-green-100 text-green-700",
                                  kpi.status === "at_risk" && "bg-amber-100 text-amber-700",
                                  kpi.status === "behind" && "bg-red-100 text-red-700",
                                  kpi.status === "achieved" && "bg-blue-100 text-blue-700"
                                )}
                              >
                                {kpi.status.replace("_", " ")}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {(member?.profiles as any)?.full_name} • {member?.position}
                            </p>
                          </div>
                          {kpi.target_value && (
                            <div className="flex items-center gap-2 w-32">
                              <Progress value={progress} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground w-8 text-right">
                                {progress}%
                              </span>
                            </div>
                          )}
                          {canManageKPIs && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingKpi(kpi as Kpi)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDeletingKpiId(kpi.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Progress Overview - Now as 3-column grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Progress
                  <Badge variant="secondary" className="ml-2">
                    {filteredTeamMembers.length} members
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kpisByEmployee.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No team members match the selected filters</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {kpisByEmployee.map((member) => (
                      <Card 
                        key={member.id} 
                        className="p-4 hover:shadow-md transition-shadow border bg-card"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={(member.profiles as any)?.avatar_url} />
                            <AvatarFallback>
                              {(member.profiles as any)?.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {(member.profiles as any)?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {member.department}
                            </p>
                          </div>
                          <OrgLink to={`/team/${member.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </OrgLink>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{member.kpis.length} KPIs</span>
                            <span className="font-medium">{member.avgProgress}%</span>
                          </div>
                          <Progress value={member.avgProgress} className="h-2" />
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {member.onTrack + member.completed > 0 && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {member.onTrack + member.completed}
                            </Badge>
                          )}
                          {member.atRisk > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {member.atRisk}
                            </Badge>
                          )}
                          {member.behind > 0 && (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs gap-1">
                              <XCircle className="h-3 w-3" />
                              {member.behind}
                            </Badge>
                          )}
                          {member.kpis.length === 0 && (
                            <span className="text-xs text-muted-foreground">No KPIs</span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
      
      {/* Edit KPI Dialog */}
      <EditKPIDialog
        open={!!editingKpi}
        onOpenChange={(open) => !open && setEditingKpi(null)}
        kpi={editingKpi}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingKpiId} onOpenChange={(open) => !open && setDeletingKpiId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this KPI? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingKpiId && deleteMutation.mutate(deletingKpiId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TeamKPIDashboard;
