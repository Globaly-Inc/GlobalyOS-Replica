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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Eye, Send, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { AccountingInvoice, InvoiceStatus } from '@/types/accounting';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  sent: 'Sent',
  paid: 'Paid',
  partially_paid: 'Partially Paid',
  overdue: 'Overdue',
  voided: 'Voided',
};

const STATUS_VARIANTS: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  approved: 'outline',
  sent: 'outline',
  paid: 'default',
  partially_paid: 'outline',
  overdue: 'destructive',
  voided: 'secondary',
};

const Invoices = () => {
  const { ledger, isSetupComplete, loading: setupLoading } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const queryClient = useQueryClient();
  const [selectedOffice, setSelectedOffice] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['accounting-invoices', ledger?.id, selectedOffice, tab],
    queryFn: async () => {
      let query = supabase
        .from('accounting_invoices')
        .select('*, accounting_contacts(name)')
        .eq('ledger_id', ledger!.id)
        .order('date', { ascending: false })
        .limit(100);

      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      if (tab !== 'all') query = query.eq('status', tab as any);

      const { data, error } = await query;
      if (error) throw error;
      return data as (AccountingInvoice & { accounting_contacts: { name: string } | null })[];
    },
    enabled: !!ledger?.id,
  });

  const filteredInvoices = invoices.filter((inv) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(s) ||
      inv.accounting_contacts?.name?.toLowerCase().includes(s) ||
      inv.reference?.toLowerCase().includes(s)
    );
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('accounting_invoices')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting-invoices'] });
      toast.success('Invoice updated');
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

  // Summary stats
  const stats = {
    draft: invoices.filter((i) => i.status === 'draft').length,
    awaiting: invoices.filter((i) => ['approved', 'sent'].includes(i.status)).length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <div className="flex items-center gap-3">
          <OfficeSelector value={selectedOffice} onChange={setSelectedOffice} />
          <Button onClick={() => navigateOrg('/accounting/invoices/new')}>
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer" onClick={() => setTab('draft')}>
          <CardContent className="pt-4 pb-3">
            <p className="text-sm text-muted-foreground">Draft</p>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => setTab('sent')}>
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
          <Input className="pl-9" placeholder="Search invoices…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
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
                <TableHead>Customer</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[100px]">Due Date</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[120px] text-right">Due</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => navigateOrg(`/accounting/invoices/${inv.id}`)}>
                  <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.accounting_contacts?.name || '—'}</TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>{inv.due_date}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANTS[inv.status]}>{STATUS_LABELS[inv.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inv.total, inv.currency)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(inv.amount_due, inv.currency)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigateOrg(`/accounting/invoices/${inv.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </DropdownMenuItem>
                        {inv.status === 'draft' && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: inv.id, status: 'approved' })}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Approve
                          </DropdownMenuItem>
                        )}
                        {inv.status === 'approved' && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: inv.id, status: 'sent' })}>
                            <Send className="h-4 w-4 mr-2" /> Mark as Sent
                          </DropdownMenuItem>
                        )}
                        {inv.status === 'draft' && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ id: inv.id, status: 'voided' })} className="text-destructive">
                            <XCircle className="h-4 w-4 mr-2" /> Void
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInvoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading…' : 'No invoices yet'}
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

export default Invoices;
