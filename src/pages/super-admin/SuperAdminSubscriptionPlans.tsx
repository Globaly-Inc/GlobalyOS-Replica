import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockPlans } from '@/data/subscriptions-mock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const SuperAdminSubscriptionPlans = () => (
  <SubscriptionsLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Plans & Pricing</h2>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Create New Plan</Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Pricing Model</TableHead>
              <TableHead>Monthly</TableHead>
              <TableHead>Annual</TableHead>
              <TableHead>Subscribers</TableHead>
              <TableHead>MRR</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPlans.map((plan) => (
              <TableRow key={plan.id} className="cursor-pointer">
                <TableCell>
                  <Link to={`/super-admin/subscriptions/plans/${plan.id}`} className="font-medium text-foreground hover:text-primary">
                    {plan.name}
                  </Link>
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">{plan.pricing_model.replace('_', ' ')}</TableCell>
                <TableCell>
                  {plan.pricing_model === 'per_seat' ? `$${plan.base_price}/seat` :
                   plan.pricing_model === 'hybrid' ? `$${plan.base_price} + $${plan.per_seat_price}/seat` :
                   `$${plan.base_price}`}
                </TableCell>
                <TableCell>
                  {plan.annual_price ? (plan.pricing_model === 'hybrid' ? `$${plan.annual_price}+$${plan.annual_per_seat_price}/seat` : `$${plan.annual_price}`) : '—'}
                </TableCell>
                <TableCell>{plan.subscriber_count}</TableCell>
                <TableCell>${plan.mrr.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={plan.status === 'active' ? 'default' : 'secondary'} className={plan.status === 'grandfathered' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}>
                    {plan.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  </SubscriptionsLayout>
);

export default SuperAdminSubscriptionPlans;
