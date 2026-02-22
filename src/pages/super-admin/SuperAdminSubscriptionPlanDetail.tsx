import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { useParams, Link } from 'react-router-dom';
import { mockPlans, mockSubscriptions } from '@/data/subscriptions-mock';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const SuperAdminSubscriptionPlanDetail = () => {
  const { planId } = useParams();
  const plan = mockPlans.find((p) => p.id === planId);
  const orgsOnPlan = mockSubscriptions.filter((s) => s.plan_id === planId);

  if (!plan) return (
    <SubscriptionsLayout>
      <div className="text-center py-20">
        <p className="text-muted-foreground">Plan not found</p>
        <Link to="/super-admin/subscriptions/plans"><Button variant="ghost" className="mt-4">Back to Plans</Button></Link>
      </div>
    </SubscriptionsLayout>
  );

  return (
    <SubscriptionsLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/super-admin/subscriptions/plans"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </div>
          <Badge className="ml-2" variant={plan.status === 'active' ? 'default' : 'secondary'}>{plan.status}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase">Subscribers</p>
            <p className="text-2xl font-bold mt-1">{plan.subscriber_count}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase">MRR</p>
            <p className="text-2xl font-bold mt-1">${plan.mrr.toLocaleString()}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase">Avg MRR / Org</p>
            <p className="text-2xl font-bold mt-1">${plan.subscriber_count > 0 ? Math.round(plan.mrr / plan.subscriber_count) : 0}</p>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">Feature Entitlements</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Feature</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {plan.features.map((f) => (
                <TableRow key={f.name}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{f.limit_type.replace('_', ' ')}</TableCell>
                  <TableCell>{Array.isArray(f.value) ? (f.value as string[]).join(', ') : String(f.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">Organizations on this Plan ({orgsOnPlan.length})</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Organization</TableHead><TableHead>Status</TableHead><TableHead>MRR</TableHead><TableHead>Members</TableHead></TableRow></TableHeader>
            <TableBody>
              {orgsOnPlan.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.org_name}</TableCell>
                  <TableCell><Badge variant={org.status === 'active' ? 'default' : 'secondary'}>{org.status}</Badge></TableCell>
                  <TableCell>${org.mrr}</TableCell>
                  <TableCell>{org.member_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SubscriptionsLayout>
  );
};

export default SuperAdminSubscriptionPlanDetail;
