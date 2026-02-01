import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, differenceInDays } from "date-fns";

export type RiskLevel = 'high' | 'medium' | 'low' | 'healthy' | 'new';

export interface ChurnRiskData {
  organizationId: string;
  riskLevel: RiskLevel;
  reason: string;
  daysSinceActivity: number;
  activityDropPercent: number;
  recentActivityCount: number;
  previousActivityCount: number;
  lastActivity: string | null;
}

interface ActivityData {
  organization_id: string;
  recent_count: number;
  previous_count: number;
  last_activity: string | null;
}

const calculateRiskLevel = (
  recentCount: number,
  previousCount: number,
  daysSinceActivity: number,
  orgAgeInDays: number
): { level: RiskLevel; reason: string } => {
  // New orgs (less than 7 days old) get a "new" label
  if (orgAgeInDays < 7) {
    return { level: 'new', reason: 'New organisation' };
  }

  // Inactive new org (7-14 days old with no activity)
  if (orgAgeInDays >= 7 && orgAgeInDays < 14 && daysSinceActivity >= 999) {
    return { level: 'high', reason: 'No activity since signup' };
  }

  // No activity ever (for older orgs)
  if (daysSinceActivity >= 999) {
    return { level: 'high', reason: 'No recorded activity' };
  }

  // Calculate drop percentage
  const dropPercent = previousCount > 0
    ? Math.round(((previousCount - recentCount) / previousCount) * 100)
    : (recentCount === 0 ? 100 : 0);

  // High risk conditions
  if (daysSinceActivity >= 14) {
    return { level: 'high', reason: `No activity in ${daysSinceActivity} days` };
  }
  if (dropPercent >= 50 && previousCount >= 10) {
    return { level: 'high', reason: `${dropPercent}% drop in activity` };
  }

  // Medium risk conditions
  if (daysSinceActivity >= 7) {
    return { level: 'medium', reason: `No activity in ${daysSinceActivity} days` };
  }
  if (dropPercent >= 30 && previousCount >= 10) {
    return { level: 'medium', reason: `${dropPercent}% drop in activity` };
  }

  // Low risk conditions
  if (dropPercent >= 15 && previousCount >= 10) {
    return { level: 'low', reason: `${dropPercent}% activity decrease` };
  }

  return { level: 'healthy', reason: 'Healthy activity' };
};

const fetchChurnRiskData = async (organizationIds: string[]): Promise<Map<string, ChurnRiskData>> => {
  if (organizationIds.length === 0) {
    return new Map();
  }

  const now = new Date();
  const last30Days = subDays(now, 30);
  const prev30Days = subDays(now, 60);

  // Get organisation created_at dates for age calculation
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, created_at')
    .in('id', organizationIds);

  const orgAges = new Map<string, number>(
    (orgs || []).map(org => [
      org.id,
      differenceInDays(now, new Date(org.created_at))
    ])
  );

  // Batch fetch activity data for all orgs
  const activityPromises = organizationIds.map(async (orgId): Promise<ActivityData> => {
    // Recent activity (last 30 days)
    const { count: recentCount } = await supabase
      .from('user_page_visits')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('visited_at', last30Days.toISOString());

    // Previous period activity (30-60 days ago)
    const { count: previousCount } = await supabase
      .from('user_page_visits')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('visited_at', prev30Days.toISOString())
      .lt('visited_at', last30Days.toISOString());

    // Get last activity date
    const { data: lastVisit } = await supabase
      .from('user_page_visits')
      .select('visited_at')
      .eq('organization_id', orgId)
      .order('visited_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      organization_id: orgId,
      recent_count: recentCount || 0,
      previous_count: previousCount || 0,
      last_activity: lastVisit?.visited_at || null,
    };
  });

  const activityResults = await Promise.all(activityPromises);
  
  const riskMap = new Map<string, ChurnRiskData>();

  for (const activity of activityResults) {
    const lastActivityDate = activity.last_activity
      ? new Date(activity.last_activity)
      : null;
    const daysSinceActivity = lastActivityDate
      ? differenceInDays(now, lastActivityDate)
      : 999;

    const orgAge = orgAges.get(activity.organization_id) || 0;
    const dropPercent = activity.previous_count > 0
      ? Math.round(((activity.previous_count - activity.recent_count) / activity.previous_count) * 100)
      : (activity.recent_count === 0 ? 100 : 0);

    const { level, reason } = calculateRiskLevel(
      activity.recent_count,
      activity.previous_count,
      daysSinceActivity,
      orgAge
    );

    riskMap.set(activity.organization_id, {
      organizationId: activity.organization_id,
      riskLevel: level,
      reason,
      daysSinceActivity,
      activityDropPercent: dropPercent,
      recentActivityCount: activity.recent_count,
      previousActivityCount: activity.previous_count,
      lastActivity: activity.last_activity,
    });
  }

  return riskMap;
};

export const useChurnRisk = (organizationIds: string[]) => {
  return useQuery({
    queryKey: ['churn-risk', organizationIds.sort().join(',')],
    queryFn: () => fetchChurnRiskData(organizationIds),
    enabled: organizationIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Export utility for getting risk from the map
export const getRiskForOrg = (
  riskMap: Map<string, ChurnRiskData> | undefined,
  orgId: string
): ChurnRiskData | null => {
  return riskMap?.get(orgId) || null;
};
