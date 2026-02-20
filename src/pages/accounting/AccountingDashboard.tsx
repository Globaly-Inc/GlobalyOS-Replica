import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { OfficeSelector } from '@/components/accounting/OfficeSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, Receipt, Landmark, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const AccountingDashboard = () => {
  const { isSetupComplete, loading, ledger, setup } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const [selectedOffice, setSelectedOffice] = useState<string | 'all'>('all');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: setup?.base_currency || 'AUD', minimumFractionDigits: 0 }).format(amount);

  // Current month date range
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = now.toISOString().split('T')[0];

  // Ledger entries for this month (P&L data)
  const { data: entries = [] } = useQuery({
    queryKey: ['dashboard-entries', ledger?.id, selectedOffice, monthStart, monthEnd],
    queryFn: async () => {
      let query = supabase
        .from('ledger_entries')
        .select('*, chart_of_accounts(code, name, type, sub_type)')
        .eq('ledger_id', ledger!.id)
        .gte('date', monthStart)
        .lte('date', monthEnd);
      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id,
  });

  // Outstanding invoices
  const { data: outstandingInvoices = [] } = useQuery({
    queryKey: ['dashboard-invoices', ledger?.id, selectedOffice],
    queryFn: async () => {
      let query = supabase
        .from('accounting_invoices')
        .select('amount_due, status')
        .eq('ledger_id', ledger!.id)
        .in('status', ['approved', 'sent', 'partially_paid', 'overdue']);
      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id,
  });

  // Outstanding bills
  const { data: outstandingBills = [] } = useQuery({
    queryKey: ['dashboard-bills', ledger?.id, selectedOffice],
    queryFn: async () => {
      let query = supabase
        .from('accounting_bills')
        .select('amount_due, status')
        .eq('ledger_id', ledger!.id)
        .in('status', ['approved', 'partially_paid', 'overdue']);
      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id,
  });

  // Bank accounts
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['dashboard-bank-accounts', ledger?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, name, current_balance, bank_name, currency, offices(name)')
        .eq('ledger_id', ledger!.id)
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!ledger?.id,
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!isSetupComplete) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Landmark className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Set Up Accounting</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Get started with double-entry accounting for your organisation. Choose which offices to include, set your currency, and select a chart of accounts template.
        </p>
        <Button size="lg" onClick={() => navigateOrg('/accounting/setup')}>
          Start Setup <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Compute P&L summary
  const revenue = entries.filter((e: any) => e.chart_of_accounts?.type === 'revenue').reduce((s: number, e: any) => s + (Number(e.credit) - Number(e.debit)), 0);
  const expenses = entries.filter((e: any) => e.chart_of_accounts?.type === 'expense').reduce((s: number, e: any) => s + (Number(e.debit) - Number(e.credit)), 0);
  const netProfit = revenue - expenses;
  const receivable = outstandingInvoices.reduce((s, i: any) => s + (Number(i.amount_due) || 0), 0);
  const payable = outstandingBills.reduce((s, b: any) => s + (Number(b.amount_due) || 0), 0);

  // Expense breakdown by sub_type for donut
  const expenseByCategory: Record<string, number> = {};
  entries.filter((e: any) => e.chart_of_accounts?.type === 'expense').forEach((e: any) => {
    const cat = e.chart_of_accounts?.sub_type || e.chart_of_accounts?.name || 'Other';
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.debit) - Number(e.credit));
  });
  const expenseDonutData = Object.entries(expenseByCategory)
    .map(([name, value]) => ({ name, value: Math.abs(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounting</h1>
        <OfficeSelector value={selectedOffice} onChange={setSelectedOffice} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(expenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receivable</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receivable)}</div>
            <p className="text-xs text-muted-foreground mt-1">{outstandingInvoices.length} invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payable</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(payable)}</div>
            <p className="text-xs text-muted-foreground mt-1">{outstandingBills.length} bills</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Profit + Expense Donut */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Net Profit</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${netProfit >= 0 ? '' : 'text-destructive'}`}>
                {formatCurrency(netProfit)}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Income</span>
                  <span className="font-medium">{formatCurrency(revenue)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary rounded-full h-2" style={{ width: revenue > 0 ? '100%' : '0%' }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expenses</span>
                  <span className="font-medium">{formatCurrency(expenses)}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-destructive/70 rounded-full h-2" style={{ width: revenue > 0 ? `${Math.min((expenses / revenue) * 100, 100)}%` : '0%' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Expenses by Category</CardTitle></CardHeader>
            <CardContent>
              {expenseDonutData.length > 0 ? (
                <div className="space-y-3">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={expenseDonutData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="none">
                        {expenseDonutData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {expenseDonutData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="flex-1 truncate">{d.name}</span>
                        <span className="font-medium">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bank Accounts Sidebar */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Bank Accounts</CardTitle>
            <OrgLink to="/accounting/banking">
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </OrgLink>
          </CardHeader>
          <CardContent className="space-y-3">
            {bankAccounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <Landmark className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{acc.name}</p>
                  <p className="text-xs text-muted-foreground">{acc.offices?.name}</p>
                </div>
                <span className="font-semibold text-sm">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: acc.currency || 'AUD', minimumFractionDigits: 0 }).format(acc.current_balance)}
                </span>
              </div>
            ))}
            {bankAccounts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No bank accounts</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <OrgLink to="/accounting/invoices/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Create Invoice</p>
                <p className="text-xs text-muted-foreground">Send invoices to your customers</p>
              </div>
            </OrgLink>
            <OrgLink to="/accounting/bills/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <Receipt className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Enter a Bill</p>
                <p className="text-xs text-muted-foreground">Record bills from suppliers</p>
              </div>
            </OrgLink>
            <OrgLink to="/accounting/banking" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <Landmark className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Reconcile Bank</p>
                <p className="text-xs text-muted-foreground">Match transactions to your books</p>
              </div>
            </OrgLink>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Reports</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <OrgLink to="/accounting/reports/profit-loss" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Profit & Loss</p>
                <p className="text-xs text-muted-foreground">Income vs expenses over time</p>
              </div>
            </OrgLink>
            <OrgLink to="/accounting/reports/balance-sheet" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Balance Sheet</p>
                <p className="text-xs text-muted-foreground">Snapshot of assets, liabilities, equity</p>
              </div>
            </OrgLink>
            <OrgLink to="/accounting/reports/ar-aging" className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Accounts Receivable</p>
                <p className="text-xs text-muted-foreground">Who owes you and how old</p>
              </div>
            </OrgLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountingDashboard;
