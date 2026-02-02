import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";
import { RiskLevel } from "@/hooks/useChurnRisk";

interface ChurnRiskOrg {
  id: string;
  name: string;
  riskLevel: RiskLevel;
  reason: string;
  lastActivity: string | null;
  activityDrop: number;
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

const formatRelativeOrDate = (dateStr: string) => {
  const days = differenceInDays(new Date(), new Date(dateStr));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days <= 7) return `${days} days ago`;
  return format(new Date(dateStr), 'dd MMM yyyy');
};

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

      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, plan, created_at, owner_name, owner_email, industry, company_size');

      if (!orgs) {
        setAtRiskOrgs([]);
        return;
      }

      const atRisk: ChurnRiskOrg[] = [];

      for (const org of orgs) {
        const orgAge = differenceInDays(now, new Date(org.created_at));
        if (orgAge < 3) continue;

        const { count: recentCount } = await supabase
          .from('user_page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('visited_at', last30Days.toISOString());

        const { count: previousCount } = await supabase
          .from('user_page_visits')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id)
          .gte('visited_at', prev30Days.toISOString())
          .lt('visited_at', last30Days.toISOString());

        const { data: lastVisit } = await supabase
          .from('user_page_visits')
          .select('visited_at')
          .eq('organization_id', org.id)
          .order('visited_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: totalUsers } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

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

        let riskLevel: RiskLevel = 'healthy';
        let reason = '';

        if (orgAge >= 3 && orgAge < 7 && recent === 0) {
          riskLevel = 'high';
          reason = 'No activity since signup';
        }
        else if (orgAge >= 7 && orgAge < 14 && recent === 0) {
          riskLevel = 'high';
          reason = 'No activity since signup';
        } 
        else if (daysSinceActivity >= 14) {
          riskLevel = 'high';
          reason = `No activity in ${daysSinceActivity} days`;
        } 
        else if (dropPercent >= 50 && previous >= 10) {
          riskLevel = 'high';
          reason = `${dropPercent}% drop in activity`;
        } 
        else if (daysSinceActivity >= 7) {
          riskLevel = 'medium';
          reason = `No activity in ${daysSinceActivity} days`;
        } 
        else if (dropPercent >= 30 && previous >= 10) {
          riskLevel = 'medium';
          reason = `${dropPercent}% drop in activity`;
        }
        else if (orgAge >= 3 && orgAge < 14 && daysSinceActivity >= 3) {
          riskLevel = 'low';
          reason = `Slowing activity (${daysSinceActivity} days since last visit)`;
        }
        else if (totalUsers > 0 && recent < totalUsers * 4 && recent < 30) {
          riskLevel = 'low';
          reason = 'Low user engagement';
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

      atRisk.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2, healthy: 3, new: 4 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return b.activityDrop - a.activityDrop;
      });

      setAtRiskOrgs(atRisk.slice(0, 15));
    } catch (error) {
      console.error('Error analyzing churn risk:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (orgId: string) => {
    navigate(`/super-admin/organisations/${orgId}`);
  };

  // Categorize orgs by risk level
  const highRiskOrgs = atRiskOrgs.filter(o => o.riskLevel === 'high');
  const mediumRiskOrgs = atRiskOrgs.filter(o => o.riskLevel === 'medium');
  const lowRiskOrgs = atRiskOrgs.filter(o => o.riskLevel === 'low');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" />
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
          <div className="space-y-5">
            {/* Summary Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border bg-red-50 dark:bg-red-950/20">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{highRiskOrgs.length}</div>
                <div className="text-xs font-medium text-red-700 dark:text-red-300">High Risks</div>
                <div className="text-[10px] text-red-600/70 dark:text-red-400/70 flex items-center gap-1 mt-0.5">
                  {highRiskOrgs.length > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3" />
                      Needs attention
                    </>
                  ) : (
                    'None detected'
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{mediumRiskOrgs.length}</div>
                <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Medium Risks</div>
                <div className="text-[10px] text-amber-600/70 dark:text-amber-400/70 flex items-center gap-1 mt-0.5">
                  {mediumRiskOrgs.length > 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3" />
                      Monitor closely
                    </>
                  ) : (
                    'None detected'
                  )}
                </div>
              </div>
              <div className="p-3 rounded-lg border bg-orange-50 dark:bg-orange-950/20">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{lowRiskOrgs.length}</div>
                <div className="text-xs font-medium text-orange-700 dark:text-orange-300">Low Risks</div>
                <div className="text-[10px] text-orange-600/70 dark:text-orange-400/70 mt-0.5">
                  {lowRiskOrgs.length > 0 ? 'Early signs' : 'None detected'}
                </div>
              </div>
            </div>

            {/* High Risk Customers List */}
            {highRiskOrgs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">High Risk Customers</h4>
                <div className="space-y-1.5">
                  {highRiskOrgs.slice(0, 5).map((org) => (
                    <div 
                      key={org.id}
                      onClick={() => handleCardClick(org.id)}
                      className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{org.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium truncate">
                          {org.name}
                          {org.ownerName && <span className="text-muted-foreground"> • {org.ownerName}</span>}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        Joined {formatRelativeOrDate(org.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medium Risk Customers List */}
            {mediumRiskOrgs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Medium Risk Customers</h4>
                <div className="space-y-1.5">
                  {mediumRiskOrgs.slice(0, 3).map((org) => (
                    <div 
                      key={org.id}
                      onClick={() => handleCardClick(org.id)}
                      className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{org.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium truncate">
                          {org.name}
                          {org.ownerName && <span className="text-muted-foreground"> • {org.ownerName}</span>}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        Joined {formatRelativeOrDate(org.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChurnRiskCard;
