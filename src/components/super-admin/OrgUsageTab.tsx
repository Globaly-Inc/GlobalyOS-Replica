import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, MessageSquare, FileText, Users, Calendar, BarChart3 } from "lucide-react";

interface OrgUsageTabProps {
  organizationId: string;
}

interface UsageStat {
  label: string;
  current: number;
  limit: number | null;
  unit: string;
  icon: React.ReactNode;
}

export function OrgUsageTab({ organizationId }: OrgUsageTabProps) {
  // Fetch organization's subscription to get plan
  const { data: subscription } = useQuery({
    queryKey: ["org-subscription-usage", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch plan limits
  const { data: planLimits } = useQuery({
    queryKey: ["plan-limits", subscription?.plan],
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

  // Fetch actual usage counts
  const { data: usageCounts, isLoading } = useQuery({
    queryKey: ["org-usage-counts", organizationId],
    queryFn: async () => {
      const counts: Record<string, number> = {};

      // Team members (employees) - use status instead of is_active
      const { count: employeeCount } = await supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active");
      counts.team_members = employeeCount || 0;

      // Wiki pages
      const { count: wikiCount } = await supabase
        .from("wiki_pages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      counts.wiki_pages = wikiCount || 0;

      // Chat spaces
      const { count: spaceCount } = await supabase
        .from("chat_spaces")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      counts.chat_spaces = spaceCount || 0;

      // Offices
      const { count: officeCount } = await supabase
        .from("offices")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      counts.offices = officeCount || 0;

      // Projects
      const { count: projectCount } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      counts.projects = projectCount || 0;

      // Calendar events
      const { count: eventCount } = await supabase
        .from("calendar_events")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId);
      counts.calendar_events = eventCount || 0;

      // Usage records (for AI queries, etc.) - uses 'quantity' column
      const { data: usageRecords } = await supabase
        .from("usage_records")
        .select("feature, quantity")
        .eq("organization_id", organizationId);
      
      usageRecords?.forEach((record) => {
        counts[record.feature] = (counts[record.feature] || 0) + record.quantity;
      });

      return counts;
    },
  });

  const getLimit = (feature: string): number | null => {
    const limit = planLimits?.find(l => l.feature === feature);
    if (!limit) return null;
    if (limit.monthly_limit === -1 || limit.monthly_limit === null) return null;
    return limit.monthly_limit;
  };

  const usageStats: UsageStat[] = [
    {
      label: "Team Members",
      current: usageCounts?.team_members || 0,
      limit: getLimit("team_members"),
      unit: "members",
      icon: <Users className="h-4 w-4" />,
    },
    {
      label: "Wiki Pages",
      current: usageCounts?.wiki_pages || 0,
      limit: getLimit("wiki_pages"),
      unit: "pages",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      label: "Chat Spaces",
      current: usageCounts?.chat_spaces || 0,
      limit: getLimit("chat_spaces"),
      unit: "spaces",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      label: "AI Queries",
      current: usageCounts?.ai_queries || 0,
      limit: getLimit("ai_queries"),
      unit: "queries/mo",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      label: "Storage",
      current: usageCounts?.storage_gb || 0,
      limit: getLimit("storage_gb"),
      unit: "GB",
      icon: <Database className="h-4 w-4" />,
    },
    {
      label: "Calendar Events",
      current: usageCounts?.calendar_events || 0,
      limit: null, // Usually unlimited
      unit: "events",
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Feature Usage</span>
            {subscription?.plan && (
              <Badge variant="outline" className="capitalize">
                {subscription.plan} Plan
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {usageStats.map((stat) => {
              const percentage = stat.limit ? Math.min((stat.current / stat.limit) * 100, 100) : 0;
              const isOverLimit = stat.limit && stat.current > stat.limit;
              const isNearLimit = stat.limit && percentage >= 80;

              return (
                <div key={stat.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-muted">{stat.icon}</div>
                      <span className="font-medium text-sm">{stat.label}</span>
                    </div>
                    {isOverLimit && (
                      <Badge variant="destructive" className="text-xs">Over limit</Badge>
                    )}
                    {isNearLimit && !isOverLimit && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Near limit</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{stat.current.toLocaleString()}</span>
                    {stat.limit ? (
                      <span className="text-muted-foreground">/ {stat.limit.toLocaleString()} {stat.unit}</span>
                    ) : (
                      <span className="text-muted-foreground">{stat.unit} (unlimited)</span>
                    )}
                  </div>

                  {stat.limit && (
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

      {/* Plan Limits Reference */}
      {planLimits && planLimits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Limits Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {planLimits.map((limit) => (
                <div key={limit.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <span className="text-sm">{limit.feature_name || limit.feature}</span>
                  <Badge variant="secondary">
                    {limit.monthly_limit === -1 || limit.monthly_limit === null
                      ? "Unlimited"
                      : `${limit.monthly_limit} ${limit.unit}`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
