import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, Lightbulb, GraduationCap, RefreshCw, Clock, Building, MapPin, FolderKanban, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CircularProgress } from "@/components/ui/circular-progress";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEmployeeOwnedGroupKpis } from "@/services/useKpi";
import { OrgLink } from "@/components/OrgLink";
import type { GroupKpiWithScope } from "@/types";

interface AIKPIInsightsProps {
  employeeId: string;
  embedded?: boolean;
}

interface Trend {
  type: "improving" | "declining" | "stagnant";
  metric: string;
  description: string;
}

interface FocusArea {
  priority: "high" | "medium" | "low";
  title: string;
  action: string;
}

interface Recommendation {
  type: "training" | "mentorship" | "project" | "habit";
  title: string;
  description: string;
}

interface Insights {
  trends: Trend[];
  focus_areas: FocusArea[];
  recommendations: Recommendation[];
  summary: string;
}

interface Kpi {
  id: string;
  title: string;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  quarter: number;
  year: number;
  status: string;
}

const getCurrentQuarter = () => {
  const month = new Date().getMonth();
  return Math.floor(month / 3) + 1;
};

const AIKPIInsights = ({ employeeId, embedded = false }: AIKPIInsightsProps) => {
  const queryClient = useQueryClient();
  const currentQuarter = getCurrentQuarter();
  const currentYear = new Date().getFullYear();

  // Fetch owned group KPIs (where employee is explicitly assigned as owner)
  const { data: allGroupKpis = [] } = useEmployeeOwnedGroupKpis(
    employeeId,
    currentQuarter,
    currentYear
  );

  // Fetch cached insights
  const { data: cachedInsights, isLoading } = useQuery({
    queryKey: ["kpi-insights", employeeId, currentQuarter, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpi_ai_insights")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("quarter", currentQuarter)
        .eq("year", currentYear)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch KPIs for current and future quarters
  const { data: kpis } = useQuery({
    queryKey: ["kpis", employeeId, "current-and-future"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .eq("employee_id", employeeId)
        .or(`year.gt.${currentYear},and(year.eq.${currentYear},quarter.gte.${currentQuarter})`)
        .order("year", { ascending: true })
        .order("quarter", { ascending: true });
      if (error) throw error;
      // Filter to individual KPIs only
      return (data || []).filter((kpi: any) => !kpi.scope_type || kpi.scope_type === 'individual') as Kpi[];
    },
  });

  // Group KPIs by quarter
  const groupedKpis = useMemo(() => {
    if (!kpis) return [];
    const groups: Record<string, Kpi[]> = {};
    kpis.forEach((kpi) => {
      const key = `${kpi.year}-Q${kpi.quarter}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(kpi);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [kpis]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-kpi-insights", {
        body: { employee_id: employeeId, quarter: currentQuarter, year: currentYear },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-insights", employeeId] });
      toast.success("AI insights generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate insights");
    },
  });

  const insights: Insights | null = cachedInsights?.insights as unknown as Insights | null;
  const generatedAt = cachedInsights?.generated_at;

  const getTrendIcon = (type: string) => {
    switch (type) {
      case "improving":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "declining":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "training":
        return <GraduationCap className="h-4 w-4" />;
      case "mentorship":
        return <Target className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    if (embedded) {
      return (
        <div className="p-4">
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const content = (
    <div className="p-4 space-y-4">
      {/* KPIs Summary - Grouped by Quarter */}
      {groupedKpis.length > 0 && (
        <div className="space-y-2">
          {groupedKpis.map(([quarterKey, quarterKpis]) => {
            const [year, quarter] = quarterKey.split("-");
            const isCurrentQuarter = quarterKey === `${currentYear}-Q${currentQuarter}`;
            
            return (
              <div key={quarterKey} className="space-y-2">
                <div className="flex items-center gap-2 py-1.5 px-2">
                  <Badge variant={isCurrentQuarter ? "default" : "outline"} className="text-xs">
                    {quarter} {year}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({quarterKpis.length} KPI{quarterKpis.length !== 1 ? 's' : ''})
                  </span>
                </div>
                
                <div className="grid gap-1.5 pl-2">
                  {quarterKpis.map((kpi) => {
                    const progress = kpi.target_value ? Math.round(((kpi.current_value || 0) / kpi.target_value) * 100) : 0;
                    const progressColor = progress >= 80 ? "text-green-500" : progress >= 50 ? "text-amber-500" : "text-red-500";
                    const borderColor = progress >= 80 ? '#22c55e' : progress >= 50 ? '#f59e0b' : '#ef4444';
                    
                    return (
                      <OrgLink 
                        key={kpi.id} 
                        to={`/kpi/${kpi.id}`}
                        className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-all group border-l-2"
                        style={{ borderLeftColor: borderColor }}
                      >
                        <span className="flex-1 text-sm leading-tight break-words min-w-0 group-hover:text-primary transition-colors">{kpi.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <CircularProgress 
                            value={progress} 
                            size={24} 
                            strokeWidth={3} 
                            className={progressColor}
                          />
                          <span className="text-xs font-medium text-muted-foreground w-8 text-right">{progress}%</span>
                        </div>
                      </OrgLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(!kpis || kpis.length === 0) && allGroupKpis.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No KPIs assigned yet.</p>
        </div>
      )}

      {/* Group KPIs (Inherited + Owned) */}
      {allGroupKpis.length > 0 && (
        <div className="space-y-2 border-t pt-4 mt-4">
          <div className="flex items-center gap-2 py-1.5 px-2">
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Users className="h-3 w-3" />
              Group KPIs
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({allGroupKpis.length})
            </span>
          </div>
          <div className="grid gap-2 pl-2">
            {allGroupKpis.map((kpi) => {
              const progress = kpi.target_value ? Math.round(((kpi.current_value || 0) / kpi.target_value) * 100) : 0;
              
              // Render scope icon/logo
              const renderScopeIcon = () => {
                if (kpi.scope_type === 'project' && kpi.project) {
                  if (kpi.project.logo_url) {
                    return (
                      <div className="h-5 w-5 rounded-full overflow-hidden bg-muted shrink-0">
                        <img 
                          src={kpi.project.logo_url} 
                          alt={kpi.project.name} 
                          className="h-full w-full object-cover"
                        />
                      </div>
                    );
                  }
                  // Use project icon with color
                  const iconColor = kpi.project.color || 'hsl(var(--primary))';
                  return (
                    <div 
                      className="h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${iconColor}20` }}
                    >
                      <FolderKanban className="h-3 w-3" style={{ color: iconColor }} />
                    </div>
                  );
                }
                if (kpi.scope_type === 'department') {
                  return (
                    <div className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <Building className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                  );
                }
                if (kpi.scope_type === 'office') {
                  return (
                    <div className="h-5 w-5 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <MapPin className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                    </div>
                  );
                }
                return null;
              };
              
              const getScopeName = () => {
                if (kpi.scope_type === 'department') return kpi.scope_department;
                if (kpi.scope_type === 'office') return kpi.office?.name;
                if (kpi.scope_type === 'project') return kpi.project?.name;
                return '';
              };
              
              const progressColor = progress >= 80 ? "text-green-500" : progress >= 50 ? "text-amber-500" : "text-red-500";
              
              return (
                <OrgLink 
                  key={kpi.id} 
                  to={`/kpi/${kpi.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all border border-border/50 group"
                >
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Title only */}
                    <span className="text-sm font-medium leading-tight break-words block group-hover:text-primary transition-colors">{kpi.title}</span>
                    
                    {/* Row 2: Icon + Group Name + Period */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {renderScopeIcon()}
                      <span className="text-xs text-muted-foreground">{getScopeName()}</span>
                      <span className="text-xs text-muted-foreground/50">•</span>
                      <span className="text-xs text-muted-foreground">Q{kpi.quarter} {kpi.year}</span>
                    </div>
                  </div>
                  
                  {/* Right side: Circular progress + percentage */}
                  <div className="flex items-center gap-2 shrink-0">
                    <CircularProgress 
                      value={progress} 
                      size={28} 
                      strokeWidth={3} 
                      className={progressColor}
                    />
                    <span className="text-xs font-medium text-muted-foreground w-8 text-right">{progress}%</span>
                  </div>
                </OrgLink>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Insights Section */}
      {!embedded && (
        <>
          {!insights ? (
            <div className="text-center py-6 text-muted-foreground border-t pt-4">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50 text-ai" />
              <p className="text-sm">No AI insights generated yet.</p>
              <p className="text-xs">Click "Generate" to get personalized insights.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              {insights.summary && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{insights.summary}</p>
                </div>
              )}

              {/* Trends */}
              {insights.trends?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Trends</h4>
                  <div className="space-y-2">
                    {insights.trends.map((trend, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        {getTrendIcon(trend.type)}
                        <div>
                          <span className="font-medium">{trend.metric}:</span>{" "}
                          <span className="text-muted-foreground">{trend.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Areas */}
              {insights.focus_areas?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Focus Areas</h4>
                  <div className="space-y-2">
                    {insights.focus_areas.map((area, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Badge className={cn("text-[10px] shrink-0", getPriorityColor(area.priority))}>
                          {area.priority}
                        </Badge>
                        <div className="text-sm">
                          <span className="font-medium">{area.title}:</span>{" "}
                          <span className="text-muted-foreground">{area.action}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insights.recommendations?.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Recommendations</h4>
                  <div className="space-y-2">
                    {insights.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm bg-primary/5 rounded-md p-2">
                        <span className="text-primary mt-0.5">{getRecommendationIcon(rec.type)}</span>
                        <div>
                          <span className="font-medium">{rec.title}</span>
                          <p className="text-xs text-muted-foreground">{rec.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-ai/5 to-ai/10 border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-ai" />
            AI Insights
            <Badge variant="secondary" className="text-xs">Q{currentQuarter} {currentYear}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="h-8"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1", generateMutation.isPending && "animate-spin")} />
            {insights ? "Refresh" : "Generate"}
          </Button>
        </div>
        {generatedAt && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            Last updated {formatDistanceToNow(new Date(generatedAt), { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      {content}
    </Card>
  );
};

export default AIKPIInsights;
