import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import type { ChartOfAccount, AccountingContact, TaxRate } from '@/types/accounting';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unit_price: string;
  account_id: string;
  tax_rate_id: string;
}

const emptyLine = (): LineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: '1',
  unit_price: '',
  account_id: '',
  tax_rate_id: '',
});

const BillEditor = () => {
  const { billId } = useParams<{ billId: string }>();
  const isNew = !billId || billId === 'new';
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { ledger, isSetupComplete, loading: setupLoading, setup } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const queryClient = useQueryClient();

  const [officeId, setOfficeId] = useState('');
  const [contactId, setContactId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const { data: contacts = [] } = useQuery({
    queryKey: ['accounting-contacts-suppliers', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_contacts')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .eq('is_active', true)
        .in('contact_type', ['supplier', 'both'])
        .order('name');
      if (error) throw error;
      return data as AccountingContact[];
    },
    enabled: !!currentOrg?.id,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts-all', ledger?.id],
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
    queryKey: ['offices-for-bill', currentOrg?.id],
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

  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_rates')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as TaxRate[];
    },
    enabled: !!currentOrg?.id,
  });

  useEffect(() => {
    if (isNew && ledger?.id) {
      supabase
        .from('accounting_bills')
        .select('bill_number')
        .eq('ledger_id', ledger.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .then(({ data }) => {
          const last = data?.[0]?.bill_number;
          if (last) {
            const num = parseInt(last.replace(/\D/g, '')) || 0;
            setBillNumber(`BILL-${String(num + 1).padStart(4, '0')}`);
          } else {
            setBillNumber('BILL-0001');
          }
        });
    }
  }, [isNew, ledger?.id]);

  const addLine = () => setLines((l) => [...l, emptyLine()]);
  const removeLine = (id: string) => setLines((l) => l.filter((x) => x.id !== id));
  const updateLine = (id: string, field: keyof LineItem, value: string) =>
    setLines((l) => l.map((x) => (x.id === id ? { ...x, [field]: value } : x)));

  const computeLineAmount = (line: LineItem) => {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unit_price) || 0;
    return qty * price;
  };

  const computeLineTax = (line: LineItem) => {
    const amount = computeLineAmount(line);
    const rate = taxRates.find((t) => t.id === line.tax_rate_id);
    return rate ? amount * (rate.rate / 100) : 0;
  };

  const subtotal = lines.reduce((s, l) => s + computeLineAmount(l), 0);
  const taxTotal = lines.reduce((s, l) => s + computeLineTax(l), 0);
  const total = subtotal + taxTotal;

  const handleSave = async (andApprove = false) => {
    if (!currentOrg || !user || !ledger || !officeId) {
      toast.error('Please fill in all required fields');
      return;
    }
    const validLines = lines.filter((l) => l.description && l.account_id && parseFloat(l.unit_price) > 0);
    if (validLines.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const { data: bill, error: bErr } = await supabase
        .from('accounting_bills')
        .insert({
          organization_id: currentOrg.id,
          ledger_id: ledger.id,
          office_id: officeId,
          contact_id: contactId || null,
          bill_number: billNumber,
          reference: reference || null,
          date,
          due_date: dueDate,
          subtotal,
          tax_total: taxTotal,
          total,
          currency: setup?.base_currency || 'AUD',
          notes: notes || null,
          status: andApprove ? 'approved' : 'draft',
          created_by: user.id,
          approved_by: andApprove ? user.id : null,
          approved_at: andApprove ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (bErr) throw bErr;

      const { error: lErr } = await supabase.from('accounting_bill_lines').insert(
        validLines.map((l, i) => ({
          bill_id: bill.id,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          amount: computeLineAmount(l),
          account_id: l.account_id,
          tax_rate_id: l.tax_rate_id || null,
          tax_amount: computeLineTax(l),
          sort_order: i,
        }))
      );
      if (lErr) throw lErr;

      await supabase.from('accounting_audit_events').insert({
        organization_id: currentOrg.id,
        ledger_id: ledger.id,
        office_id: officeId,
        entity_type: 'accounting_bill',
        entity_id: bill.id,
        action: andApprove ? 'created_and_approved' : 'created_draft',
        actor_id: user.id,
        after_data: { bill_number: billNumber, total, lines: validLines.length },
      });

      queryClient.invalidateQueries({ queryKey: ['accounting-bills'] });
      toast.success(andApprove ? 'Bill created & approved' : 'Bill saved as draft');
      navigateOrg('/accounting/bills');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  if (setupLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isSetupComplete) {
    return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <OrgLink to="/accounting/bills">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </OrgLink>
        <h1 className="text-2xl font-bold">{isNew ? 'New Bill' : 'Edit Bill'}</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Bill Number</Label>
              <Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Office *</Label>
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
              <Label>Supplier</Label>
              <Select value={contactId} onValueChange={setContactId}>
                <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Supplier ref, PO#" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line Items</CardTitle>
          <Button variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-3 w-3 mr-1" /> Add Line
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="w-[120px]">Unit Price</TableHead>
                <TableHead className="w-[180px]">Account</TableHead>
                <TableHead className="w-[140px]">Tax</TableHead>
                <TableHead className="w-[100px] text-right">Amount</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <Input value={line.description} onChange={(e) => updateLine(line.id, 'description', e.target.value)} placeholder="Item description" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={line.quantity} onChange={(e) => updateLine(line.id, 'quantity', e.target.value)} className="text-right" />
                  </TableCell>
                  <TableCell>
                    <Input type="number" value={line.unit_price} onChange={(e) => updateLine(line.id, 'unit_price', e.target.value)} placeholder="0.00" className="text-right" />
                  </TableCell>
                  <TableCell>
                    <Select value={line.account_id} onValueChange={(v) => updateLine(line.id, 'account_id', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
                      <SelectContent>
                        {accounts.filter((a) => a.type === 'expense').map((a) => (
                          <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={line.tax_rate_id} onValueChange={(v) => updateLine(line.id, 'tax_rate_id', v)}>
                      <SelectTrigger className="text-xs"><SelectValue placeholder="No tax" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Tax</SelectItem>
                        {taxRates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate}%)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {computeLineAmount(line).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {lines.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(line.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col items-end space-y-1">
            <div className="flex justify-between w-60">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-medium">{subtotal.toFixed(2)}</span>
            </div>
            {taxTotal > 0 && (
              <div className="flex justify-between w-60">
                <span className="text-sm text-muted-foreground">Tax</span>
                <span className="font-medium">{taxTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between w-60 border-t pt-1">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigateOrg('/accounting/bills')}>Cancel</Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>Save Draft</Button>
        <Button onClick={() => handleSave(true)} disabled={saving}>
          {saving ? 'Saving…' : 'Save & Approve'}
        </Button>
      </div>
    </div>
  );
};

export default BillEditor;
