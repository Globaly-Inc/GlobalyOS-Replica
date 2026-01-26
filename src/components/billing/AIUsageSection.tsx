import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sparkles,
  Coins,
  TrendingUp,
  Users,
  Zap,
  ShoppingCart,
  BarChart3,
} from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { TokenPurchaseDialog } from "./TokenPurchaseDialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AIUsageSectionProps {
  organizationId: string;
}

interface TokenBalance {
  available_tokens: number;
  used_tokens_this_period: number;
  included_tokens: number;
  purchased_tokens: number;
}

interface DailyUsage {
  date: string;
  model: string;
  total_tokens: number;
  query_count: number;
  estimated_cost_cents: number;
}

const MODEL_COLORS: Record<string, string> = {
  "google/gemini-2.5-flash": "#10b981",
  "google/gemini-2.5-pro": "#3b82f6",
  "google/gemini-3-flash-preview": "#8b5cf6",
  "openai/gpt-5": "#f59e0b",
  "openai/gpt-5-mini": "#ec4899",
  "deterministic": "#6b7280",
};

const MODEL_SHORT_NAMES: Record<string, string> = {
  "google/gemini-2.5-flash": "Gemini Flash",
  "google/gemini-2.5-pro": "Gemini Pro",
  "google/gemini-3-flash-preview": "Gemini 3",
  "openai/gpt-5": "GPT-5",
  "openai/gpt-5-mini": "GPT-5 Mini",
  "deterministic": "Instant",
};

export function AIUsageSection({ organizationId }: AIUsageSectionProps) {
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "month">("30d");

  // Fetch token balance
  const { data: tokenBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ["token-balance", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_balances")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (error) throw error;
      return data as TokenBalance | null;
    },
  });

  // Fetch daily usage
  const { data: dailyUsage, isLoading: usageLoading } = useQuery({
    queryKey: ["token-usage-daily", organizationId, timeRange],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      if (timeRange === "7d") {
        startDate = subDays(now, 7);
      } else if (timeRange === "month") {
        startDate = startOfMonth(now);
      } else {
        startDate = subDays(now, 30);
      }

      const { data, error } = await supabase
        .from("token_usage_daily")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .order("date", { ascending: true });

      if (error) throw error;
      return data as DailyUsage[];
    },
  });

  // Fetch AI usage logs for query count
  const { data: usageLogs } = useQuery({
    queryKey: ["ai-usage-logs-count", organizationId],
    queryFn: async () => {
      const startOfCurrentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
      
      const { count, error } = await supabase
        .from("ai_usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("created_at", startOfCurrentMonth);

      if (error) throw error;
      return { count: count || 0 };
    },
  });

  // Compute chart data
  const chartData = useMemo(() => {
    if (!dailyUsage) return [];

    // Group by date
    const byDate: Record<string, { date: string; tokens: number; queries: number }> = {};
    
    dailyUsage.forEach(usage => {
      if (!byDate[usage.date]) {
        byDate[usage.date] = { date: usage.date, tokens: 0, queries: 0 };
      }
      byDate[usage.date].tokens += usage.total_tokens;
      byDate[usage.date].queries += usage.query_count;
    });

    return Object.values(byDate).map(d => ({
      ...d,
      date: format(new Date(d.date), "MMM d"),
    }));
  }, [dailyUsage]);

  // Compute model breakdown
  const modelBreakdown = useMemo(() => {
    if (!dailyUsage) return [];

    const byModel: Record<string, { model: string; tokens: number; queries: number }> = {};
    
    dailyUsage.forEach(usage => {
      if (!byModel[usage.model]) {
        byModel[usage.model] = { model: usage.model, tokens: 0, queries: 0 };
      }
      byModel[usage.model].tokens += usage.total_tokens;
      byModel[usage.model].queries += usage.query_count;
    });

    return Object.values(byModel)
      .filter(m => m.tokens > 0)
      .sort((a, b) => b.tokens - a.tokens);
  }, [dailyUsage]);

  // Calculate totals
  const totalUsedTokens = tokenBalance?.used_tokens_this_period || 0;
  const availableTokens = tokenBalance?.available_tokens || 0;
  const totalTokens = (tokenBalance?.included_tokens || 0) + (tokenBalance?.purchased_tokens || 0);
  const usagePercentage = totalTokens > 0 ? (totalUsedTokens / totalTokens) * 100 : 0;

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  if (balanceLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Usage & Tokens
            </CardTitle>
            <CardDescription>
              Monitor your AI usage and manage token balance
            </CardDescription>
          </div>
          <Button onClick={() => setPurchaseDialogOpen(true)} className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Buy Tokens
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Token Balance Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Coins className="h-4 w-4" />
                Available Tokens
              </div>
              <div className="text-2xl font-bold">{formatTokens(availableTokens)}</div>
              {tokenBalance && (
                <div className="text-xs text-muted-foreground mt-1">
                  {formatTokens(tokenBalance.included_tokens)} plan + {formatTokens(tokenBalance.purchased_tokens)} purchased
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                Used This Month
              </div>
              <div className="text-2xl font-bold">{formatTokens(totalUsedTokens)}</div>
              {totalTokens > 0 && (
                <div className="mt-2">
                  <Progress value={Math.min(usagePercentage, 100)} className="h-2" />
                  <div className="text-xs text-muted-foreground mt-1">
                    {usagePercentage.toFixed(1)}% of {formatTokens(totalTokens)}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap className="h-4 w-4" />
                Queries This Month
              </div>
              <div className="text-2xl font-bold">{usageLogs?.count || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                AI conversations
              </div>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage Trend
            </h4>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Usage Chart */}
          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => formatTokens(v)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTokens(value), "Tokens"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tokens" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No usage data for this period
            </div>
          )}

          {/* Model Breakdown */}
          {modelBreakdown.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Usage by Model</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Queries</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelBreakdown.map((item) => (
                    <TableRow key={item.model}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: MODEL_COLORS[item.model] || "#6b7280" }}
                          />
                          <span className="font-medium">
                            {MODEL_SHORT_NAMES[item.model] || item.model}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatTokens(item.tokens)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {item.queries}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <TokenPurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        organizationId={organizationId}
      />
    </>
  );
}
