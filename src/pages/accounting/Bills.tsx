import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { OfficeSelector } from '@/components/accounting/OfficeSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Eye, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AccountingBill, BillStatus } from '@/types/accounting';

const STATUS_LABELS: Record<BillStatus, string> = {
  draft: 'Draft', approved: 'Approved', paid: 'Paid',
  partially_paid: 'Partially Paid', overdue: 'Overdue', voided: 'Voided',
};

const STATUS_VARIANTS: Record<BillStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary', approved: 'outline', paid: 'default',
  partially_paid: 'outline', overdue: 'destructive', voided: 'secondary',
};

const Bills = () => {
  const { ledger, isSetupComplete, loading: setupLoading } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const queryClient = useQueryClient();
  const [selectedOffice, setSelectedOffice] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ['accounting-bills', ledger?.id, selectedOffice, tab],
    queryFn: async () => {
      let query = supabase
        .from('accounting_bills')
        .select('*, accounting_contacts(name)')
        .eq('ledger_id', ledger!.id)
        .order('date', { ascending: false })
        .limit(100);

      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      if (tab !== 'all') query = query.eq('status', tab as any);

      const { data, error } = await query;
      if (error) throw error;
      return data as (AccountingBill & { accounting_contacts: { name: string } | null })[];
    },
    enabled: !!ledger?.id,
  });

  const filteredBills = bills.filter((b) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      b.bill_number.toLowerCase().includes(s) ||
      b.accounting_contacts?.name?.toLowerCase().includes(s) ||
      b.reference?.toLowerCase().includes(s)
    );
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'approved') updates.approved_at = new Date().toISOString();
      const { error } = await supabase.from('accounting_bills').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-bills'] });
      toast.success('Bill updated');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatCurrency = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  if (setupLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  const stats = {
    draft: bills.filter((b) => b.status === 'draft').length,
    awaiting: bills.filter((b) => b.status === 'approved').length,
    overdue: bills.filter((b) => b.status === 'overdue').length,
    paid: bills.filter((b) => b.status === 'paid').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bills</h1>
        <div className="flex items-center gap-3">
          <OfficeSelector value={selectedOffice} onChange={setSelectedOffice} />
          <Button onClick={() => navigateOrg('/accounting/bills/new')}>
            <Plus className="h-4 w-4 mr-2" /> New Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer" onClick={() => setTab('draft')}>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Draft</p>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setTab('approved')}>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Awaiting Payment</p>
            <p className="text-2xl font-bold">{stats.awaiting}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setTab('overdue')}>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold">{stats.overdue}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setTab('paid')}>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold">{stats.paid}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search bills…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[100px]">Due Date</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[120px] text-right">Due</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id} className="cursor-pointer" onClick={() => navigateOrg(`/accounting/bills/${bill.id}`)}>
                  <TableCell className="font-mono text-sm">{bill.bill_number}</TableCell>
                  <TableCell>{bill.accounting_contacts?.name || '—'}</TableCell>
                  <TableCell>{bill.date}</TableCell>
                  <TableCell>{bill.due_date}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[bill.status]}>{STATUS_LABELS[bill.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(bill.total, bill.currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(bill.amount_due, bill.currency)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigateOrg(`/accounting/bills/${bill.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        {bill.status === 'draft' && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: bill.id, status: 'approved' })}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Approve
                          </DropdownMenuItem>
                        )}
                        {bill.status === 'draft' && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: bill.id, status: 'voided' })} className="text-destructive">
                            <XCircle className="h-4 w-4 mr-2" /> Void
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBills.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading…' : 'No bills yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Bills;
