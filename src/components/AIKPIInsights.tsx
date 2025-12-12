import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Sparkles, TrendingUp, TrendingDown, Minus, Target, Lightbulb, GraduationCap, RefreshCw, Clock, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

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

const getCurrentQuarter = () => {
  const month = new Date().getMonth();
  return Math.floor(month / 3) + 1;
};

const AIKPIInsights = ({ employeeId, embedded = false }: AIKPIInsightsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentQuarter = getCurrentQuarter();
  const currentYear = new Date().getFullYear();
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Check if the current user owns this employee record
  const { data: isOwnProfile } = useQuery({
    queryKey: ["is-own-profile", employeeId, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase
        .from("employees")
        .select("user_id")
        .eq("id", employeeId)
        .single();
      return data?.user_id === user.id;
    },
    enabled: !!user?.id && !!employeeId,
  });

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

  const updateProgressMutation = useMutation({
    mutationFn: async ({ kpiId, newValue }: { kpiId: string; newValue: number }) => {
      const { error } = await supabase
        .from("kpis")
        .update({ current_value: newValue, updated_at: new Date().toISOString() })
        .eq("id", kpiId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis", employeeId] });
      setEditingKpiId(null);
      setEditValue("");
      toast.success("Progress updated");
    },
    onError: () => {
      toast.error("Failed to update progress");
    },
  });

  const handleStartEdit = (kpi: { id: string; current_value: number | null }) => {
    setEditingKpiId(kpi.id);
    setEditValue(String(kpi.current_value || 0));
  };

  const handleSaveEdit = (kpiId: string) => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    updateProgressMutation.mutate({ kpiId, newValue: value });
  };

  const handleCancelEdit = () => {
    setEditingKpiId(null);
    setEditValue("");
  };

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
      {/* KPIs Summary - Show first in embedded mode */}
      {kpis && kpis.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Current KPIs {isOwnProfile && <span className="text-primary">(click to update)</span>}
          </h4>
          <div className="grid gap-2">
            {kpis.slice(0, 5).map((kpi) => {
              const progress = kpi.target_value ? Math.round(((kpi.current_value || 0) / kpi.target_value) * 100) : 0;
              const isEditing = editingKpiId === kpi.id;
              
              return (
                <div key={kpi.id} className="flex items-center justify-between text-sm gap-2">
                  <span className="truncate flex-1">{kpi.title}</span>
                  
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 h-7 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(kpi.id);
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                      />
                      <span className="text-xs text-muted-foreground">/ {kpi.target_value}{kpi.unit}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleSaveEdit(kpi.id)}
                        disabled={updateProgressMutation.isPending}
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
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
                      {isOwnProfile && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-50 hover:opacity-100"
                          onClick={() => handleStartEdit(kpi)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(!kpis || kpis.length === 0) && (
        <div className="text-center py-4 text-muted-foreground">
          <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No KPIs assigned yet.</p>
        </div>
      )}

      {/* AI Insights Section */}
      {!embedded && (
        <>
          {!insights ? (
            <div className="text-center py-6 text-muted-foreground border-t pt-4">
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
        </>
      )}
    </div>
  );

  if (embedded) {
    return content;
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
      {content}
    </Card>
  );
};

export default AIKPIInsights;
