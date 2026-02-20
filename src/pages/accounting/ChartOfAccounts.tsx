import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, ChevronRight, Archive, Pencil } from 'lucide-react';
import type { ChartOfAccount, AccountingAccountType } from '@/types/accounting';

const ACCOUNT_TYPE_LABELS: Record<AccountingAccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expense',
};

const ACCOUNT_TYPE_COLORS: Record<AccountingAccountType, string> = {
  asset: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  liability: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  equity: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  revenue: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  expense: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ChartOfAccounts = () => {
  const { ledger, isSetupComplete, loading: setupLoading } = useAccountingSetup();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'expense' as AccountingAccountType,
    sub_type: '',
    description: '',
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['chart-of-accounts', ledger?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('ledger_id', ledger!.id)
        .order('code');
      if (error) throw error;
      return data as ChartOfAccount[];
    },
    enabled: !!ledger?.id,
  });

  const filteredAccounts = accounts.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.code.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || a.type === filterType;
    return matchesSearch && matchesType;
  });

  const groupedAccounts = filteredAccounts.reduce(
    (acc, account) => {
      const type = account.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(account);
      return acc;
    },
    {} as Record<string, ChartOfAccount[]>
  );

  const createAccount = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('chart_of_accounts').insert({
        ledger_id: ledger!.id,
        code: data.code,
        name: data.name,
        type: data.type,
        sub_type: data.sub_type || null,
        description: data.description || null,
        sort_order: accounts.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created');
      setShowAddDialog(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description: string; sub_type: string }) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({ name: data.name, description: data.description || null, sub_type: data.sub_type || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account updated');
      setEditingAccount(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const archiveAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('chart_of_accounts')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account archived');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => setFormData({ code: '', name: '', type: 'expense', sub_type: '', description: '' });

  if (setupLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  const typeOrder: AccountingAccountType[] = ['asset', 'liability', 'equity', 'revenue', 'expense'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chart of Accounts</h1>
        {isAdmin && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" /> Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                      placeholder="e.g. 6300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData((f) => ({ ...f, type: v as AccountingAccountType }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {typeOrder.map((t) => (
                          <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Account name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sub-type (optional)</Label>
                  <Input
                    value={formData.sub_type}
                    onChange={(e) => setFormData((f) => ({ ...f, sub_type: e.target.value }))}
                    placeholder="e.g. operating_expense"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createAccount.mutate(formData)}
                  disabled={!formData.code || !formData.name || createAccount.isPending}
                >
                  {createAccount.isPending ? 'Creating…' : 'Create Account'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {typeOrder.map((t) => (
              <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {typeOrder.map((type) => {
        const typeAccounts = groupedAccounts[type];
        if (!typeAccounts || typeAccounts.length === 0) return null;
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className={ACCOUNT_TYPE_COLORS[type]} variant="secondary">
                  {ACCOUNT_TYPE_LABELS[type]}
                </Badge>
                <span className="text-sm text-muted-foreground font-normal">
                  {typeAccounts.length} account{typeAccounts.length !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[160px]">Sub-type</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeAccounts.map((account) => (
                    <TableRow key={account.id} className={!account.is_active ? 'opacity-50' : ''}>
                      <TableCell className="font-mono text-sm">{account.code}</TableCell>
                      <TableCell className="font-medium">
                        {account.name}
                        {account.is_system && (
                          <Badge variant="outline" className="ml-2 text-xs">System</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {account.sub_type?.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={account.is_active ? 'default' : 'secondary'}>
                          {account.is_active ? 'Active' : 'Archived'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingAccount(account)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {!account.is_system && account.is_active && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => archiveAccount.mutate(account.id)}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Edit dialog */}
      <Dialog open={!!editingAccount} onOpenChange={(open) => !open && setEditingAccount(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Account — {editingAccount?.code}</DialogTitle>
          </DialogHeader>
          {editingAccount && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sub-type</Label>
                <Input
                  value={editingAccount.sub_type || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, sub_type: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editingAccount.description || ''}
                  onChange={(e) => setEditingAccount({ ...editingAccount, description: e.target.value || null })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  updateAccount.mutate({
                    id: editingAccount.id,
                    name: editingAccount.name,
                    description: editingAccount.description || '',
                    sub_type: editingAccount.sub_type || '',
                  })
                }
                disabled={updateAccount.isPending}
              >
                {updateAccount.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChartOfAccounts;
