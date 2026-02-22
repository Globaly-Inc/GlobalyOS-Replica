import KPICard from './KPICard';
import AlertPanel from './AlertPanel';
import {
  mockMRRMovement, mockSubscriberWaterfall, mockPlans, mockPaymentHealth, mockAlerts,
} from '@/data/subscriptions-mock';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(0, 72%, 51%)'];
const PLAN_COLORS = ['hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(280, 67%, 51%)'];

const revenueByPlan = mockPlans.filter(p => p.status === 'active').map((p, i) => ({
  name: p.name,
  value: p.mrr,
  fill: PLAN_COLORS[i],
}));

const sparklines = {
  mrr: [245, 252, 260, 268, 274, 280, 278, 284],
  arr: [2940, 3024, 3120, 3216, 3288, 3360, 3336, 3416],
  subs: [1620, 1660, 1700, 1740, 1780, 1810, 1823, 1847],
  trial: [28, 30, 31, 32, 33, 34, 34, 35],
  churn: [3.2, 3.0, 2.8, 2.9, 2.7, 2.6, 2.5, 2.3],
  nrr: [104, 106, 107, 108, 109, 110, 111, 112],
  arpu: [138, 140, 142, 145, 148, 150, 152, 154],
  fail: [2.4, 2.6, 2.5, 2.7, 2.8, 2.9, 3.0, 3.1],
};

const OverviewDashboard = () => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-foreground">Subscription Overview</h2>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard title="Monthly Recurring Revenue" value="$284,720" delta="+8.2% vs last month" deltaType="positive" sparklineData={sparklines.mrr} />
      <KPICard title="Annual Recurring Revenue" value="$3,416,640" delta="+8.2% vs last month" deltaType="positive" sparklineData={sparklines.arr} />
      <KPICard title="Active Subscribers" value="1,847" delta="+124 this month" deltaType="positive" sparklineData={sparklines.subs} />
      <KPICard title="Trial Conversion Rate" value="34.7%" delta="+2.1pp" deltaType="positive" sparklineData={sparklines.trial} />
      <KPICard title="MRR Churn Rate" value="2.3%" delta="-0.4pp" deltaType="positive" sparklineData={sparklines.churn} />
      <KPICard title="Net Revenue Retention" value="112%" delta="+3pp" deltaType="positive" sparklineData={sparklines.nrr} />
      <KPICard title="Avg Revenue Per Org" value="$154" delta="+$8" deltaType="positive" sparklineData={sparklines.arpu} />
      <KPICard title="Failed Payment Rate" value="3.1%" delta="+0.3pp" deltaType="negative" sparklineData={sparklines.fail} />
    </div>

    {/* Charts + Alerts */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Charts — 2 columns */}
      <div className="xl:col-span-2 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* MRR Growth */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">MRR Growth</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockMRRMovement}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="new_mrr" stackId="1" fill={COLORS[0]} stroke={COLORS[0]} name="New" />
                  <Area type="monotone" dataKey="expansion_mrr" stackId="1" fill={COLORS[1]} stroke={COLORS[1]} name="Expansion" />
                  <Area type="monotone" dataKey="reactivation_mrr" stackId="1" fill="hsl(180, 60%, 45%)" stroke="hsl(180, 60%, 45%)" name="Reactivation" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subscriber Waterfall */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Subscriber Waterfall</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockSubscriberWaterfall}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="new_subs" fill={COLORS[0]} name="New" />
                  <Bar dataKey="reactivated" fill="hsl(180, 60%, 45%)" name="Reactivated" />
                  <Bar dataKey="upgraded" fill={COLORS[1]} name="Upgraded" />
                  <Bar dataKey="downgraded" fill={COLORS[2]} name="Downgraded" />
                  <Bar dataKey="churned" fill={COLORS[3]} name="Churned" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Plan */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Revenue by Plan</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={revenueByPlan} innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {revenueByPlan.map((_, idx) => <Cell key={idx} fill={PLAN_COLORS[idx]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Health */}
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Payment Health (30d)</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockPaymentHealth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="successful" stackId="a" fill={COLORS[1]} name="Successful" />
                  <Bar dataKey="failed" stackId="a" fill={COLORS[3]} name="Failed" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Panel */}
      <div className="xl:col-span-1">
        <div className="bg-card rounded-lg border p-4 sticky top-36">
          <AlertPanel alerts={mockAlerts} />
        </div>
      </div>
    </div>
  </div>
);

export default OverviewDashboard;
