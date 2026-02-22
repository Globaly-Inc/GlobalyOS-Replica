import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { OrgLink } from '@/components/OrgLink';
import { InvoiceServiceBlock } from '@/components/accounting/InvoiceServiceBlock';
import { useSaveInvoice, usePaymentOptions } from '@/services/useAccountingInvoices';
import type {
  ChartOfAccount, AccountingContact, TaxRate,
  InvoiceFormData, InvoiceServiceFormData, InvoiceLineFormData,
  CrmInvoiceType, CrmInvoiceRecipientType, InvoiceTaxType,
} from '@/types/accounting';

const emptyLine = (): InvoiceLineFormData => ({
  description: '', fee_type: '', account_category: '',
  quantity: 1, unit_price: 0, amount: 0,
  tax_rate_id: '', tax_amount: 0, is_discount: false, account_id: '',
});

const emptyService = (): InvoiceServiceFormData => ({
  service_name: '', provider_name: '', lines: [emptyLine()],
});

const InvoiceEditor = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const isNew = !invoiceId || invoiceId === 'new';
  const { currentOrg } = useOrganization();
  const { ledger, isSetupComplete, loading: setupLoading, setup } = useAccountingSetup();
  const { navigateOrg } = useOrgNavigation();
  const saveInvoice = useSaveInvoice();
  const { data: paymentOptions = [] } = usePaymentOptions();

  // Form state
  const [invoiceType, setInvoiceType] = useState<CrmInvoiceType>('general');
  const [recipientType, setRecipientType] = useState<CrmInvoiceRecipientType>('contact');
  const [officeId, setOfficeId] = useState('');
  const [contactId, setContactId] = useState('');
  const [crmContactId, setCrmContactId] = useState('');
  const [crmPartnerId, setCrmPartnerId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('');
  const [taxType, setTaxType] = useState<InvoiceTaxType>('exclusive');
  const [paymentOptionId, setPaymentOptionId] = useState('');
  const [enableOnlinePayment, setEnableOnlinePayment] = useState(false);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [services, setServices] = useState<InvoiceServiceFormData[]>([emptyService()]);

  // Data queries
  const { data: contacts = [] } = useQuery({
    queryKey: ['accounting-contacts', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('accounting_contacts').select('*')
        .eq('organization_id', currentOrg!.id).eq('is_active', true)
        .in('contact_type', ['customer', 'both']).order('name');
      if (error) throw error;
      return data as AccountingContact[];
    },
    enabled: !!currentOrg?.id,
  });

  const { data: crmContacts = [] } = useQuery({
    queryKey: ['crm-contacts-for-invoice', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_contacts').select('id, first_name, last_name, email')
        .eq('organization_id', currentOrg!.id).order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const { data: crmPartners = [] } = useQuery({
    queryKey: ['crm-partners-for-invoice', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('crm_partners').select('id, name, email')
        .eq('organization_id', currentOrg!.id).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && recipientType === 'partner',
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts-revenue', ledger?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('chart_of_accounts').select('*')
        .eq('ledger_id', ledger!.id).eq('is_active', true).order('code');
      if (error) throw error;
      return data as ChartOfAccount[];
    },
    enabled: !!ledger?.id,
  });

  const { data: offices = [] } = useQuery({
    queryKey: ['offices-for-invoice', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('offices').select('id, name')
        .eq('organization_id', currentOrg!.id).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id,
  });

  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_rates').select('*')
        .eq('organization_id', currentOrg!.id).eq('is_active', true).order('name');
      if (error) throw error;
      return data as TaxRate[];
    },
    enabled: !!currentOrg?.id,
  });

  // Auto-generate invoice number
  useEffect(() => {
    if (isNew && ledger?.id) {
      supabase.from('accounting_invoices').select('invoice_number')
        .eq('ledger_id', ledger.id).order('created_at', { ascending: false }).limit(1)
        .then(({ data }) => {
          const last = data?.[0]?.invoice_number;
          const num = last ? (parseInt(last.replace(/\D/g, '')) || 0) : 0;
          setInvoiceNumber(`INV-${String(num + 1).padStart(4, '0')}`);
        });
    }
  }, [isNew, ledger?.id]);

  useEffect(() => {
    if (setup?.base_currency && !currency) setCurrency(setup.base_currency);
  }, [setup?.base_currency]);

  const updateService = (index: number, service: InvoiceServiceFormData) => {
    setServices((s) => s.map((sv, i) => (i === index ? service : sv)));
  };

  const removeService = (index: number) => {
    setServices((s) => {
      const n = s.filter((_, i) => i !== index);
      return n.length > 0 ? n : [emptyService()];
    });
  };

  const addService = () => setServices((s) => [...s, emptyService()]);

  // Totals
  const totals = (() => {
    let subtotal = 0, taxTotal = 0, discountTotal = 0;
    for (const svc of services) {
      for (const l of svc.lines) {
        if (l.is_discount) discountTotal += Math.abs(l.amount);
        else subtotal += l.amount;
        taxTotal += l.tax_amount;
      }
    }
    return { subtotal, taxTotal, discountTotal, total: subtotal - discountTotal + taxTotal };
  })();

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'AUD' }).format(n);

  const handleSave = async (approve = false) => {
    if (!officeId) { toast.error('Please select an office'); return; }
    const hasLines = services.some((s) => s.lines.some((l) => l.description && l.account_id));
    if (!hasLines) { toast.error('Add at least one fee line'); return; }

    const formData: InvoiceFormData = {
      invoice_type: invoiceType,
      recipient_type: recipientType,
      contact_id: contactId || undefined,
      crm_contact_id: crmContactId || undefined,
      crm_partner_id: crmPartnerId || undefined,
      invoice_number: invoiceNumber,
      reference: reference || undefined,
      date, due_date: dueDate,
      currency: currency || setup?.base_currency || 'AUD',
      tax_type: taxType,
      payment_option_id: paymentOptionId || undefined,
      enable_online_payment: enableOnlinePayment,
      notes: notes || undefined,
      terms: terms || undefined,
      services,
      attachments: [],
    };

    try {
      await saveInvoice.mutateAsync({ formData, officeId, approve });
      toast.success(approve ? 'Invoice created & approved' : 'Invoice saved as draft');
      navigateOrg('/accounting/invoices');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save invoice');
    }
  };

  if (setupLoading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isSetupComplete) return <div className="text-center py-20 text-muted-foreground">Please complete accounting setup first.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <OrgLink to="/accounting/invoices">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </OrgLink>
        <h1 className="text-2xl font-bold">{isNew ? 'New Invoice' : 'Edit Invoice'}</h1>
      </div>

      {/* Invoice type tabs */}
      <Tabs value={invoiceType} onValueChange={(v) => setInvoiceType(v as CrmInvoiceType)}>
        <TabsList>
          <TabsTrigger value="general">General Invoice</TabsTrigger>
          <TabsTrigger value="commission">Commission Invoice</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Header Fields */}
      <Card>
        <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Invoice Number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Office *</Label>
              <Select value={officeId} onValueChange={setOfficeId}>
                <SelectTrigger><SelectValue placeholder="Select office" /></SelectTrigger>
                <SelectContent>{offices.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <Separator />

          {/* Recipient */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Recipient Type</Label>
              <Select value={recipientType} onValueChange={(v) => setRecipientType(v as CrmInvoiceRecipientType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">Contact / Client</SelectItem>
                  <SelectItem value="partner">Partner / Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === 'contact' && (
              <>
                <div className="space-y-2">
                  <Label>CRM Contact</Label>
                  <Select value={crmContactId} onValueChange={setCrmContactId}>
                    <SelectTrigger><SelectValue placeholder="Select CRM contact" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {crmContacts.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Accounting Contact</Label>
                  <Select value={contactId} onValueChange={setContactId}>
                    <SelectTrigger><SelectValue placeholder="Or legacy contact" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {recipientType === 'partner' && (
              <div className="space-y-2">
                <Label>Partner</Label>
                <Select value={crmPartnerId} onValueChange={setCrmPartnerId}>
                  <SelectTrigger><SelectValue placeholder="Select partner" /></SelectTrigger>
                  <SelectContent>
                    {crmPartners.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="PO #, etc." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="AUD" />
            </div>
            <div className="space-y-2">
              <Label>Tax Type</Label>
              <Select value={taxType} onValueChange={(v) => setTaxType(v as InvoiceTaxType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Tax Exclusive</SelectItem>
                  <SelectItem value="inclusive">Tax Inclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Option</Label>
              <Select value={paymentOptionId} onValueChange={setPaymentOptionId}>
                <SelectTrigger><SelectValue placeholder="Select payment option" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {paymentOptions.map((po) => <SelectItem key={po.id} value={po.id}>{po.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end pb-2 gap-2">
              <Switch checked={enableOnlinePayment} onCheckedChange={setEnableOnlinePayment} />
              <Label className="text-xs">Enable Online Payment</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Blocks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Services & Fees</h2>
          <Button variant="outline" size="sm" onClick={addService}>
            <Plus className="h-3 w-3 mr-1" /> Add Service
          </Button>
        </div>

        {services.map((svc, i) => (
          <InvoiceServiceBlock
            key={i}
            service={svc}
            index={i}
            accounts={accounts}
            taxRates={taxRates}
            currency={currency || 'AUD'}
            onUpdate={updateService}
            onRemove={removeService}
          />
        ))}
      </div>

      {/* Totals */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col items-end space-y-1">
            <div className="flex justify-between w-64">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatAmount(totals.subtotal)}</span>
            </div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between w-64">
                <span className="text-sm text-destructive">Discount</span>
                <span className="text-destructive">-{formatAmount(totals.discountTotal)}</span>
              </div>
            )}
            {totals.taxTotal > 0 && (
              <div className="flex justify-between w-64">
                <span className="text-sm text-muted-foreground">Tax</span>
                <span>{formatAmount(totals.taxTotal)}</span>
              </div>
            )}
            <Separator className="w-64" />
            <div className="flex justify-between w-64">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg">{formatAmount(totals.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Notes (visible on invoice)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} placeholder="e.g. Net 30" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigateOrg('/accounting/invoices')}>Cancel</Button>
        <Button variant="secondary" onClick={() => handleSave(false)} disabled={saveInvoice.isPending}>
          {saveInvoice.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save Draft'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saveInvoice.isPending}>
          {saveInvoice.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</> : 'Save & Approve'}
        </Button>
      </div>
    </div>
  );
};

export default InvoiceEditor;
