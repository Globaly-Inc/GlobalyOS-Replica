import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Landmark, ArrowUpDown, CheckCircle, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { BankAccount, BankStatementLine, ChartOfAccount } from '@/types/accounting';

const Banking = () => {
  const { currentOrg } = useOrganization();
  const { ledger, isSetupComplete, loading: setupLoading } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const queryClient = useQueryClient();

  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Add account form
  const [newName, setNewName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBsb, setNewBsb] = useState('');
  const [newChartAccountId, setNewChartAccountId] = useState('');
  const [newOfficeId, setNewOfficeId] = useState('');

  // Import form
  const [csvData, setCsvData] = useState('');

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ['bank-accounts', ledger?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*, offices(name)')
        .eq('ledger_id', ledger!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as (BankAccount & { offices: { name: string } })[];
    },
    enabled: !!ledger?.id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts-all-banking', ledger?.id],
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

  const { data: offices = [] } = useQuery({
    queryKey: ['offices-for-banking', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('offices')
        .select('id, name')
        .eq('organization_id', currentOrg!.id)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const activeAccount = bankAccounts.find((a) => a.id === selectedAccount) || bankAccounts[0];

  const { data: statementLines = [] } = useQuery({
    queryKey: ['bank-statement-lines', activeAccount?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_statement_lines')
        .select('*, bank_statements!inner(bank_account_id), chart_of_accounts(code, name)')
        .eq('bank_statements.bank_account_id', activeAccount!.id)
        .order('date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as (BankStatementLine & { chart_of_accounts: { code: string; name: string } | null })[];
    },
    enabled: !!activeAccount?.id,
  });

  const createAccountMutation = useMutation({
    mutationFn: async () => {
      if (!newName || !newChartAccountId || !newOfficeId || !ledger || !currentOrg) {
        throw new Error('Fill in all required fields');
      }
      const { error } = await supabase.from('bank_accounts').insert({
        organization_id: currentOrg.id,
        ledger_id: ledger.id,
        office_id: newOfficeId,
        name: newName,
        bank_name: newBankName || null,
        account_number: newAccountNumber || null,
        bsb: newBsb || null,
        chart_account_id: newChartAccountId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      toast.success('Bank account added');
      setAddAccountOpen(false);
      setNewName(''); setNewBankName(''); setNewAccountNumber(''); setNewBsb('');
      setNewChartAccountId(''); setNewOfficeId('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const importStatementMutation = useMutation({
    mutationFn: async () => {
      if (!csvData.trim() || !activeAccount) throw new Error('No data to import');

      const lines = csvData.trim().split('\n');
      if (lines.length < 2) throw new Error('CSV needs a header row + data');

      // Create statement
      const hash = btoa(csvData.trim().substring(0, 200) + lines.length);
      const { data: stmt, error: sErr } = await supabase
        .from('bank_statements')
        .insert({
          bank_account_id: activeAccount.id,
          file_name: `manual-import-${new Date().toISOString().split('T')[0]}.csv`,
          row_count: lines.length - 1,
          idempotency_key: hash,
        })
        .select()
        .single();
      if (sErr) throw sErr;

      // Parse CSV (expects: Date,Description,Amount,Balance,Reference)
      const dataLines = lines.slice(1).filter((l) => l.trim());
      const parsed = dataLines.map((line) => {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        return {
          statement_id: stmt.id,
          date: cols[0] || new Date().toISOString().split('T')[0],
          description: cols[1] || 'Unknown',
          amount: parseFloat(cols[2]) || 0,
          balance: cols[3] ? parseFloat(cols[3]) : null,
          reference: cols[4] || null,
        };
      });

      const { error: lErr } = await supabase.from('bank_statement_lines').insert(parsed);
      if (lErr) throw lErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
      toast.success('Statement imported');
      setImportOpen(false);
      setCsvData('');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const categorizeMutation = useMutation({
    mutationFn: async ({ lineId, accountId }: { lineId: string; accountId: string }) => {
      const { error } = await supabase
        .from('bank_statement_lines')
        .update({ categorized_account_id: accountId, status: 'matched' })
        .eq('id', lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
      toast.success('Categorized');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const reconcileMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const { error } = await supabase
        .from('bank_statement_lines')
        .update({ status: 'reconciled' })
        .eq('id', lineId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-statement-lines'] });
      toast.success('Reconciled');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: activeAccount?.currency || 'AUD' }).format(amount);

  if (setupLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  const unreconciledLines = statementLines.filter((l) => l.status === 'unmatched');
  const matchedLines = statementLines.filter((l) => l.status === 'matched');
  const reconciledLines = statementLines.filter((l) => l.status === 'reconciled');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banking</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigateOrg('/accounting/bank-rules')}>
            <ArrowUpDown className="h-4 w-4 mr-2" /> Rules
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!activeAccount}>
            <Upload className="h-4 w-4 mr-2" /> Import Statement
          </Button>
          <Button onClick={() => setAddAccountOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Account
          </Button>
        </div>
      </div>

      {/* Bank account cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {bankAccounts.map((acc) => (
          <Card
            key={acc.id}
            className={`cursor-pointer transition-all ${acc.id === (activeAccount?.id) ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedAccount(acc.id)}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <Landmark className="h-5 w-5 text-primary" />
                <span className="font-semibold">{acc.name}</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(acc.current_balance)}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{acc.offices?.name}</Badge>
                {acc.bank_name && <span className="text-xs text-muted-foreground">{acc.bank_name}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
        {bankAccounts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>No bank accounts yet. Add one to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reconciliation view */}
      {activeAccount && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {activeAccount.name} — Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="unmatched">
              <div className="px-4 pt-2">
                <TabsList>
                  <TabsTrigger value="unmatched">For Review ({unreconciledLines.length})</TabsTrigger>
                  <TabsTrigger value="matched">Categorised ({matchedLines.length})</TabsTrigger>
                  <TabsTrigger value="reconciled">Reconciled ({reconciledLines.length})</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="unmatched" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px] text-right">Spent</TableHead>
                      <TableHead className="w-[100px] text-right">Received</TableHead>
                      <TableHead className="w-[180px]">Categorise</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unreconciledLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-sm">{line.date}</TableCell>
                        <TableCell>
                          <div className="text-sm">{line.description}</div>
                          {line.payee && <div className="text-xs text-muted-foreground">{line.payee}</div>}
                        </TableCell>
                        <TableCell className="text-right text-sm text-destructive">
                          {line.amount < 0 ? formatCurrency(Math.abs(line.amount)) : ''}
                        </TableCell>
                        <TableCell className="text-right text-sm text-green-600">
                          {line.amount > 0 ? formatCurrency(line.amount) : ''}
                        </TableCell>
                        <TableCell>
                          <Select onValueChange={(v) => categorizeMutation.mutate({ lineId: line.id, accountId: v })}>
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => reconcileMutation.mutate(line.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> OK
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {unreconciledLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transactions to review
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="matched" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="w-[100px] text-right">Amount</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchedLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-sm">{line.date}</TableCell>
                        <TableCell className="text-sm">{line.description}</TableCell>
                        <TableCell className="text-sm">
                          {line.chart_of_accounts ? `${line.chart_of_accounts.code} — ${line.chart_of_accounts.name}` : '—'}
                        </TableCell>
                        <TableCell className={`text-right text-sm ${line.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(line.amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => reconcileMutation.mutate(line.id)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Reconcile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {matchedLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No categorised transactions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="reconciled" className="mt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="w-[100px] text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciledLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="text-sm">{line.date}</TableCell>
                        <TableCell className="text-sm">{line.description}</TableCell>
                        <TableCell className="text-sm">
                          {line.chart_of_accounts ? `${line.chart_of_accounts.code} — ${line.chart_of_accounts.name}` : '—'}
                        </TableCell>
                        <TableCell className={`text-right text-sm ${line.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrency(line.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reconciledLines.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No reconciled transactions
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Add Bank Account Dialog */}
      <Dialog open={addAccountOpen} onOpenChange={setAddAccountOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Business Cheque Account" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="e.g. ANZ" />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={newAccountNumber} onChange={(e) => setNewAccountNumber(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BSB</Label>
                <Input value={newBsb} onChange={(e) => setNewBsb(e.target.value)} placeholder="000-000" />
              </div>
              <div className="space-y-2">
                <Label>Office *</Label>
                <Select value={newOfficeId} onValueChange={setNewOfficeId}>
                  <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                  <SelectContent>
                    {offices.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Linked Chart Account *</Label>
              <Select value={newChartAccountId} onValueChange={setNewChartAccountId}>
                <SelectTrigger><SelectValue placeholder="Select bank account in COA" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => createAccountMutation.mutate()} disabled={createAccountMutation.isPending}>
              {createAccountMutation.isPending ? 'Adding…' : 'Add Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Statement Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import Bank Statement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste CSV data with columns: Date, Description, Amount, Balance (optional), Reference (optional)
            </p>
            <Textarea
              rows={10}
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder={`Date,Description,Amount,Balance,Reference\n2026-02-01,Office Supplies,-120.50,4879.50,REF001\n2026-02-02,Client Payment,2500.00,7379.50,INV-0012`}
              className="font-mono text-xs"
            />
            <Button className="w-full" onClick={() => importStatementMutation.mutate()} disabled={importStatementMutation.isPending}>
              {importStatementMutation.isPending ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Banking;
