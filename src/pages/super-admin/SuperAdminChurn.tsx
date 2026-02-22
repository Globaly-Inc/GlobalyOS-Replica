import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockChurnPredictions, mockCohortData, mockWinBackCampaigns } from '@/data/subscriptions-mock';
import KPICard from '@/components/super-admin/subscriptions/overview/KPICard';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

const churnReasonData = [
  { name: 'Too Expensive', value: 32 },
  { name: 'Missing Features', value: 24 },
  { name: 'Not Using It', value: 19 },
  { name: 'Switched Competitor', value: 15 },
  { name: 'Other', value: 10 },
];
const COLORS = ['hsl(0, 72%, 51%)', 'hsl(38, 92%, 50%)', 'hsl(217, 91%, 60%)', 'hsl(280, 67%, 51%)', 'hsl(0, 0%, 60%)'];

const riskColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-amber-100 text-amber-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-emerald-100 text-emerald-800',
};

const retentionColor = (val: number) => {
  if (val === 0) return 'bg-muted text-muted-foreground';
  if (val >= 80) return 'bg-emerald-600 text-white';
  if (val >= 60) return 'bg-emerald-400 text-white';
  if (val >= 40) return 'bg-amber-400 text-white';
  if (val >= 20) return 'bg-orange-400 text-white';
  return 'bg-red-500 text-white';
};

const SuperAdminChurn = () => {
  const atRisk = mockChurnPredictions.filter(p => p.risk_score >= 40).sort((a, b) => b.risk_score - a.risk_score);

  return (
    <SubscriptionsLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Churn Management</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard title="Churn Rate (MRR)" value="2.3%" delta="-0.4pp vs last month" deltaType="positive" />
          <KPICard title="Churned MRR" value="$6,548" delta="this month" deltaType="negative" />
          <KPICard title="Voluntary Churn" value="61%" delta="of total churn" deltaType="neutral" />
          <KPICard title="Involuntary Churn" value="39%" delta="of total churn" deltaType="neutral" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Churn Reasons */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3">Churn Reasons</h3>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={churnReasonData} innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                    {churnReasonData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win-Back */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3">Win-Back Campaigns</h3>
            <Table>
              <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Trigger</TableHead><TableHead>Sent</TableHead><TableHead>Reactivated</TableHead><TableHead>Rate</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockWinBackCampaigns.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell className="text-muted-foreground">{w.trigger_days}d</TableCell>
                    <TableCell>{w.emails_sent}</TableCell>
                    <TableCell>{w.reactivations}</TableCell>
                    <TableCell className="font-medium text-emerald-600">{w.conversion_rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Cohort Retention */}
        <div className="bg-card rounded-lg border p-4 overflow-x-auto">
          <h3 className="text-lg font-semibold mb-3">Cohort Retention</h3>
          <table className="text-xs w-full">
            <thead>
              <tr>
                <th className="text-left p-1.5 text-muted-foreground font-medium">Cohort</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="text-center p-1.5 text-muted-foreground font-medium">M{i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockCohortData.map((row) => (
                <tr key={row.cohort}>
                  <td className="p-1.5 font-medium whitespace-nowrap">{row.cohort}</td>
                  {row.retention.map((val, i) => (
                    <td key={i} className={cn('text-center p-1.5 rounded-sm font-mono', retentionColor(val))}>
                      {val > 0 ? `${val}%` : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* At-Risk Orgs */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">At-Risk Organizations</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Plan</TableHead><TableHead>Risk Score</TableHead><TableHead>Level</TableHead><TableHead>Key Signals</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {atRisk.map((p) => (
                <TableRow key={p.org_id}>
                  <TableCell className="font-medium">{p.org_name}</TableCell>
                  <TableCell><Badge variant="outline">{p.plan}</Badge></TableCell>
                  <TableCell className="font-mono font-bold">{p.risk_score}</TableCell>
                  <TableCell><Badge className={cn('border-0', riskColors[p.risk_level])}>{p.risk_level}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.signals.join(', ')}</TableCell>
                  <TableCell className="text-sm text-primary font-medium">{p.recommended_action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SubscriptionsLayout>
  );
};

export default SuperAdminChurn;
