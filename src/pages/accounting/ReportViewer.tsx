import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { OfficeSelector } from '@/components/accounting/OfficeSelector';
import { OrgLink } from '@/components/OrgLink';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft } from 'lucide-react';

const REPORT_TITLES: Record<string, string> = {
  'profit-loss': 'Profit & Loss',
  'balance-sheet': 'Balance Sheet',
  'trial-balance': 'Trial Balance',
  'ar-aging': 'Accounts Receivable Aging',
  'ap-aging': 'Accounts Payable Aging',
  'open-invoices': 'Open Invoices',
  'unpaid-bills': 'Unpaid Bills',
  'cash-flow': 'Cash Flow Statement',
  'general-ledger': 'General Ledger',
  'journal-list': 'Journal List',
};

const ReportViewer = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const { ledger, isSetupComplete, loading: setupLoading, setup } = useAccountingSetup();
  const [selectedOffice, setSelectedOffice] = useState<string | 'all'>('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: setup?.base_currency || 'AUD' }).format(amount);

  // Ledger entries for P&L, Balance Sheet, Trial Balance
  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['report-ledger-entries', ledger?.id, selectedOffice, startDate, endDate, reportId],
    queryFn: async () => {
      let query = supabase
        .from('ledger_entries')
        .select('*, chart_of_accounts(code, name, type, sub_type)')
        .eq('ledger_id', ledger!.id);

      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      if (['profit-loss', 'trial-balance', 'cash-flow'].includes(reportId!)) {
        query = query.gte('date', startDate).lte('date', endDate);
      } else if (reportId === 'balance-sheet') {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date');
      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id && ['profit-loss', 'balance-sheet', 'trial-balance', 'cash-flow'].includes(reportId || ''),
  });

  // Invoices for AR reports
  const { data: invoices = [] } = useQuery({
    queryKey: ['report-invoices', ledger?.id, selectedOffice],
    queryFn: async () => {
      let query = supabase
        .from('accounting_invoices')
        .select('*, accounting_contacts(name)')
        .eq('ledger_id', ledger!.id)
        .in('status', ['approved', 'sent', 'partially_paid', 'overdue']);
      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      const { data, error } = await query.order('due_date');
      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id && ['ar-aging', 'open-invoices'].includes(reportId || ''),
  });

  // Bills for AP reports
  const { data: bills = [] } = useQuery({
    queryKey: ['report-bills', ledger?.id, selectedOffice],
    queryFn: async () => {
      let query = supabase
        .from('accounting_bills')
        .select('*, accounting_contacts(name)')
        .eq('ledger_id', ledger!.id)
        .in('status', ['approved', 'partially_paid', 'overdue']);
      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      const { data, error } = await query.order('due_date');
      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id && ['ap-aging', 'unpaid-bills'].includes(reportId || ''),
  });

  // Compute report data
  const reportContent = useMemo(() => {
    if (!reportId) return null;

    if (reportId === 'profit-loss' || reportId === 'trial-balance' || reportId === 'balance-sheet') {
      // Aggregate by account
      const accountTotals: Record<string, { code: string; name: string; type: string; debit: number; credit: number }> = {};
      ledgerEntries.forEach((e: any) => {
        const key = e.account_id;
        if (!accountTotals[key]) {
          accountTotals[key] = {
            code: e.chart_of_accounts?.code || '',
            name: e.chart_of_accounts?.name || '',
            type: e.chart_of_accounts?.type || '',
            debit: 0,
            credit: 0,
          };
        }
        accountTotals[key].debit += Number(e.debit) || 0;
        accountTotals[key].credit += Number(e.credit) || 0;
      });

      const rows = Object.values(accountTotals).sort((a, b) => a.code.localeCompare(b.code));

      if (reportId === 'profit-loss') {
        const revenue = rows.filter((r) => r.type === 'revenue');
        const expenses = rows.filter((r) => r.type === 'expense');
        const totalRevenue = revenue.reduce((s, r) => s + (r.credit - r.debit), 0);
        const totalExpenses = expenses.reduce((s, r) => s + (r.debit - r.credit), 0);
        return { type: 'pl', revenue, expenses, totalRevenue, totalExpenses, netProfit: totalRevenue - totalExpenses };
      }

      if (reportId === 'balance-sheet') {
        const assets = rows.filter((r) => r.type === 'asset');
        const liabilities = rows.filter((r) => r.type === 'liability');
        const equity = rows.filter((r) => r.type === 'equity');
        const totalAssets = assets.reduce((s, r) => s + (r.debit - r.credit), 0);
        const totalLiabilities = liabilities.reduce((s, r) => s + (r.credit - r.debit), 0);
        const totalEquity = equity.reduce((s, r) => s + (r.credit - r.debit), 0);
        return { type: 'bs', assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
      }

      if (reportId === 'trial-balance') {
        const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
        const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
        return { type: 'tb', rows, totalDebit, totalCredit };
      }
    }

    if (reportId === 'ar-aging' || reportId === 'open-invoices') {
      const today = new Date();
      const aged = invoices.map((inv: any) => {
        const due = new Date(inv.due_date);
        const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
        return { ...inv, daysOverdue: days, bucket: days <= 0 ? 'Current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+' };
      });
      return { type: reportId === 'ar-aging' ? 'ar' : 'oi', items: aged };
    }

    if (reportId === 'ap-aging' || reportId === 'unpaid-bills') {
      const today = new Date();
      const aged = bills.map((bill: any) => {
        const due = new Date(bill.due_date);
        const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
        return { ...bill, daysOverdue: days, bucket: days <= 0 ? 'Current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+' };
      });
      return { type: reportId === 'ap-aging' ? 'ap' : 'ub', items: aged };
    }

    return { type: 'placeholder' };
  }, [reportId, ledgerEntries, invoices, bills]);

  if (setupLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  const renderAccountSection = (title: string, rows: any[], valueCalc: (r: any) => number) => (
    <div className="space-y-1">
      <h3 className="font-semibold text-sm pt-3 pb-1">{title}</h3>
      {rows.map((r, i) => (
        <div key={i} className="flex justify-between text-sm py-1 px-2 hover:bg-muted/50 rounded">
          <span>{r.code} — {r.name}</span>
          <span className="font-medium">{formatCurrency(valueCalc(r))}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm font-semibold border-t pt-1 px-2">
        <span>Total {title}</span>
        <span>{formatCurrency(rows.reduce((s, r) => s + valueCalc(r), 0))}</span>
      </div>
    </div>
  );

  const renderAgingTable = (items: any[], numberField: string) => {
    const buckets = ['Current', '1-30', '31-60', '61-90', '90+'];
    const bucketTotals = Object.fromEntries(buckets.map((b) => [b, 0]));
    items.forEach((it: any) => { bucketTotals[it.bucket] = (bucketTotals[it.bucket] || 0) + (it.amount_due || 0); });

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {buckets.map((b) => (
            <Card key={b}>
              <CardContent className="pt-3 pb-2 text-center">
                <p className="text-xs text-muted-foreground">{b} days</p>
                <p className="font-bold">{formatCurrency(bucketTotals[b])}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead className="text-right">Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it: any) => (
              <TableRow key={it.id}>
                <TableCell className="font-mono text-sm">{it[numberField]}</TableCell>
                <TableCell>{it.accounting_contacts?.name || '—'}</TableCell>
                <TableCell>{it.due_date}</TableCell>
                <TableCell><Badge variant="outline">{it.bucket}</Badge></TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(it.amount_due)}</TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No outstanding items</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OrgLink to="/accounting/reports">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </OrgLink>
          <h1 className="text-2xl font-bold">{REPORT_TITLES[reportId || ''] || 'Report'}</h1>
        </div>
        <OfficeSelector value={selectedOffice} onChange={setSelectedOffice} />
      </div>

      {/* Date filters for period-based reports */}
      {['profit-loss', 'trial-balance', 'cash-flow'].includes(reportId || '') && (
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
      )}
      {reportId === 'balance-sheet' && (
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs">As of</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {/* P&L */}
          {reportContent?.type === 'pl' && (
            <div className="space-y-2">
              {renderAccountSection('Revenue', reportContent.revenue, (r) => r.credit - r.debit)}
              {renderAccountSection('Expenses', reportContent.expenses, (r) => r.debit - r.credit)}
              <Separator />
              <div className="flex justify-between font-bold text-lg px-2 pt-2">
                <span>Net Profit</span>
                <span className={reportContent.netProfit >= 0 ? '' : 'text-destructive'}>{formatCurrency(reportContent.netProfit)}</span>
              </div>
            </div>
          )}

          {/* Balance Sheet */}
          {reportContent?.type === 'bs' && (
            <div className="space-y-2">
              {renderAccountSection('Assets', reportContent.assets, (r) => r.debit - r.credit)}
              {renderAccountSection('Liabilities', reportContent.liabilities, (r) => r.credit - r.debit)}
              {renderAccountSection('Equity', reportContent.equity, (r) => r.credit - r.debit)}
              <Separator />
              <div className="flex justify-between font-bold text-lg px-2 pt-2">
                <span>Liabilities + Equity</span>
                <span>{formatCurrency(reportContent.totalLiabilities + reportContent.totalEquity)}</span>
              </div>
            </div>
          )}

          {/* Trial Balance */}
          {reportContent?.type === 'tb' && (
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportContent.rows.map((r: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-right">{r.debit > 0 ? formatCurrency(r.debit) : ''}</TableCell>
                      <TableCell className="text-right">{r.credit > 0 ? formatCurrency(r.credit) : ''}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(reportContent.totalDebit)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(reportContent.totalCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              {Math.abs(reportContent.totalDebit - reportContent.totalCredit) > 0.01 && (
                <p className="text-destructive text-sm mt-2 text-center">⚠ Imbalance: {formatCurrency(Math.abs(reportContent.totalDebit - reportContent.totalCredit))}</p>
              )}
            </div>
          )}

          {/* AR Aging / Open Invoices */}
          {(reportContent?.type === 'ar' || reportContent?.type === 'oi') && renderAgingTable(reportContent.items, 'invoice_number')}

          {/* AP Aging / Unpaid Bills */}
          {(reportContent?.type === 'ap' || reportContent?.type === 'ub') && renderAgingTable(reportContent.items, 'bill_number')}

          {/* Placeholder for unimplemented reports */}
          {reportContent?.type === 'placeholder' && (
            <div className="text-center py-12 text-muted-foreground">
              This report is coming soon.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportViewer;
