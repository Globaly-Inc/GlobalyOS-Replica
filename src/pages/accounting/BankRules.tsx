import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrgLink } from '@/components/OrgLink';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { BankRule, ChartOfAccount } from '@/types/accounting';

const BankRules = () => {
  const { currentOrg } = useOrganization();
  const { ledger, isSetupComplete, loading: setupLoading } = useAccountingSetup();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BankRule | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [conditionField, setConditionField] = useState('description');
  const [conditionOp, setConditionOp] = useState('contains');
  const [conditionValue, setConditionValue] = useState('');
  const [actionAccountId, setActionAccountId] = useState('');
  const [autoAdd, setAutoAdd] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['bank-rules', ledger?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_rules')
        .select('*')
        .eq('ledger_id', ledger!.id)
        .order('priority');
      if (error) throw error;
      return data as BankRule[];
    },
    enabled: !!ledger?.id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts-for-rules', ledger?.id],
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name || !conditionValue || !actionAccountId || !ledger || !currentOrg) {
        throw new Error('Fill in all required fields');
      }
      const payload = {
        organization_id: currentOrg.id,
        ledger_id: ledger.id,
        name,
        conditions: [{ field: conditionField, operator: conditionOp, value: conditionValue }],
        actions: { categorize_account_id: actionAccountId },
        auto_add: autoAdd,
        priority: editingRule?.priority ?? rules.length,
      };

      if (editingRule) {
        const { error } = await supabase.from('bank_rules').update(payload).eq('id', editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bank_rules').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-rules'] });
      toast.success(editingRule ? 'Rule updated' : 'Rule created');
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bank_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-rules'] });
      toast.success('Rule deleted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('bank_rules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-rules'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openEdit = (rule: BankRule) => {
    setEditingRule(rule);
    setName(rule.name);
    const cond = (rule.conditions as any[])?.[0] || {};
    setConditionField(cond.field || 'description');
    setConditionOp(cond.operator || 'contains');
    setConditionValue(cond.value || '');
    setActionAccountId((rule.actions as any)?.categorize_account_id || '');
    setAutoAdd(rule.auto_add);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRule(null);
    setName(''); setConditionField('description'); setConditionOp('contains');
    setConditionValue(''); setActionAccountId(''); setAutoAdd(false);
  };

  if (setupLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OrgLink to="/accounting/banking">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </OrgLink>
          <h1 className="text-2xl font-bold">Bank Rules</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Rule
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Categorise To</TableHead>
                <TableHead className="w-[80px]">Auto</TableHead>
                <TableHead className="w-[80px]">Active</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule, idx) => {
                const cond = (rule.conditions as any[])?.[0];
                const acctId = (rule.actions as any)?.categorize_account_id;
                const acct = accounts.find((a) => a.id === acctId);
                return (
                  <TableRow key={rule.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell className="text-sm">
                      {cond ? `${cond.field} ${cond.operator} "${cond.value}"` : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {acct ? `${acct.code} — ${acct.name}` : '—'}
                    </TableCell>
                    <TableCell>
                      {rule.auto_add && <Badge variant="secondary" className="text-xs">Auto</Badge>}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: rule.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(rule.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No rules yet. Create one to auto-categorise bank transactions.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRule ? 'Edit Rule' : 'New Bank Rule'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rule Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Office rent" />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <div className="grid grid-cols-3 gap-2">
                <Select value={conditionField} onValueChange={setConditionField}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="description">Description</SelectItem>
                    <SelectItem value="payee">Payee</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={conditionOp} onValueChange={setConditionOp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="starts_with">Starts with</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} placeholder="Value" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categorise To *</Label>
              <Select value={actionAccountId} onValueChange={setActionAccountId}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={autoAdd} onCheckedChange={setAutoAdd} />
              <Label>Auto-add matching transactions</Label>
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BankRules;
