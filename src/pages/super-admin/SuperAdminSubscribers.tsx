import SubscriptionsLayout from '@/components/super-admin/subscriptions/SubscriptionsLayout';
import { mockSubscriptions } from '@/data/subscriptions-mock';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Search } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  trialing: 'bg-blue-100 text-blue-800 border-blue-200',
  past_due: 'bg-red-100 text-red-800 border-red-200',
  paused: 'bg-amber-100 text-amber-800 border-amber-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

const healthColor = (score: number) => {
  if (score >= 80) return 'bg-emerald-100 text-emerald-800';
  if (score >= 60) return 'bg-amber-100 text-amber-800';
  if (score >= 40) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
};

const SuperAdminSubscribers = () => {
  const [search, setSearch] = useState('');
  const filtered = mockSubscriptions.filter((s) =>
    s.org_name.toLowerCase().includes(search.toLowerCase()) ||
    s.plan_name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SubscriptionsLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Subscribers</h2>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search organizations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div className="bg-card rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Next Renewal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sub) => (
                <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{sub.org_name}</TableCell>
                  <TableCell><Badge variant="outline">{sub.plan_name}</Badge></TableCell>
                  <TableCell><Badge className={cn('border', statusColors[sub.status])}>{sub.status}</Badge></TableCell>
                  <TableCell>${sub.mrr.toLocaleString()}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{sub.billing_frequency}</TableCell>
                  <TableCell>{sub.member_count}</TableCell>
                  <TableCell>
                    {sub.health_score > 0 && (
                      <Badge className={cn('border-0 font-mono', healthColor(sub.health_score))}>{sub.health_score}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{sub.next_renewal || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </SubscriptionsLayout>
  );
};

export default SuperAdminSubscribers;
