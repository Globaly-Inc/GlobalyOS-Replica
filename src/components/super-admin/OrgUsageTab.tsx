import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { toast } from "sonner";
import { 
  Loader2, 
  BarChart3, 
  CreditCard,
  ChevronDown,
  Sparkles,
  HardDrive,
  Users,
  FileText,
  ClipboardCheck,
  Infinity,
  AlertCircle,
  AlertTriangle,
  Bell,
  RefreshCw,
  Settings,
  XCircle,
  CheckCircle,
  History,
  Plus,
  ArrowUpDown,
  Receipt,
  Calendar,
  DollarSign,
} from "lucide-react";
import { ChangePlanDialog } from "./ChangePlanDialog";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

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

interface TimelineEvent {
  id: string;
  type: "subscription_created" | "plan_change" | "status_change" | "invoice" | "subscription_canceled";
  date: Date;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export function OrgUsageTab({ organizationId }: OrgUsageTabProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Fetch organization's full subscription details with plan pricing
  const { data: subscription, isLoading: subLoading } = useQuery({
    queryKey: ["org-subscription-full", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans:plan (
            name,
            monthly_price,
            annual_price,
            currency
          )
        `)
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

  // Fetch usage alerts for this org
  const { data: usageAlerts } = useQuery({
    queryKey: ["usage-alerts", organizationId],
    queryFn: async () => {
      const periodStart = subscription?.current_period_start 
        ? new Date(subscription.current_period_start).toISOString()
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const { data, error } = await supabase
        .from("usage_alerts")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("billing_period_start", periodStart);
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Fetch subscription history timeline
  const { data: timelineEvents } = useQuery({
    queryKey: ["subscription-timeline", organizationId],
    queryFn: async () => {
      const events: TimelineEvent[] = [];

      // Fetch activity logs
      const { data: activityLogs } = await supabase
        .from("super_admin_activity_logs")
        .select("*")
        .eq("organization_id", organizationId)
        .in("action_type", [
          "subscription_created", "subscription_updated",
          "subscription_canceled", "plan_changed"
        ])
        .order("created_at", { ascending: false })
        .limit(20);

      // Fetch invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Map activity logs to timeline events
      activityLogs?.forEach((log) => {
        let title = "";
        let description = "";
        let type: TimelineEvent["type"] = "status_change";

        const changes = log.changes as Record<string, { from?: string; to?: string }> | null;
        const metadata = log.metadata as Record<string, unknown> | null;

        switch (log.action_type) {
          case "subscription_created":
            type = "subscription_created";
            title = "Subscription Created";
            description = `Started on "${metadata?.plan || "unknown"}" plan`;
            break;
          case "plan_changed":
            type = "plan_change";
            title = "Plan Changed";
            description = changes?.plan 
              ? `Changed from "${changes.plan.from}" to "${changes.plan.to}"`
              : "Plan was updated";
            break;
          case "subscription_canceled":
            type = "subscription_canceled";
            title = "Subscription Canceled";
            description = "Subscription was canceled";
            break;
          case "subscription_updated":
            type = "status_change";
            title = "Subscription Updated";
            if (changes?.status) {
              description = `Status changed from "${changes.status.from}" to "${changes.status.to}"`;
            } else if (changes?.billing_cycle) {
              description = `Billing cycle changed to "${changes.billing_cycle.to}"`;
            } else {
              description = "Subscription details were updated";
            }
            break;
        }

        events.push({
          id: log.id,
          type,
          date: new Date(log.created_at),
          title,
          description,
          metadata: metadata || undefined,
        });
      });

      // Map invoices to timeline events
      invoices?.forEach((invoice) => {
        const currency = (invoice.currency as string) || "USD";
        const amount = invoice.amount || 0;
        const formattedAmount = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
        }).format(amount);

        events.push({
          id: invoice.id,
          type: "invoice",
          date: new Date(invoice.created_at),
          title: `Invoice ${invoice.invoice_number || invoice.id.slice(0, 8)}`,
          description: `${invoice.status} - ${formattedAmount}`,
          metadata: { amount: invoice.amount, currency: invoice.currency, status: invoice.status },
        });
      });

      // Sort by date descending
      return events.sort((a, b) => b.date.getTime() - a.date.getTime());
    },
    enabled: !!organizationId,
  });

  // Update subscription mutation
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      if (!subscription) return;
      const previousStatus = subscription.status;
      const { error } = await supabase
        .from("subscriptions")
        .update({ status })
        .eq("id", subscription.id);
      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: status === 'canceled' ? 'subscription_canceled' : 'subscription_updated',
        entityType: 'subscription',
        entityId: subscription.id,
        changes: { status: { from: previousStatus, to: status } }
      });
    },
    onSuccess: () => {
      toast.success("Subscription updated");
      queryClient.invalidateQueries({ queryKey: ["org-subscription-full", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["subscription-timeline", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update subscription");
    },
  });

  // Send usage alert mutation
  const sendAlertMutation = useMutation({
    mutationFn: async ({ feature, threshold }: { feature: string; threshold: number }) => {
      const periodStart = subscription?.current_period_start 
        ? new Date(subscription.current_period_start).toISOString()
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      // Record the alert
      const { error } = await supabase
        .from("usage_alerts")
        .insert({
          organization_id: organizationId,
          feature,
          threshold_percent: threshold,
          billing_period_start: periodStart,
        });

      if (error && !error.message.includes("duplicate")) throw error;

      // Create notification for org admins
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .in("role", ["admin", "owner"]);

      if (orgMembers && orgMembers.length > 0) {
        const notifications = orgMembers.map((member) => ({
          user_id: member.user_id,
          type: threshold === 100 ? "usage_limit_reached" : "usage_warning",
          title: threshold === 100 
            ? `Usage limit reached for ${feature.replace("_", " ")}`
            : `Approaching limit for ${feature.replace("_", " ")}`,
          message: threshold === 100
            ? `Your organization has reached the limit for ${feature.replace("_", " ")}. Consider upgrading your plan.`
            : `Your organization has used ${threshold}% of ${feature.replace("_", " ")} for this billing period.`,
          metadata: { feature, threshold, organization_id: organizationId },
        }));

        await supabase.from("notifications").insert(notifications);
      }

      await logActivity({
        organizationId,
        actionType: "usage_alert_sent",
        entityType: "organization",
        metadata: { feature, threshold },
      });
    },
    onSuccess: () => {
      toast.success("Usage alert sent to organization admins");
      queryClient.invalidateQueries({ queryKey: ["usage-alerts", organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to send alert");
    },
  });

  const getLimit = (feature: string): number | null => {
    const limit = planLimits?.find(l => l.feature === feature);
    if (!limit) return null;
    if (limit.monthly_limit === -1 || limit.monthly_limit === null) return null;
    return limit.monthly_limit;
  };

  const hasAlertSent = (feature: string, threshold: number): boolean => {
    return usageAlerts?.some(
      (a) => a.feature === feature && a.threshold_percent === threshold
    ) || false;
  };

  const formatPrice = () => {
    const planData = subscription?.subscription_plans as { 
      name?: string; 
      monthly_price?: number; 
      annual_price?: number; 
      currency?: string 
    } | null;
    
    if (!planData) return "Custom";
    
    const price = subscription?.billing_cycle === "annual" 
      ? planData.annual_price 
      : planData.monthly_price;
    
    if (!price || price === 0) return "Custom";
    
    const currency = planData.currency || "USD";
    const period = subscription?.billing_cycle === "annual" ? "/yr" : "/mo";
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price) + period;
  };

  const getCurrency = () => {
    const planData = subscription?.subscription_plans as { currency?: string } | null;
    return planData?.currency || "USD";
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

  const getTimelineIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "subscription_created":
        return { icon: Plus, bgColor: "bg-emerald-100", textColor: "text-emerald-600" };
      case "plan_change":
        return { icon: ArrowUpDown, bgColor: "bg-blue-100", textColor: "text-blue-600" };
      case "status_change":
        return { icon: RefreshCw, bgColor: "bg-amber-100", textColor: "text-amber-600" };
      case "invoice":
        return { icon: Receipt, bgColor: "bg-purple-100", textColor: "text-purple-600" };
      case "subscription_canceled":
        return { icon: XCircle, bgColor: "bg-red-100", textColor: "text-red-600" };
      default:
        return { icon: History, bgColor: "bg-muted", textColor: "text-muted-foreground" };
    }
  };

  // Get features approaching or at limit
  const alertableFeatures = usageMetrics.filter((m) => {
    if (m.limit === null) return false;
    const percentage = (m.current / m.limit) * 100;
    return percentage >= 80;
  });

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
      {/* Section A: Subscription Overview - Redesigned */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Current Subscription</CardTitle>
              <CardDescription>Subscription details and billing information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-6">
              {/* Row 1: Key Info Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Plan</p>
                  <Badge className="capitalize text-sm px-3 py-1">{subscription.plan}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
                  {getStatusBadge(subscription.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Billing Cycle</p>
                  <p className="font-medium capitalize">{subscription.billing_cycle}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Price</p>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p className="font-semibold">{formatPrice()}</p>
                    <span className="text-xs text-muted-foreground">({getCurrency()})</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Period & Auto-Renew */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Current Period:</span>
                  <span className="font-medium">{periodStart} - {periodEnd}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Auto-Renew:</span>
                  {subscription.cancel_at_period_end ? (
                    <span className="text-amber-600 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Canceling at period end
                    </span>
                  ) : (
                    <span className="font-medium text-emerald-600">Yes</span>
                  )}
                </div>
              </div>

              {/* Row 3: Action Buttons - All Aligned Together */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setChangePlanOpen(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Change Plan
                </Button>
                {subscription.status === "active" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSubscriptionMutation.mutate({ status: "canceled" })}
                    disabled={updateSubscriptionMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </Button>
                )}
                {["canceled", "past_due", "unpaid"].includes(subscription.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateSubscriptionMutation.mutate({ status: "active" })}
                    disabled={updateSubscriptionMutation.isPending}
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate Subscription
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No active subscription</p>
              <p className="text-sm text-muted-foreground mt-1">
                This organization doesn't have a subscription configured
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setChangePlanOpen(true)}
              >
                Create Subscription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section B: Usage Alerts */}
      {alertableFeatures.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle className="text-amber-900">Usage Alerts</CardTitle>
                  <CardDescription className="text-amber-700">
                    Features approaching or at their limits
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertableFeatures.map((metric) => {
                const percentage = metric.limit ? (metric.current / metric.limit) * 100 : 0;
                const isOver = percentage >= 100;
                const threshold = isOver ? 100 : 80;
                const alertSent = hasAlertSent(metric.feature, threshold);

                return (
                  <div
                    key={metric.feature}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isOver ? "bg-red-100" : "bg-amber-100"}`}>
                        {metric.icon}
                      </div>
                      <div>
                        <p className="font-medium">{metric.label}</p>
                        <p className="text-sm text-muted-foreground">
                          {metric.current.toLocaleString()} / {metric.limit?.toLocaleString()} {metric.unit}
                          <span className="ml-2">({Math.round(percentage)}%)</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {alertSent ? (
                        <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                          <Bell className="h-3 w-3 mr-1" />
                          Alert Sent
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sendAlertMutation.mutate({ feature: metric.feature, threshold })}
                          disabled={sendAlertMutation.isPending}
                        >
                          <Bell className="h-4 w-4 mr-1" />
                          Send Alert
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section C: Usage This Period */}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["org-usage-period", organizationId] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
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

      {/* Section D: Subscription History Timeline (Collapsible) */}
      {timelineEvents && timelineEvents.length > 0 && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <History className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Subscription History</CardTitle>
                      <CardDescription>Timeline of plan changes and billing events</CardDescription>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Separator className="mb-4" />
                <div className="space-y-1">
                  {timelineEvents.map((event, index) => {
                    const { icon: Icon, bgColor, textColor } = getTimelineIcon(event.type);
                    const isLast = index === timelineEvents.length - 1;

                    return (
                      <div key={event.id} className="flex gap-4">
                        {/* Timeline line and icon */}
                        <div className="flex flex-col items-center">
                          <div className={`p-2 rounded-full ${bgColor}`}>
                            <Icon className={`h-4 w-4 ${textColor}`} />
                          </div>
                          {!isLast && (
                            <div className="w-px h-full bg-border flex-1 min-h-8" />
                          )}
                        </div>

                        {/* Event content */}
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{event.title}</p>
                              <p className="text-sm text-muted-foreground">{event.description}</p>
                            </div>
                            <time className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(event.date, "MMM d, yyyy")}
                            </time>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Change Plan Dialog */}
      <ChangePlanDialog
        open={changePlanOpen}
        onOpenChange={setChangePlanOpen}
        organizationId={organizationId}
        currentPlan={subscription?.plan || null}
        currentBillingCycle={subscription?.billing_cycle || null}
        subscriptionId={subscription?.id || null}
      />
    </div>
  );
}
