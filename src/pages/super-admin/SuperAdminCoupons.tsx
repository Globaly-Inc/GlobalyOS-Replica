import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockCoupons, mockCampaignGroups } from '@/data/subscriptions-mock';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const couponStatusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  scheduled: 'bg-blue-100 text-blue-800',
  expired: 'bg-gray-100 text-gray-600',
  archived: 'bg-gray-100 text-gray-600',
};

const CouponTable = ({ coupons }: { coupons: typeof mockCoupons }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Code</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Discount</TableHead>
        <TableHead>Duration</TableHead>
        <TableHead>Redemptions</TableHead>
        <TableHead>Limit</TableHead>
        <TableHead>Campaign</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {coupons.map((c) => (
        <TableRow key={c.id}>
          <TableCell className="font-mono font-medium">{c.code}</TableCell>
          <TableCell className="capitalize text-muted-foreground">{c.type.replace('_', ' ')}</TableCell>
          <TableCell>{c.type === 'percentage' ? `${c.value}%` : c.type === 'fixed_amount' ? `$${c.value}` : `+${c.value} days`}</TableCell>
          <TableCell className="capitalize text-muted-foreground">{c.duration}{c.duration_months ? ` (${c.duration_months}mo)` : ''}</TableCell>
          <TableCell>{c.redemptions}</TableCell>
          <TableCell>{c.limit || '∞'}</TableCell>
          <TableCell className="text-muted-foreground text-sm">{c.campaign_name || '—'}</TableCell>
          <TableCell><Badge className={cn('border-0', couponStatusColors[c.status])}>{c.status}</Badge></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const SuperAdminCoupons = () => (
  <SubscriptionsLayout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Coupons & Promotions</h2>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Create Coupon</Button>
      </div>

      {/* Campaign Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockCampaignGroups.map((g) => (
          <div key={g.id} className="bg-card rounded-lg border p-4">
            <h4 className="font-semibold text-sm">{g.name}</h4>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>{g.coupon_count} coupons · {g.total_redemptions} redemptions</p>
              <p className="text-foreground font-medium">${g.revenue_impact.toLocaleString()} revenue impact</p>
              {g.reactivations && <p className="text-emerald-600">{g.reactivations} reactivations</p>}
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({mockCoupons.filter(c => c.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled ({mockCoupons.filter(c => c.status === 'scheduled').length})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({mockCoupons.filter(c => c.status === 'expired').length})</TabsTrigger>
          <TabsTrigger value="all">All ({mockCoupons.length})</TabsTrigger>
        </TabsList>
        <div className="bg-card rounded-lg border mt-4">
          <TabsContent value="active" className="m-0"><CouponTable coupons={mockCoupons.filter(c => c.status === 'active')} /></TabsContent>
          <TabsContent value="scheduled" className="m-0"><CouponTable coupons={mockCoupons.filter(c => c.status === 'scheduled')} /></TabsContent>
          <TabsContent value="expired" className="m-0"><CouponTable coupons={mockCoupons.filter(c => c.status === 'expired')} /></TabsContent>
          <TabsContent value="all" className="m-0"><CouponTable coupons={mockCoupons} /></TabsContent>
        </div>
      </Tabs>
    </div>
  </SubscriptionsLayout>
);

export default SuperAdminCoupons;
