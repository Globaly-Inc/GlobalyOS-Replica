import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { OfficeSelector } from '@/components/accounting/OfficeSelector';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Check, AlertCircle, FileText, Eye } from 'lucide-react';
import type { ChartOfAccount, Journal, JournalLine } from '@/types/accounting';

interface LineItem {
  id: string;
  account_id: string;
  description: string;
  debit: string;
  credit: string;
}

const emptyLine = (): LineItem => ({
  id: crypto.randomUUID(),
  account_id: '',
  description: '',
  debit: '',
  credit: '',
});

const JournalEntry = () => {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { ledger, isSetupComplete, loading: setupLoading, setupOfficeIds } = useAccountingSetup();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('create');
  const [selectedOffice, setSelectedOffice] = useState<string | 'all'>('all');

  // New journal form
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine(), emptyLine()]);
  const [saving, setSaving] = useState(false);

  // View journal
  const [viewingJournal, setViewingJournal] = useState<string | null>(null);

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

  const { data: offices = [] } = useQuery({
    queryKey: ['offices-for-journal', currentOrg?.id],
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

  const { data: journals = [], isLoading: journalsLoading } = useQuery({
    queryKey: ['journals', ledger?.id, selectedOffice],
    queryFn: async () => {
      let query = supabase
        .from('journals')
        .select('*')
        .eq('ledger_id', ledger!.id)
        .order('journal_number', { ascending: false })
        .limit(50);
      if (selectedOffice !== 'all') query = query.eq('office_id', selectedOffice);
      const { data, error } = await query;
      if (error) throw error;
      return data as Journal[];
    },
    enabled: !!ledger?.id,
  });

  const { data: viewLines = [] } = useQuery({
    queryKey: ['journal-lines', viewingJournal],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_lines')
        .select('*, chart_of_accounts(code, name)')
        .eq('journal_id', viewingJournal!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!viewingJournal,
  });

  const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebits > 0 && totalDebits === totalCredits;

  const addLine = () => setLines((l) => [...l, emptyLine()]);
  const removeLine = (id: string) => setLines((l) => l.filter((x) => x.id !== id));
  const updateLine = (id: string, field: keyof LineItem, value: string) =>
    setLines((l) => l.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const handleSave = async (post: boolean) => {
    if (!currentOrg || !user || !ledger || !officeId) {
      toast.error('Please select an office');
      return;
    }
    const validLines = lines.filter((l) => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) {
      toast.error('At least 2 lines required');
      return;
    }
    if (post && !isBalanced) {
      toast.error('Journal must be balanced to post');
      return;
    }

    setSaving(true);
    try {
      // Create journal
      const { data: journal, error: jErr } = await supabase
        .from('journals')
        .insert({
          organization_id: currentOrg.id,
          ledger_id: ledger.id,
          office_id: officeId,
          date,
          memo: memo || null,
          status: 'draft',
          source_type: 'manual',
          created_by: user.id,
        })
        .select()
        .single();
      if (jErr) throw jErr;

      // Create lines
      const { error: lErr } = await supabase.from('journal_lines').insert(
        validLines.map((l, i) => ({
          journal_id: journal.id,
          account_id: l.account_id,
          description: l.description || null,
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          sort_order: i,
        }))
      );
      if (lErr) throw lErr;

      // Post if requested
      if (post) {
        const { error: pErr } = await supabase
          .from('journals')
          .update({ status: 'posted' })
          .eq('id', journal.id);
        if (pErr) throw pErr;
      }

      // Audit
      await supabase.from('accounting_audit_events').insert({
        organization_id: currentOrg.id,
        ledger_id: ledger.id,
        office_id: officeId,
        entity_type: 'journal',
        entity_id: journal.id,
        action: post ? 'created_and_posted' : 'created_draft',
        actor_id: user.id,
        after_data: { date, memo, lines: validLines.length },
      });

      queryClient.invalidateQueries({ queryKey: ['journals'] });
      toast.success(post ? 'Journal posted' : 'Journal saved as draft');
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setMemo('');
      setLines([emptyLine(), emptyLine()]);
      setTab('list');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save journal');
    } finally {
      setSaving(false);
    }
  };

  const postDraft = useMutation({
    mutationFn: async (journalId: string) => {
      const { error } = await supabase
        .from('journals')
        .update({ status: 'posted' })
        .eq('id', journalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      toast.success('Journal posted');
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (setupLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Journals</h1>
        <OfficeSelector value={selectedOffice} onChange={setSelectedOffice} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="list"><FileText className="h-4 w-4 mr-1" /> Journal List</TabsTrigger>
          {isAdmin && <TabsTrigger value="create"><Plus className="h-4 w-4 mr-1" /> New Journal</TabsTrigger>}
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">#</TableHead>
                    <TableHead className="w-[120px]">Date</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead className="w-[100px]">Source</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono">{j.journal_number}</TableCell>
                      <TableCell>{j.date}</TableCell>
                      <TableCell className="max-w-xs truncate">{j.memo || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{j.source_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={j.status === 'posted' ? 'default' : j.status === 'reversed' ? 'destructive' : 'secondary'}>
                          {j.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewingJournal(j.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {j.status === 'draft' && isAdmin && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => postDraft.mutate(j.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {journals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No journals yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>New Manual Journal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Office</Label>
                  <Select value={officeId} onValueChange={setOfficeId}>
                    <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                    <SelectContent>
                      {offices.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Memo</Label>
                  <Input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Journal description" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Line Items</Label>
                  <Button variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-3 w-3 mr-1" /> Add Line
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[130px] text-right">Debit</TableHead>
                      <TableHead className="w-[130px] text-right">Credit</TableHead>
                      <TableHead className="w-[50px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Select value={line.account_id} onValueChange={(v) => updateLine(line.id, 'account_id', v)}>
                            <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {accounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.code} — {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                            placeholder="Description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="text-right"
                            value={line.debit}
                            onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="text-right"
                            value={line.credit}
                            onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          {lines.length > 2 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(line.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold">
                      <TableCell colSpan={2} className="text-right">Totals</TableCell>
                      <TableCell className="text-right">{totalDebits.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{totalCredits.toFixed(2)}</TableCell>
                      <TableCell>
                        {isBalanced ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {!isBalanced && totalDebits > 0 && (
                  <p className="text-sm text-destructive mt-1">
                    Difference: {Math.abs(totalDebits - totalCredits).toFixed(2)} — journal must balance to post
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                  Save Draft
                </Button>
                <Button onClick={() => handleSave(true)} disabled={saving || !isBalanced}>
                  {saving ? 'Saving…' : 'Save & Post'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View journal dialog */}
      <Dialog open={!!viewingJournal} onOpenChange={(open) => !open && setViewingJournal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Journal Details</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewLines.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-sm">
                    {l.chart_of_accounts?.code} — {l.chart_of_accounts?.name}
                  </TableCell>
                  <TableCell>{l.description || '—'}</TableCell>
                  <TableCell className="text-right">{l.debit > 0 ? l.debit.toFixed(2) : ''}</TableCell>
                  <TableCell className="text-right">{l.credit > 0 ? l.credit.toFixed(2) : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JournalEntry;
