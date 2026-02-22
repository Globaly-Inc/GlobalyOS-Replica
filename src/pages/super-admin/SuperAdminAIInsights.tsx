import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockChurnPredictions, mockUpsellSignals, mockAnomalies } from '@/data/subscriptions-mock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, Info, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';

const actionFeed = [
  { severity: 'critical' as const, icon: AlertCircle, message: '5 orgs have churn risk >80%', impact: 'Projected MRR at risk: $3,240', actions: ['View Orgs', 'Create Campaign'], detail: 'Recommended: Assign personalized win-back offer' },
  { severity: 'warning' as const, icon: AlertTriangle, message: '31 orgs are at or above seat ceiling', impact: 'Potential expansion MRR: $4,650', actions: ['View Orgs', 'Send Nudge'], detail: 'Recommended: Trigger upgrade nudge sequence' },
  { severity: 'warning' as const, icon: AlertTriangle, message: 'Trial conversion rate dropped 4.2pp in last 14 days', impact: 'Signal: Avg feature adoption in trial at historic low', actions: ['View Analysis'], detail: 'Recommended: Review trial onboarding flow' },
  { severity: 'info' as const, icon: Info, message: '8 churned orgs from Jan haven\'t received win-back touchpoint 2', impact: '', actions: ['Schedule Emails'], detail: 'Recommended: Send win-back email sequence' },
];

const severityStyles = {
  critical: 'border-l-destructive bg-gradient-to-r from-red-50 to-transparent',
  warning: 'border-l-amber-500 bg-gradient-to-r from-amber-50 to-transparent',
  info: 'border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-transparent',
};

const anomalyStatusColors: Record<string, string> = {
  resolved: 'bg-emerald-100 text-emerald-800',
  investigating: 'bg-blue-100 text-blue-800',
  flagged: 'bg-red-100 text-red-800',
  documented: 'bg-gray-100 text-gray-600',
};

const scatterData = mockChurnPredictions.map((p) => ({
  x: p.days_since_login,
  y: p.feature_adoption_score,
  z: Math.max(p.mrr, 50),
  name: p.org_name,
  risk: p.risk_score,
  plan: p.plan,
  mrr: p.mrr,
}));

const SuperAdminAIInsights = () => (
  <SubscriptionsLayout>
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">AI Insights</h2>
      </div>

      {/* AI Action Feed */}
      <div className="space-y-3">
        {actionFeed.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className={cn('rounded-lg border border-l-4 p-4 transition-all', severityStyles[item.severity])}>
              <div className="flex items-start gap-3">
                <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', item.severity === 'critical' ? 'text-destructive' : item.severity === 'warning' ? 'text-amber-500' : 'text-emerald-500')} />
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">{item.message}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.detail}</p>
                  {item.impact && <p className="text-sm font-medium text-foreground mt-1">{item.impact}</p>}
                  <div className="flex gap-2 mt-2">
                    {item.actions.map((a) => (
                      <Button key={a} variant="outline" size="sm" className="h-7 text-xs gap-1">
                        {a} <ArrowRight className="h-3 w-3" />
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Churn Risk Scatter */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">Churn Risk Map</h3>
        <div className="h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" dataKey="x" name="Days Since Login" tick={{ fontSize: 11 }} label={{ value: 'Days Since Login', position: 'bottom', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Feature Adoption" tick={{ fontSize: 11 }} label={{ value: 'Feature Adoption Score', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <ZAxis type="number" dataKey="z" range={[40, 400]} />
              <Tooltip content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-card border rounded-lg p-2 shadow-lg text-xs">
                    <p className="font-semibold">{d.name}</p>
                    <p>Plan: {d.plan} · MRR: ${d.mrr}</p>
                    <p>Risk: {d.risk}/100</p>
                  </div>
                );
              }} />
              <Scatter data={scatterData} fill="hsl(217, 91%, 60%)" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upsell Signals */}
      <div className="bg-card rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="text-lg font-semibold">Upsell Signals</h3>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Signal</TableHead><TableHead>Current Plan</TableHead><TableHead>Recommended</TableHead><TableHead>MRR Lift</TableHead></TableRow></TableHeader>
          <TableBody>
            {mockUpsellSignals.slice(0, 10).map((s) => (
              <TableRow key={s.org_id}>
                <TableCell className="font-medium">{s.org_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[240px]">{s.signal_type}</TableCell>
                <TableCell><Badge variant="outline">{s.current_plan}</Badge></TableCell>
                <TableCell><Badge>{s.recommended_plan}</Badge></TableCell>
                <TableCell className="font-medium text-emerald-600">+${s.potential_mrr_lift}/mo</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Anomaly Feed */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">Anomaly Detection</h3>
        <div className="space-y-3">
          {mockAnomalies.map((a) => (
            <div key={a.id} className="flex items-start gap-3 py-2 border-b last:border-0">
              <span className="text-xs text-muted-foreground font-mono whitespace-nowrap mt-0.5">{a.date}</span>
              <p className="text-sm flex-1">{a.description}</p>
              <Badge className={cn('border-0 shrink-0', anomalyStatusColors[a.status])}>{a.status}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  </SubscriptionsLayout>
);

export default SuperAdminAIInsights;
