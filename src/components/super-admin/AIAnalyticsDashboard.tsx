import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Zap, 
  BarChart3, 
  PieChart,
  Clock,
  Building2,
  Users
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";

interface AIUsageLog {
  id: string;
  organization_id: string;
  user_id: string;
  model: string;
  query_type: string;
  total_tokens: number;
  estimated_cost: number;
  latency_ms: number;
  created_at: string;
}

interface OrganizationUsage {
  organization_id: string;
  name: string;
  total_queries: number;
  total_tokens: number;
  total_cost: number;
  avg_latency: number;
}

const MODEL_COLORS: Record<string, string> = {
  "google/gemini-2.5-flash": "#4285F4",
  "google/gemini-2.5-pro": "#0F9D58",
  "google/gemini-2.5-flash-lite": "#34A853",
  "openai/gpt-5": "#10A37F",
  "openai/gpt-5-mini": "#00A67E",
  "openai/gpt-5-nano": "#00D4AA",
  "default": "#8884d8",
};

export const AIAnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

  const startDate = useMemo(() => {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    return subDays(new Date(), days);
  }, [dateRange]);

  // Fetch AI usage logs
  const { data: usageLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["ai-usage-logs", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_usage_logs")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AIUsageLog[];
    },
  });

  // Fetch organizations for mapping
  const { data: organizations } = useQuery({
    queryKey: ["organizations-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name");
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!usageLogs) return null;

    const totalQueries = usageLogs.length;
    const totalTokens = usageLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
    const totalCost = usageLogs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);
    const avgLatency = usageLogs.length > 0 
      ? usageLogs.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / usageLogs.length 
      : 0;

    const internalQueries = usageLogs.filter(l => l.query_type === "internal").length;
    const generalQueries = usageLogs.filter(l => l.query_type === "general").length;

    // Model distribution
    const modelCounts: Record<string, number> = {};
    usageLogs.forEach(log => {
      modelCounts[log.model] = (modelCounts[log.model] || 0) + 1;
    });

    // Daily usage trend
    const dailyUsage: Record<string, { queries: number; tokens: number; cost: number }> = {};
    usageLogs.forEach(log => {
      const day = format(new Date(log.created_at), "yyyy-MM-dd");
      if (!dailyUsage[day]) {
        dailyUsage[day] = { queries: 0, tokens: 0, cost: 0 };
      }
      dailyUsage[day].queries++;
      dailyUsage[day].tokens += log.total_tokens || 0;
      dailyUsage[day].cost += log.estimated_cost || 0;
    });

    // Org usage
    const orgUsage: Record<string, OrganizationUsage> = {};
    usageLogs.forEach(log => {
      if (!orgUsage[log.organization_id]) {
        const org = organizations?.find(o => o.id === log.organization_id);
        orgUsage[log.organization_id] = {
          organization_id: log.organization_id,
          name: org?.name || "Unknown",
          total_queries: 0,
          total_tokens: 0,
          total_cost: 0,
          avg_latency: 0,
        };
      }
      orgUsage[log.organization_id].total_queries++;
      orgUsage[log.organization_id].total_tokens += log.total_tokens || 0;
      orgUsage[log.organization_id].total_cost += log.estimated_cost || 0;
    });

    return {
      totalQueries,
      totalTokens,
      totalCost,
      avgLatency,
      internalQueries,
      generalQueries,
      modelDistribution: Object.entries(modelCounts).map(([model, count]) => ({
        name: model.split("/").pop() || model,
        value: count,
        fullName: model,
      })),
      dailyTrend: Object.entries(dailyUsage)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topOrgs: Object.values(orgUsage)
        .sort((a, b) => b.total_queries - a.total_queries)
        .slice(0, 10),
    };
  }, [usageLogs, organizations]);

  if (logsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI Analytics
          </h2>
          <p className="text-muted-foreground">Monitor AI usage across all organizations</p>
        </div>
        <Select value={dateRange} onValueChange={(v: "7d" | "30d" | "90d") => setDateRange(v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalQueries.toLocaleString() || 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {metrics?.internalQueries || 0} internal
              </Badge>
              <Badge variant="outline" className="text-xs">
                {metrics?.generalQueries || 0} general
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics?.totalTokens || 0) / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{((metrics?.totalTokens || 0) / (metrics?.totalQueries || 1)).toFixed(0)} tokens/query
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(metrics?.totalCost || 0).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${((metrics?.totalCost || 0) / (metrics?.totalQueries || 1) * 1000).toFixed(4)}/1K queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((metrics?.avgLatency || 0) / 1000).toFixed(2)}s</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics?.avgLatency || 0).toFixed(0)}ms average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Usage Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics?.dailyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(v) => format(new Date(v), "MMM d")}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")}
                    formatter={(value: number, name: string) => [
                      name === "cost" ? `$${value.toFixed(6)}` : value.toLocaleString(),
                      name === "queries" ? "Queries" : name === "tokens" ? "Tokens" : "Cost"
                    ]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="queries" stroke="hsl(var(--primary))" strokeWidth={2} name="Queries" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Model Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Model Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={metrics?.modelDistribution || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics?.modelDistribution?.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={MODEL_COLORS[entry.fullName] || MODEL_COLORS.default} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Organizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top Organizations by AI Usage
          </CardTitle>
          <CardDescription>Organizations with the highest AI query volume</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics?.topOrgs?.map((org, index) => (
              <div key={org.organization_id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.total_queries} queries</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{(org.total_tokens / 1000).toFixed(1)}K tokens</p>
                  <p className="text-xs text-muted-foreground">${org.total_cost.toFixed(4)}</p>
                </div>
              </div>
            ))}
            {(!metrics?.topOrgs || metrics.topOrgs.length === 0) && (
              <p className="text-center text-muted-foreground py-8">No AI usage data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
