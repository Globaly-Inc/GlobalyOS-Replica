import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, Lightbulb, GraduationCap, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AIKPIInsightsProps {
  employeeId: string;
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

const getCurrentQuarter = () => {
  const month = new Date().getMonth();
  return Math.floor(month / 3) + 1;
};

const AIKPIInsights = ({ employeeId }: AIKPIInsightsProps) => {
  const queryClient = useQueryClient();
  const currentQuarter = getCurrentQuarter();
  const currentYear = new Date().getFullYear();

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

  // Fetch KPIs for display
  const { data: kpis } = useQuery({
    queryKey: ["kpis", employeeId, currentQuarter, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("quarter", currentQuarter)
        .eq("year", currentYear);
      if (error) throw error;
      return data;
    },
  });

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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
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
      <CardContent className="p-4 space-y-4">
        {!insights ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
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

        {/* KPIs Summary */}
        {kpis && kpis.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Current KPIs</h4>
            <div className="grid gap-2">
              {kpis.slice(0, 3).map((kpi) => {
                const progress = kpi.target_value ? Math.round((kpi.current_value / kpi.target_value) * 100) : 0;
                return (
                  <div key={kpi.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{kpi.title}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIKPIInsights;
