import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, TrendingDown, Calendar } from "lucide-react";
import { format, subDays, differenceInDays } from "date-fns";

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface ActivityData {
  organization_id: string;
  recent_count: number;
  previous_count: number;
  last_activity: string | null;
}

interface ChurnRiskOrg {
  id: string;
  name: string;
  riskLevel: 'high' | 'medium' | 'low';
  reason: string;
  lastActivity: string | null;
  activityDrop: number;
}

const ChurnRiskCard = () => {
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

      // Get all organizations
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, created_at');

      if (!orgs) {
        setAtRiskOrgs([]);
        return;
      }

      // Get activity counts for each org
      const atRisk: ChurnRiskOrg[] = [];

      for (const org of orgs) {
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
          .single();

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
        let riskLevel: 'high' | 'medium' | 'low' = 'low';
        let reason = '';

        if (daysSinceActivity >= 14) {
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

        if (riskLevel !== 'low') {
          atRisk.push({
            id: org.id,
            name: org.name,
            riskLevel,
            reason,
            lastActivity: lastActivityDate?.toISOString() || null,
            activityDrop: dropPercent,
          });
        }
      }

      // Sort by risk level (high first) then by activity drop
      atRisk.sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 };
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

  const getRiskBadge = (level: 'high' | 'medium' | 'low') => {
    switch (level) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">Medium Risk</Badge>;
      default:
        return <Badge variant="outline">Low Risk</Badge>;
    }
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
            {atRiskOrgs.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{org.name}</span>
                    {getRiskBadge(org.riskLevel)}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {org.reason}
                    </span>
                    {org.lastActivity && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Last: {format(new Date(org.lastActivity), 'dd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChurnRiskCard;
