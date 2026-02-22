import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockMRRMovement, mockPlans, mockRevenueForecast } from '@/data/subscriptions-mock';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = {
  new: 'hsl(217, 91%, 60%)',
  expansion: 'hsl(142, 71%, 45%)',
  reactivation: 'hsl(180, 60%, 45%)',
  contraction: 'hsl(38, 92%, 50%)',
  churn: 'hsl(0, 72%, 51%)',
};

const SuperAdminRevenueAnalytics = () => (
  <SubscriptionsLayout>
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Revenue Analytics</h2>

      <Tabs defaultValue="mrr">
        <TabsList>
          <TabsTrigger value="mrr">MRR Movement</TabsTrigger>
          <TabsTrigger value="plans">Plan Performance</TabsTrigger>
          <TabsTrigger value="forecast">Revenue Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="mrr" className="space-y-4">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3">MRR Movement (12 Months)</h3>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockMRRMovement}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="new_mrr" fill={COLORS.new} name="New" />
                  <Bar dataKey="expansion_mrr" fill={COLORS.expansion} name="Expansion" />
                  <Bar dataKey="reactivation_mrr" fill={COLORS.reactivation} name="Reactivation" />
                  <Bar dataKey="contraction_mrr" fill={COLORS.contraction} name="Contraction" />
                  <Bar dataKey="churn_mrr" fill={COLORS.churn} name="Churn" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead><TableHead>New</TableHead><TableHead>Expansion</TableHead><TableHead>Reactivation</TableHead><TableHead>Contraction</TableHead><TableHead>Churn</TableHead><TableHead className="font-bold">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockMRRMovement.map((m) => (
                  <TableRow key={m.month}>
                    <TableCell className="font-medium">{m.month}</TableCell>
                    <TableCell className="text-emerald-600">${m.new_mrr.toLocaleString()}</TableCell>
                    <TableCell className="text-emerald-600">${m.expansion_mrr.toLocaleString()}</TableCell>
                    <TableCell className="text-emerald-600">${m.reactivation_mrr.toLocaleString()}</TableCell>
                    <TableCell className="text-amber-600">${m.contraction_mrr.toLocaleString()}</TableCell>
                    <TableCell className="text-destructive">${m.churn_mrr.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">${m.net_mrr.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="plans">
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead><TableHead>Subscribers</TableHead><TableHead>MRR</TableHead><TableHead>% of Total</TableHead><TableHead>Avg MRR/Org</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPlans.map((p) => {
                  const totalMrr = mockPlans.reduce((s, pl) => s + pl.mrr, 0);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.subscriber_count}</TableCell>
                      <TableCell>${p.mrr.toLocaleString()}</TableCell>
                      <TableCell>{((p.mrr / totalMrr) * 100).toFixed(1)}%</TableCell>
                      <TableCell>${p.subscriber_count > 0 ? Math.round(p.mrr / p.subscriber_count) : 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="forecast">
          <div className="bg-card rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3">Revenue Forecast</h3>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockRevenueForecast}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="optimistic" fill="hsl(142, 71%, 45%)" fillOpacity={0.1} stroke="none" name="Optimistic" />
                  <Area type="monotone" dataKey="conservative" fill="hsl(0, 72%, 51%)" fillOpacity={0.1} stroke="none" name="Conservative" />
                  <Line type="monotone" dataKey="actual" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="hsl(217, 91%, 60%)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} name="Forecast" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </SubscriptionsLayout>
);

export default SuperAdminRevenueAnalytics;
