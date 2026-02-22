/**
 * QuotationSettingsForm - Org-level quotation settings
 */
import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useCRMQuotationSettings } from '@/services/useCRMQuotations';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const QuotationSettingsForm = () => {
  const { currentOrg } = useOrganization();
  const { data: settings, isLoading } = useCRMQuotationSettings();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const [autoProcess, setAutoProcess] = useState(false);
  const [autoInvoice, setAutoInvoice] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('AUD');
  const [validityDays, setValidityDays] = useState(30);
  const [prefix, setPrefix] = useState('QUO-');
  const [coverLetter, setCoverLetter] = useState('');

  useEffect(() => {
    if (settings) {
      setAutoProcess(settings.auto_process_on_approve);
      setAutoInvoice(settings.auto_create_invoice);
      setDefaultCurrency(settings.default_currency);
      setValidityDays(settings.default_validity_days);
      setPrefix(settings.quotation_prefix);
      setCoverLetter(settings.default_cover_letter || '');
    }
  }, [settings]);

  const handleSave = async () => {
    if (!currentOrg?.id) return;
    setSaving(true);

    try {
      const payload = {
        organization_id: currentOrg.id,
        auto_process_on_approve: autoProcess,
        auto_create_invoice: autoInvoice,
        default_currency: defaultCurrency,
        default_validity_days: validityDays,
        quotation_prefix: prefix,
        default_cover_letter: coverLetter || null,
      };

      if (settings?.id) {
        const { error } = await supabase
          .from('crm_quotation_settings')
          .update(payload as any)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('crm_quotation_settings')
          .insert(payload as any);
        if (error) throw error;
      }

      qc.invalidateQueries({ queryKey: ['crm-quotation-settings'] });
      toast.success('Quotation settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quotation Settings</CardTitle>
        <CardDescription>Configure default quotation behavior for your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prefix">Quotation Prefix</Label>
            <Input id="prefix" value={prefix} onChange={e => setPrefix(e.target.value)} placeholder="QUO-" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Default Currency</Label>
            <Input id="currency" value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} placeholder="AUD" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validity">Default Validity (days)</Label>
            <Input id="validity" type="number" min={1} value={validityDays} onChange={e => setValidityDays(Number(e.target.value))} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="coverLetter">Default Cover Letter</Label>
          <Textarea
            id="coverLetter"
            value={coverLetter}
            onChange={e => setCoverLetter(e.target.value)}
            placeholder="Default message to include with quotations..."
            rows={4}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-process on Approval</Label>
              <p className="text-xs text-muted-foreground">Automatically create a deal when a quotation is approved</p>
            </div>
            <Switch checked={autoProcess} onCheckedChange={setAutoProcess} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-create Invoice</Label>
              <p className="text-xs text-muted-foreground">Automatically generate an invoice when a quotation is approved</p>
            </div>
            <Switch checked={autoInvoice} onCheckedChange={setAutoInvoice} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
