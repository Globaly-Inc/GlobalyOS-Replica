import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { 
  Loader2, 
  Database, 
  MessageSquare, 
  BarChart3, 
  CreditCard,
  CalendarDays,
  ChevronDown,
  Sparkles,
  HardDrive,
  Users,
  FileText,
  ClipboardCheck,
  Infinity,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";

interface OrgUsageTabProps {
  organizationId: string;
}

interface UsageMetric {
  feature: string;
  label: string;
  current: number;
  limit: number | null;
  unit: string;
  icon: React.ReactNode;
}

export function OrgUsageTab({ organizationId }: OrgUsageTabProps) {
  const [limitsOpen, setLimitsOpen] = useState(false);

  // Fetch organization's full subscription details
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["org-subscription-full", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch plan limits
  const { data: planLimits } = useQuery({
    queryKey: ["plan-limits-full", subscription?.plan],
    queryFn: async () => {
      if (!subscription?.plan) return [];
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan", subscription.plan)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!subscription?.plan,
  });

  // Fetch usage records for current billing period
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["org-usage-period", organizationId, subscription?.current_period_start],
    queryFn: async () => {
      const periodStart = subscription?.current_period_start 
        ? new Date(subscription.current_period_start).toISOString()
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Fetch usage records for this period
      const { data: usageRecords } = await supabase
        .from("usage_records")
        .select("feature, quantity")
        .eq("organization_id", organizationId)
        .gte("recorded_at", periodStart);

      // Aggregate usage by feature
      const aggregated: Record<string, number> = {};
      usageRecords?.forEach((record) => {
        aggregated[record.feature] = (aggregated[record.feature] || 0) + record.quantity;
      });

      return aggregated;
    },
    enabled: !!organizationId,
  });

  const getLimit = (feature: string): number | null => {
    const limit = planLimits?.find(l => l.feature === feature);
    if (!limit) return null;
    if (limit.monthly_limit === -1 || limit.monthly_limit === null) return null;
    return limit.monthly_limit;
  };

  const getOverageRate = (feature: string): number | null => {
    const limit = planLimits?.find(l => l.feature === feature);
    return limit?.overage_rate || null;
  };

  const usageMetrics: UsageMetric[] = [
    {
      feature: "ai_queries",
      label: "AI Queries",
      current: usageData?.ai_queries || 0,
      limit: getLimit("ai_queries"),
      unit: "queries",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      feature: "storage_gb",
      label: "Storage",
      current: usageData?.storage_gb || 0,
      limit: getLimit("storage_gb"),
      unit: "GB",
      icon: <HardDrive className="h-4 w-4" />,
    },
    {
      feature: "leave_requests",
      label: "Leave Requests",
      current: usageData?.leave_requests || 0,
      limit: getLimit("leave_requests"),
      unit: "requests",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      feature: "attendance_scans",
      label: "Attendance Scans",
      current: usageData?.attendance_scans || 0,
      limit: getLimit("attendance_scans"),
      unit: "scans",
      icon: <Users className="h-4 w-4" />,
    },
    {
      feature: "performance_reviews",
      label: "Performance Reviews",
      current: usageData?.performance_reviews || 0,
      limit: getLimit("performance_reviews"),
      unit: "reviews",
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
      trialing: "bg-blue-100 text-blue-700 border-blue-200",
      past_due: "bg-amber-100 text-amber-700 border-amber-200",
      canceled: "bg-red-100 text-red-700 border-red-200",
      incomplete: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return (
      <Badge variant="outline" className={`capitalize ${colors[status] || ""}`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const isLoading = subLoading || usageLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const periodStart = subscription?.current_period_start 
    ? format(new Date(subscription.current_period_start), "MMM d, yyyy") 
    : "-";
  const periodEnd = subscription?.current_period_end 
    ? format(new Date(subscription.current_period_end), "MMM d, yyyy") 
    : "-";

  return (
    <div className="space-y-6">
      {/* Section A: Subscription Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Current Subscription</CardTitle>
                <CardDescription>Subscription details and billing information</CardDescription>
              </div>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Plan</p>
                <div className="flex items-center gap-2">
                  <Badge className="capitalize text-sm px-3 py-1">{subscription.plan}</Badge>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Billing Cycle</p>
                <p className="font-medium capitalize">{subscription.billing_cycle}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Period</p>
                <p className="font-medium">{periodStart} - {periodEnd}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Auto-Renew</p>
                <p className="font-medium">
                  {subscription.cancel_at_period_end ? (
                    <span className="text-amber-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Canceling at period end
                    </span>
                  ) : (
                    "Yes"
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No active subscription</p>
              <p className="text-sm text-muted-foreground mt-1">
                This organization doesn't have a subscription configured
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: Usage This Period */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Usage This Period</CardTitle>
                <CardDescription>
                  {subscription?.current_period_start ? (
                    <>Billing period: {periodStart} - {periodEnd}</>
                  ) : (
                    "Current month usage"
                  )}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {usageMetrics.map((metric) => {
              const percentage = metric.limit ? Math.min((metric.current / metric.limit) * 100, 100) : 0;
              const isOverLimit = metric.limit !== null && metric.current > metric.limit;
              const isNearLimit = metric.limit !== null && percentage >= 80 && !isOverLimit;
              const isUnlimited = metric.limit === null;

              return (
                <div key={metric.feature} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">{metric.icon}</div>
                      <span className="font-medium">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOverLimit && (
                        <Badge variant="destructive" className="text-xs">Over limit</Badge>
                      )}
                      {isNearLimit && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                          Near limit
                        </Badge>
                      )}
                      <div className="text-right">
                        <span className="text-lg font-semibold">{metric.current.toLocaleString()}</span>
                        {isUnlimited ? (
                          <span className="text-muted-foreground ml-1 text-sm flex items-center gap-1 inline-flex">
                            <Infinity className="h-4 w-4" /> Unlimited
                          </span>
                        ) : (
                          <span className="text-muted-foreground ml-1 text-sm">
                            / {metric.limit?.toLocaleString()} {metric.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!isUnlimited && (
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${isOverLimit ? "[&>div]:bg-destructive" : isNearLimit ? "[&>div]:bg-amber-500" : ""}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section C: Plan Limits Reference (Collapsible) */}
      {planLimits && planLimits.length > 0 && (
        <Collapsible open={limitsOpen} onOpenChange={setLimitsOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <Database className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Plan Limits Reference</CardTitle>
                      <CardDescription>All limits and overage rates for the {subscription?.plan || "current"} plan</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${limitsOpen ? "rotate-180" : ""}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Feature</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">Included</th>
                        <th className="text-right py-2 px-3 text-sm font-medium text-muted-foreground">Overage Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {planLimits.map((limit) => (
                        <tr key={limit.id} className="border-b last:border-0">
                          <td className="py-3 px-3">
                            <span className="font-medium">{limit.feature_name || limit.feature}</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {limit.monthly_limit === -1 || limit.monthly_limit === null ? (
                              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-0">
                                <Infinity className="h-3 w-3 mr-1" /> Unlimited
                              </Badge>
                            ) : (
                              <span className="font-medium">
                                {limit.monthly_limit.toLocaleString()} {limit.unit}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {limit.overage_rate ? (
                              <span className="text-muted-foreground">
                                ${limit.overage_rate.toFixed(2)}/{limit.unit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}