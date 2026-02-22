import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockDunningCampaigns, mockDunningRuns } from '@/data/subscriptions-mock';
import KPICard from '@/components/super-admin/subscriptions/overview/KPICard';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const recoveryBreakdown = [
  { name: 'Intelligent Retry', value: 48 },
  { name: 'Backup Payment', value: 23 },
  { name: 'Account Updater', value: 18 },
  { name: 'Manual', value: 11 },
];
const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(280, 67%, 51%)'];

const SuperAdminDunning = () => (
  <SubscriptionsLayout>
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dunning & Recovery</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Recovered This Month" value="$28,400" delta="+$3,200 vs last month" deltaType="positive" />
        <KPICard title="Recovery Rate" value="67%" delta="of failed invoices" deltaType="neutral" />
        <KPICard title="Avg Recovery Time" value="4.2 days" delta="" deltaType="neutral" />
        <KPICard title="Active Dunning Runs" value="23" delta="orgs currently in dunning" deltaType="neutral" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recovery Breakdown */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Recovery Breakdown</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={recoveryBreakdown} innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value" label={({ name, value }) => `${name} ${value}%`}>
                  {recoveryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Dunning Campaigns</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Campaign</TableHead><TableHead>Plans</TableHead><TableHead>Stages</TableHead><TableHead>Rate</TableHead><TableHead>Runs</TableHead></TableRow></TableHeader>
            <TableBody>
              {mockDunningCampaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{c.assigned_to}</TableCell>
                  <TableCell>{c.stages.length}</TableCell>
                  <TableCell>{c.recovery_rate}%</TableCell>
                  <TableCell><Badge variant="outline">{c.active_runs}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Active Runs */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">Active Dunning Runs</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Stage</TableHead><TableHead>Days Overdue</TableHead><TableHead>Amount</TableHead><TableHead>Next Retry</TableHead><TableHead>Last Email</TableHead></TableRow></TableHeader>
          <TableBody>
            {mockDunningRuns.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.org_name}</TableCell>
                <TableCell>{r.current_stage}/{r.total_stages}</TableCell>
                <TableCell><Badge variant="destructive">{r.days_overdue}d</Badge></TableCell>
                <TableCell>${r.amount}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.next_retry}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{r.last_email_sent}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  </SubscriptionsLayout>
);

export default SuperAdminDunning;
