import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Receipt,
  TrendingUp,
  Calendar,
  Users,
  HardDrive,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billing_cycle: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  created_at: string;
}

interface PlanLimitRow {
  plan: string;
  feature: string;
  monthly_limit: number | null;
  overage_rate: number | null;
}

interface PlanLimits {
  max_employees: number | null;
  max_storage_gb: number | null;
  max_ai_queries: number | null;
  max_leave_requests: number | null;
  max_attendance_scans: number | null;
}

interface UsageData {
  feature: string;
  quantity: number;
  monthly_limit: number | null;
  overage_rate: number | null;
}

interface UsageSummary {
  employees: number;
  storage_gb: number;
  ai_queries: number;
  leave_requests: number;
  attendance_scans: number;
}

const BillingSettings = () => {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits>({ 
    max_employees: null, 
    max_storage_gb: 5, 
    max_ai_queries: 0,
    max_leave_requests: null,
    max_attendance_scans: null,
  });
  const [usage, setUsage] = useState<UsageSummary>({ 
    employees: 0, 
    storage_gb: 0, 
    ai_queries: 0,
    leave_requests: 0,
    attendance_scans: 0,
  });

  useEffect(() => {
    if (currentOrg?.id) {
      fetchBillingData();
    }
  }, [currentOrg?.id]);

  const fetchBillingData = async () => {
    if (!currentOrg?.id) return;
    setLoading(true);

    try {
      // Fetch subscription
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .single();

      if (subData) {
        setSubscription(subData);

        // Fetch plan limits for the subscription plan
        const { data: limitData } = await supabase
          .from("plan_limits")
          .select("*")
          .eq("plan", subData.plan)
          .eq("is_active", true);

        if (limitData && limitData.length > 0) {
          const limits: PlanLimits = {
            max_employees: null,
            max_storage_gb: null,
            max_ai_queries: null,
            max_leave_requests: null,
            max_attendance_scans: null,
          };
          
          limitData.forEach((row: PlanLimitRow) => {
            if (row.feature === "storage_gb") {
              limits.max_storage_gb = row.monthly_limit;
            } else if (row.feature === "ai_queries") {
              limits.max_ai_queries = row.monthly_limit;
            } else if (row.feature === "leave_requests") {
              limits.max_leave_requests = row.monthly_limit;
            } else if (row.feature === "attendance_scans") {
              limits.max_attendance_scans = row.monthly_limit;
            }
          });
          
          setPlanLimits(limits);
        }
      }

      // Fetch invoices
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (invoiceData) {
        setInvoices(invoiceData);
      }

      // Fetch usage - employee count
      const { count: employeeCount } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");

      // Fetch real usage data from usage_records
      const billingPeriod = format(new Date(), "yyyy-MM");
      const { data: usageData } = await supabase
        .from("usage_records")
        .select("feature, quantity")
        .eq("organization_id", currentOrg.id)
        .eq("billing_period", billingPeriod);

      // Parse usage data
      const usageSummary: UsageSummary = {
        employees: employeeCount || 0,
        storage_gb: 0, // TODO: Calculate from storage bucket usage
        ai_queries: 0,
        leave_requests: 0,
        attendance_scans: 0,
      };

      if (usageData) {
        usageData.forEach((record) => {
          if (record.feature === "ai_queries") {
            usageSummary.ai_queries = record.quantity;
          } else if (record.feature === "leave_requests") {
            usageSummary.leave_requests = record.quantity;
          } else if (record.feature === "attendance_scans") {
            usageSummary.attendance_scans = record.quantity;
          } else if (record.feature === "storage_gb") {
            usageSummary.storage_gb = record.quantity;
          }
        });
      }

      setUsage(usageSummary);
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
      active: { variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
      trialing: { variant: "secondary", icon: <Clock className="h-3 w-3" /> },
      past_due: { variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
      canceled: { variant: "outline", icon: <AlertCircle className="h-3 w-3" /> },
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </Badge>
    );
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusConfig: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      draft: "outline",
      overdue: "destructive",
    };
    return <Badge variant={statusConfig[status] || "outline"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getPlanPrice = () => {
    // Pricing based on plan
    const prices: Record<string, { monthly: number; annual: number }> = {
      starter: { monthly: 149, annual: 1430 },
      growth: { monthly: 299, annual: 2870 },
      enterprise: { monthly: 0, annual: 0 },
    };
    const planPrices = prices[subscription?.plan || "starter"] || prices.starter;
    return subscription?.billing_cycle === "annual"
      ? planPrices.annual / 12
      : planPrices.monthly;
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_ends_at) return null;
    const days = differenceInDays(parseISO(subscription.trial_ends_at), new Date());
    return Math.max(0, days);
  };

  const getUsagePercentage = (current: number, limit: number | null) => {
    if (limit === null || limit === -1) return 0; // Unlimited
    if (limit === 0) return 100; // Not allowed
    return Math.min(100, (current / limit) * 100);
  };

  const formatLimit = (limit: number | null) => {
    if (limit === null || limit === -1) return "Unlimited";
    return limit.toString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const trialDays = getTrialDaysRemaining();

  return (
    <div className="space-y-6">
      {/* Trial Banner */}
      {subscription?.status === "trialing" && trialDays !== null && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">
                    {trialDays === 0
                      ? "Your trial ends today!"
                      : `${trialDays} day${trialDays !== 1 ? "s" : ""} left in your trial`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Add a payment method to continue using all features after your trial ends.
                  </p>
                </div>
              </div>
              <Button>Add Payment Method</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Your subscription details and billing information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-2xl font-bold capitalize">{subscription?.plan || "Free"}</h3>
                {subscription && getStatusBadge(subscription.status)}
              </div>
              <p className="text-muted-foreground">
                ${getPlanPrice().toFixed(0)}/month
                {subscription?.billing_cycle === "annual" && (
                  <span className="text-sm ml-1">(billed annually)</span>
                )}
              </p>
            </div>
            <div className="text-right">
              {subscription?.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  {subscription.cancel_at_period_end ? "Cancels on" : "Renews on"}{" "}
                  {format(parseISO(subscription.current_period_end), "MMM d, yyyy")}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm">
                  Change Plan
                </Button>
                {!subscription?.cancel_at_period_end && (
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {planLimits.max_employees ? `Up to ${planLimits.max_employees} employees` : "Unlimited employees"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formatLimit(planLimits.max_storage_gb)} GB storage</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {planLimits.max_ai_queries !== null && planLimits.max_ai_queries !== -1 
                  ? `${planLimits.max_ai_queries} AI queries/mo` 
                  : "Unlimited AI queries"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage This Period
          </CardTitle>
          <CardDescription>Track your resource usage against plan limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Employees */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Team Members</span>
              </div>
              <span className="font-medium">
                {usage.employees} {planLimits.max_employees ? `/ ${planLimits.max_employees}` : ""}
              </span>
            </div>
            <Progress
              value={getUsagePercentage(usage.employees, planLimits.max_employees)}
              className="h-2"
            />
          </div>

          {/* Storage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span>Storage</span>
              </div>
              <span className="font-medium">
                {usage.storage_gb.toFixed(1)} GB / {formatLimit(planLimits.max_storage_gb)} GB
              </span>
            </div>
            <Progress
              value={getUsagePercentage(usage.storage_gb, planLimits.max_storage_gb)}
              className="h-2"
            />
          </div>

          {/* AI Queries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span>AI Queries</span>
              </div>
              <span className="font-medium">
                {usage.ai_queries} / {formatLimit(planLimits.max_ai_queries)}
              </span>
            </div>
            {planLimits.max_ai_queries !== null && planLimits.max_ai_queries !== -1 && (
              <Progress 
                value={getUsagePercentage(usage.ai_queries, planLimits.max_ai_queries)} 
                className="h-2" 
              />
            )}
          </div>

          {/* Leave Requests */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>Leave Requests</span>
              </div>
              <span className="font-medium">
                {usage.leave_requests} / {formatLimit(planLimits.max_leave_requests)}
              </span>
            </div>
            {planLimits.max_leave_requests !== null && planLimits.max_leave_requests !== -1 && (
              <Progress 
                value={getUsagePercentage(usage.leave_requests, planLimits.max_leave_requests)} 
                className="h-2" 
              />
            )}
          </div>

          {/* Attendance Scans */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                <span>Attendance Check-ins</span>
              </div>
              <span className="font-medium">
                {usage.attendance_scans} / {formatLimit(planLimits.max_attendance_scans)}
              </span>
            </div>
            {planLimits.max_attendance_scans !== null && planLimits.max_attendance_scans !== -1 && (
              <Progress 
                value={getUsagePercentage(usage.attendance_scans, planLimits.max_attendance_scans)} 
                className="h-2" 
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice History
          </CardTitle>
          <CardDescription>View and download your past invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No invoices yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{format(parseISO(invoice.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      ${invoice.amount.toFixed(2)} {invoice.currency}
                    </TableCell>
                    <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Manage your payment information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-16 bg-muted rounded flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">No payment method on file</p>
              </div>
            </div>
            <Button variant="outline">Add Payment Method</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSettings;