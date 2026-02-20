import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, ArrowRight, Building2, Globe, CheckCircle2 } from 'lucide-react';
import { COA_TEMPLATES, DEFAULT_TAX_RATES, CURRENCY_OPTIONS } from '@/constants/coaTemplates';
import type { AccountingScopeType, SetupWizardFormData } from '@/types/accounting';

const STEPS = ['Scope', 'Offices', 'Currency & Tax', 'Chart of Accounts', 'Review'];

const AccountingSetup = () => {
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<SetupWizardFormData>({
    scopeType: 'ORG_WIDE',
    officeIds: [],
    baseCurrency: 'AUD',
    taxInclusive: true,
    templateId: 'standard',
  });

  const { data: offices = [] } = useQuery({
    queryKey: ['offices', currentOrg?.id],
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

  const handleNext = () => {
    // Skip offices step if ORG_WIDE
    if (step === 0 && form.scopeType === 'ORG_WIDE') {
      setStep(2);
      return;
    }
    if (step === 1 && form.scopeType !== 'ORG_WIDE' && form.officeIds.length === 0) {
      toast.error('Please select at least one office');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    if (step === 2 && form.scopeType === 'ORG_WIDE') {
      setStep(0);
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleActivate = async () => {
    if (!currentOrg || !user) return;
    setSaving(true);

    try {
      // 1. Create accounting setup
      const { data: setup, error: setupError } = await supabase
        .from('accounting_setups')
        .insert({
          organization_id: currentOrg.id,
          scope_type: form.scopeType,
          base_currency: form.baseCurrency,
          tax_inclusive: form.taxInclusive,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (setupError) throw setupError;

      // 2. Create setup offices (for non-ORG_WIDE)
      if (form.scopeType !== 'ORG_WIDE' && form.officeIds.length > 0) {
        const { error: officeError } = await supabase
          .from('accounting_setup_offices')
          .insert(form.officeIds.map((oid) => ({ setup_id: setup.id, office_id: oid })));
        if (officeError) throw officeError;
      }

      // 3. Create ledger
      const ledgerName =
        form.scopeType === 'ORG_WIDE'
          ? `${currentOrg.name} Books`
          : form.scopeType === 'OFFICE_SINGLE'
            ? `${offices.find((o) => o.id === form.officeIds[0])?.name || 'Office'} Books`
            : 'Multi-Office Books';

      const { data: ledger, error: ledgerError } = await supabase
        .from('accounting_ledgers')
        .insert({
          organization_id: currentOrg.id,
          setup_id: setup.id,
          name: ledgerName,
        })
        .select()
        .single();

      if (ledgerError) throw ledgerError;

      // 4. Populate COA from template
      const template = COA_TEMPLATES.find((t) => t.id === form.templateId);
      if (template) {
        const accounts = template.accounts.map((a, i) => ({
          ledger_id: ledger.id,
          code: a.code,
          name: a.name,
          type: a.type,
          sub_type: a.sub_type || null,
          is_system: a.is_system || false,
          sort_order: i,
        }));

        const { error: coaError } = await supabase.from('chart_of_accounts').insert(accounts);
        if (coaError) throw coaError;
      }

      // 5. Create default tax rates
      const { error: taxError } = await supabase.from('tax_rates').insert(
        DEFAULT_TAX_RATES.map((t) => ({
          organization_id: currentOrg.id,
          name: t.name,
          rate: t.rate,
          is_default: t.is_default,
        }))
      );
      if (taxError) throw taxError;

      // 6. Audit event
      await supabase.from('accounting_audit_events').insert({
        organization_id: currentOrg.id,
        ledger_id: ledger.id,
        entity_type: 'accounting_setup',
        entity_id: setup.id,
        action: 'created_and_activated',
        actor_id: user.id,
        after_data: { scope_type: form.scopeType, base_currency: form.baseCurrency, template: form.templateId },
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['accounting-setup'] });
      queryClient.invalidateQueries({ queryKey: ['accounting-ledger'] });

      toast.success('Accounting setup complete!');
      navigateOrg('/accounting');
    } catch (err: any) {
      console.error('Accounting setup error:', err);
      toast.error(err.message || 'Failed to complete setup');
    } finally {
      setSaving(false);
    }
  };

  const selectedTemplate = COA_TEMPLATES.find((t) => t.id === form.templateId);

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigateOrg('/accounting')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Accounting
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Set Up Accounting</h1>
        <p className="text-muted-foreground mt-1">Configure your books in a few steps.</p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className="w-8 h-0.5 bg-muted" />}
          </div>
        ))}
      </div>

      {/* Step 0: Scope */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Accounting Scope</CardTitle>
            <CardDescription>Choose which offices this accounting setup applies to.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.scopeType}
              onValueChange={(v) => setForm((f) => ({ ...f, scopeType: v as AccountingScopeType, officeIds: v === 'ORG_WIDE' ? [] : f.officeIds }))}
              className="space-y-3"
            >
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="ORG_WIDE" />
                <div>
                  <div className="font-medium flex items-center gap-2"><Globe className="h-4 w-4" /> Organisation-wide</div>
                  <p className="text-sm text-muted-foreground mt-1">One set of books for the entire organisation. All offices share the same ledger. New offices are included automatically.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="OFFICE_SINGLE" />
                <div>
                  <div className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> Single Office</div>
                  <p className="text-sm text-muted-foreground mt-1">Accounting for one specific office only.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="OFFICE_SET" />
                <div>
                  <div className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4" /> Multiple Offices</div>
                  <p className="text-sm text-muted-foreground mt-1">A shared ledger for a selected set of offices.</p>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Select Offices */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select {form.scopeType === 'OFFICE_SINGLE' ? 'Office' : 'Offices'}</CardTitle>
            <CardDescription>
              {form.scopeType === 'OFFICE_SINGLE'
                ? 'Choose the office for this accounting setup.'
                : 'Select which offices will share this ledger.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {offices.map((office) => (
              <label
                key={office.id}
                className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {form.scopeType === 'OFFICE_SINGLE' ? (
                  <RadioGroup
                    value={form.officeIds[0] || ''}
                    onValueChange={(v) => setForm((f) => ({ ...f, officeIds: [v] }))}
                  >
                    <RadioGroupItem value={office.id} />
                  </RadioGroup>
                ) : (
                  <Checkbox
                    checked={form.officeIds.includes(office.id)}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({
                        ...f,
                        officeIds: checked
                          ? [...f.officeIds, office.id]
                          : f.officeIds.filter((id) => id !== office.id),
                      }))
                    }
                  />
                )}
                <span className="font-medium">{office.name}</span>
              </label>
            ))}
            {offices.length === 0 && (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No offices found. Please create offices first in Team → Offices.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Currency & Tax */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Currency & Tax</CardTitle>
            <CardDescription>Set your base currency and tax preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Base Currency</Label>
              <Select value={form.baseCurrency} onValueChange={(v) => setForm((f) => ({ ...f, baseCurrency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Tax Inclusive Pricing</Label>
                <p className="text-sm text-muted-foreground">Amounts include tax by default</p>
              </div>
              <Switch
                checked={form.taxInclusive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, taxInclusive: v }))}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: COA Template */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Chart of Accounts Template</CardTitle>
            <CardDescription>Choose a pre-built chart of accounts. You can customise it later.</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={form.templateId}
              onValueChange={(v) => setForm((f) => ({ ...f, templateId: v }))}
              className="space-y-3"
            >
              {COA_TEMPLATES.map((t) => (
                <label key={t.id} className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={t.id} />
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.accounts.length} accounts</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Activate</CardTitle>
            <CardDescription>Confirm your accounting setup before activating.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Scope</span>
                <p className="font-medium">
                  {form.scopeType === 'ORG_WIDE' ? 'Organisation-wide' : form.scopeType === 'OFFICE_SINGLE' ? 'Single Office' : 'Multiple Offices'}
                </p>
              </div>
              {form.scopeType !== 'ORG_WIDE' && (
                <div>
                  <span className="text-muted-foreground">Offices</span>
                  <p className="font-medium">
                    {form.officeIds
                      .map((id) => offices.find((o) => o.id === id)?.name)
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Currency</span>
                <p className="font-medium">{form.baseCurrency}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tax</span>
                <p className="font-medium">{form.taxInclusive ? 'Inclusive' : 'Exclusive'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Template</span>
                <p className="font-medium">{selectedTemplate?.name} ({selectedTemplate?.accounts.length} accounts)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={handleNext}>
            Next <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleActivate} disabled={saving}>
            {saving ? 'Activating…' : 'Activate Accounting'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default AccountingSetup;
