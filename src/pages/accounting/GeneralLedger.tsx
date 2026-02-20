import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { OfficeSelector } from '@/components/accounting/OfficeSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ChartOfAccount } from '@/types/accounting';

const GeneralLedger = () => {
  const { ledger, isSetupComplete, loading: setupLoading } = useAccountingSetup();
  const [selectedOffice, setSelectedOffice] = useState<string | 'all'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts', ledger?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('ledger_id', ledger!.id)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data as ChartOfAccount[];
    },
    enabled: !!ledger?.id,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['ledger-entries', ledger?.id, selectedOffice, accountFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('ledger_entries')
        .select('*, chart_of_accounts(code, name), journals(journal_number, memo)')
        .eq('ledger_id', ledger!.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);

      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      if (accountFilter !== 'all') query = query.eq('account_id', accountFilter);
      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!ledger?.id,
  });

  if (setupLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  const totalDebits = entries.reduce((s, e: any) => s + (e.debit || 0), 0);
  const totalCredits = entries.reduce((s, e: any) => s + (e.credit || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">General Ledger</h1>
        <OfficeSelector value={selectedOffice} onChange={setSelectedOffice} />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Account</Label>
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="w-[250px]"><SelectValue placeholder="All accounts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div className="space-y-2">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[80px]">J#</TableHead>
                <TableHead className="w-[120px]">Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px] text-right">Debit</TableHead>
                <TableHead className="w-[120px] text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="font-mono text-sm">{e.journals?.journal_number}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {e.chart_of_accounts?.code}
                  </TableCell>
                  <TableCell className="text-sm">
                    {e.chart_of_accounts?.name}
                    {e.journals?.memo && <span className="text-muted-foreground ml-2">— {e.journals.memo}</span>}
                  </TableCell>
                  <TableCell className="text-right">{e.debit > 0 ? e.debit.toFixed(2) : ''}</TableCell>
                  <TableCell className="text-right">{e.credit > 0 ? e.credit.toFixed(2) : ''}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading…' : 'No ledger entries yet'}
                  </TableCell>
                </TableRow>
              )}
              {entries.length > 0 && (
                <TableRow className="font-semibold border-t-2">
                  <TableCell colSpan={4} className="text-right">Totals</TableCell>
                  <TableCell className="text-right">{totalDebits.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{totalCredits.toFixed(2)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralLedger;
