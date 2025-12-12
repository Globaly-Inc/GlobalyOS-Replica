import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
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
import { Link } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

const TeamKPIDashboard = () => {
  const { user } = useAuth();
  const { isAdmin, isHR } = useUserRole();
  const { currentOrg } = useOrganization();
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [year, setYear] = useState(getCurrentYear());

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

  // Fetch all KPIs for the team
  const { data: teamKPIs = [], isLoading: loadingKPIs } = useQuery({
    queryKey: ["team-kpis", teamMembers.map(t => t.id), quarter, year],
    queryFn: async () => {
      if (teamMembers.length === 0) return [];
      
      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .in("employee_id", teamMembers.map(t => t.id))
        .eq("quarter", quarter)
        .eq("year", year);
      if (error) throw error;
      return data;
    },
    enabled: teamMembers.length > 0,
  });

  // Calculate aggregated stats
  const stats = {
    totalKPIs: teamKPIs.length,
    onTrack: teamKPIs.filter(k => k.status === "on_track").length,
    atRisk: teamKPIs.filter(k => k.status === "at_risk").length,
    behind: teamKPIs.filter(k => k.status === "behind").length,
    completed: teamKPIs.filter(k => k.status === "completed").length,
    avgProgress: teamKPIs.length > 0
      ? Math.round(
          teamKPIs.reduce((acc, kpi) => {
            if (!kpi.target_value) return acc;
            return acc + ((kpi.current_value || 0) / kpi.target_value) * 100;
          }, 0) / teamKPIs.filter(k => k.target_value).length || 0
        )
      : 0,
  };

  // Group KPIs by employee
  const kpisByEmployee = teamMembers.map(member => {
    const memberKPIs = teamKPIs.filter(k => k.employee_id === member.id);
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

  return (
    <Layout>
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
          <div className="flex items-center gap-3">
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

            {/* Team Progress Overview */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Progress
                  <Badge variant="secondary" className="ml-2">
                    {teamMembers.length} members
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kpisByEmployee.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={(member.profiles as any)?.avatar_url} />
                        <AvatarFallback>
                          {(member.profiles as any)?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm truncate">
                            {(member.profiles as any)?.full_name}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {member.kpis.length} KPIs
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={member.avgProgress} className="h-2 flex-1" />
                          <span className="text-xs font-medium w-10 text-right">
                            {member.avgProgress}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {member.onTrack + member.completed > 0 && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                            {member.onTrack + member.completed}
                          </Badge>
                        )}
                        {member.atRisk > 0 && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                            {member.atRisk}
                          </Badge>
                        )}
                        {member.behind > 0 && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                            {member.behind}
                          </Badge>
                        )}
                      </div>
                      <Link to={`/team/${member.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detailed KPI Breakdown */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  All KPIs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {teamKPIs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No KPIs set for Q{quarter} {year}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamKPIs.map((kpi) => {
                      const member = teamMembers.find(m => m.id === kpi.employee_id);
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
                              <Badge
                                className={cn(
                                  "text-xs",
                                  kpi.status === "on_track" && "bg-green-100 text-green-700",
                                  kpi.status === "at_risk" && "bg-amber-100 text-amber-700",
                                  kpi.status === "behind" && "bg-red-100 text-red-700",
                                  kpi.status === "completed" && "bg-blue-100 text-blue-700"
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default TeamKPIDashboard;
