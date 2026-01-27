import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface PlanLimit {
  id: string;
  plan: string;
  feature: string;
  feature_name: string | null;
  feature_description: string | null;
  monthly_limit: number | null;
  overage_rate: number | null;
  unit: string | null;
  is_active: boolean;
}

export interface UsageRecord {
  feature: string;
  current_usage: number;
  limit: number | null;
  percentage: number;
  unit: string | null;
  is_unlimited: boolean;
  is_warning: boolean;
  is_exceeded: boolean;
}

export function useUsageLimits() {
  const { currentOrg } = useOrganization();
  const organizationId = currentOrg?.id;
  const currentPlan = currentOrg?.plan || "free";

  // Fetch plan limits for current plan
  const { data: planLimits, isLoading: limitsLoading } = useQuery({
    queryKey: ["plan-limits", currentPlan],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plan_limits")
        .select("*")
        .eq("plan", currentPlan)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as PlanLimit[];
    },
    enabled: !!currentPlan,
  });

  // Fetch current usage for the organization
  const { data: usageRecords, isLoading: usageLoading } = useQuery({
    queryKey: ["usage-records", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from("usage_records")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("period_start", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Calculate usage vs limits
  const getUsageForFeature = (feature: string): UsageRecord => {
    const limit = planLimits?.find((l) => l.feature === feature);
    const usage = usageRecords?.filter((r) => r.feature === feature).reduce((sum, r) => sum + (r.quantity || 0), 0) || 0;

    const monthlyLimit = limit?.monthly_limit ?? null;
    const isUnlimited = monthlyLimit === null || monthlyLimit === -1;
    const percentage = isUnlimited ? 0 : monthlyLimit > 0 ? Math.min((usage / monthlyLimit) * 100, 100) : 0;

    return {
      feature,
      current_usage: usage,
      limit: monthlyLimit,
      percentage,
      unit: limit?.unit || null,
      is_unlimited: isUnlimited,
      is_warning: !isUnlimited && percentage >= 80 && percentage < 100,
      is_exceeded: !isUnlimited && percentage >= 100,
    };
  };

  // Check if a feature can be used
  const canUse = (feature: string): boolean => {
    const usage = getUsageForFeature(feature);
    return usage.is_unlimited || !usage.is_exceeded;
  };

  // Get remaining usage for a feature
  const getRemainingUsage = (feature: string): number | null => {
    const usage = getUsageForFeature(feature);
    if (usage.is_unlimited || usage.limit === null) return null;
    return Math.max(0, usage.limit - usage.current_usage);
  };

  // Get all usage records for display
  const getAllUsage = (): UsageRecord[] => {
    if (!planLimits) return [];
    return planLimits.map((limit) => getUsageForFeature(limit.feature));
  };

  return {
    planLimits,
    usageRecords,
    isLoading: limitsLoading || usageLoading,
    getUsageForFeature,
    canUse,
    getRemainingUsage,
    getAllUsage,
    currentPlan,
  };
}
