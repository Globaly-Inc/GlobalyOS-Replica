import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingDown, Calendar, Users, ArrowRight, Mail, Building2, ExternalLink } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import ChurnRiskBadge from "./ChurnRiskBadge";
import { RiskLevel } from "@/hooks/useChurnRisk";

interface ChurnRiskOrg {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  reason: string;
  lastActivity: string | null;
  activityDrop: number;
  // Enhanced fields
  recentActivityCount: number;
  previousActivityCount: number;
  totalUsers: number;
  activeUsers: number;
  plan: string;
  ownerName: string | null;
  ownerEmail: string | null;
  industry: string | null;
  companySize: string | null;
  createdAt: string;
}

const ChurnRiskCard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [atRiskOrgs, setAtRiskOrgs] = useState<ChurnRiskOrg[]>([]);

  useEffect(() => {
    analyzeChurnRisk();
  }, []);

  const analyzeChurnRisk = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const last30Days = subDays(now, 30);
      const prev30Days = subDays(now, 60);

      // Get all organizations with additional details
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, plan, created_at, owner_name, owner_email, industry, company_size');

      if (!orgs) {
        setAtRiskOrgs([]);
        return;
      }

      // Get activity counts for each org
      const atRisk: ChurnRiskOrg[] = [];

      for (const org of orgs) {
        // Skip very new orgs (less than 7 days old)
        const orgAge = differenceInDays(now, new Date(org.created_at));
        if (orgAge < 7) continue;

        // Recent activity (last 30 days)
        const { count: recentCount } = await supabase
          .from('user_page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('visited_at', last30Days.toISOString());

        // Previous period activity (30-60 days ago)
        const { count: previousCount } = await supabase
          .from('user_page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('visited_at', prev30Days.toISOString())
          .lt('visited_at', last30Days.toISOString());

        // Get last activity date
        const { data: lastVisit } = await supabase
          .from('user_page_visits')
          .select('visited_at')
          .eq('organization_id', org.id)
          .order('visited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get total users count
        const { count: totalUsers } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        // Get active users (distinct users with activity in last 30 days)
        const { data: activeUserData } = await supabase
          .from('user_page_visits')
          .select('user_id')
          .eq('organization_id', org.id)
          .gte('visited_at', last30Days.toISOString());
        
        const activeUsers = new Set(activeUserData?.map(u => u.user_id) || []).size;

        const recent = recentCount || 0;
        const previous = previousCount || 0;
        const dropPercent = previous > 0 
          ? Math.round(((previous - recent) / previous) * 100) 
          : (recent === 0 ? 100 : 0);

        const lastActivityDate = lastVisit?.visited_at 
          ? new Date(lastVisit.visited_at) 
          : null;
        const daysSinceActivity = lastActivityDate 
          ? differenceInDays(now, lastActivityDate) 
          : 999;

        // Determine risk level
        let riskLevel: RiskLevel = 'healthy';
        let reason = '';

        // Inactive new org (7-14 days old with no activity)
        if (orgAge >= 7 && orgAge < 14 && recent === 0) {
          riskLevel = 'high';
          reason = 'No activity since signup';
        } else if (daysSinceActivity >= 14) {
          riskLevel = 'high';
          reason = `No activity in ${daysSinceActivity} days`;
        } else if (dropPercent >= 50 && previous >= 10) {
          riskLevel = 'high';
          reason = `${dropPercent}% drop in activity`;
        } else if (daysSinceActivity >= 7) {
          riskLevel = 'medium';
          reason = `No activity in ${daysSinceActivity} days`;
        } else if (dropPercent >= 30 && previous >= 10) {
          riskLevel = 'medium';
          reason = `${dropPercent}% drop in activity`;
        }

        if (riskLevel !== 'healthy') {
          atRisk.push({
            id: org.id,
            name: org.name,
            riskLevel,
            reason,
            lastActivity: lastActivityDate?.toISOString() || null,
            activityDrop: dropPercent,
            recentActivityCount: recent,
            previousActivityCount: previous,
            totalUsers: totalUsers || 0,
            activeUsers,
            plan: org.plan || 'free',
            ownerName: org.owner_name,
            ownerEmail: org.owner_email,
            industry: org.industry,
            companySize: org.company_size,
            createdAt: org.created_at,
          });
        }
      }

      // Sort by risk level (high first) then by activity drop
      atRisk.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2, healthy: 3, new: 4 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return b.activityDrop - a.activityDrop;
      });

      setAtRiskOrgs(atRisk.slice(0, 10)); // Top 10 at-risk orgs
    } catch (error) {
      console.error('Error analyzing churn risk:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (orgId: string) => {
    navigate(`/super-admin/organisations/${orgId}`);
  };

  const getActivityTrend = (recent: number, previous: number) => {
    if (previous === 0) return null;
    const change = Math.round(((recent - previous) / previous) * 100);
    return change;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Churn Risk Indicators
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : atRiskOrgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-muted-foreground">No at-risk organisations detected</p>
            <p className="text-xs text-muted-foreground mt-1">All organisations show healthy activity levels</p>
          </div>
        ) : (
          <div className="space-y-3">
            {atRiskOrgs.map((org) => {
              const trend = getActivityTrend(org.recentActivityCount, org.previousActivityCount);
              
              return (
                <div
                  key={org.id}
                  onClick={() => handleCardClick(org.id)}
                  className="p-4 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all group"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium truncate">{org.name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">{org.plan} Plan</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <ChurnRiskBadge level={org.riskLevel} reason={org.reason} size="sm" />
                      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Owner Info */}
                  {(org.ownerName || org.ownerEmail) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">
                        {org.ownerName && <span className="font-medium">{org.ownerName}</span>}
                        {org.ownerName && org.ownerEmail && ' • '}
                        {org.ownerEmail && <span>{org.ownerEmail}</span>}
                      </span>
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {/* Activity Metric */}
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <TrendingDown className="h-3 w-3" />
                        <span>Activity</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{org.previousActivityCount}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{org.recentActivityCount}</span>
                        {trend !== null && trend !== 0 && (
                          <span className={`text-xs ml-1 ${trend < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                            ({trend > 0 ? '+' : ''}{trend}%)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Users Metric */}
                    <div className="p-2 rounded bg-background/50 border border-border/50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Users className="h-3 w-3" />
                        <span>Users</span>
                      </div>
                      <div className="text-sm font-medium">
                        <span className={org.activeUsers === 0 ? 'text-destructive' : ''}>{org.activeUsers}</span>
                        <span className="text-muted-foreground"> / {org.totalUsers} active</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span>{org.reason}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {org.lastActivity && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Last: {format(new Date(org.lastActivity), 'dd MMM')}
                        </span>
                      )}
                      <span>Joined: {format(new Date(org.createdAt), 'MMM yyyy')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChurnRiskCard;
