/**
 * Accounting Invoices Service Hooks
 * React Query hooks for the revised invoicing system
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { useAuth } from '@/hooks/useAuth';
import type {
  AccountingInvoiceExtended,
  AccountingInvoiceService,
  AccountingInvoiceIncomeSharing,
  AccountingInvoiceComment,
  AccountingPaymentOption,
  AccountingInvoiceSchedule,
  InvoiceFormData,
  CrmInvoiceType,
  InvoiceStatus,
} from '@/types/accounting';

// ============================================================
// Payment Options
// ============================================================

export const usePaymentOptions = () => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['accounting-payment-options', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_payment_options')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data as AccountingPaymentOption[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useCreatePaymentOption = () => {
  const { currentOrg } = useOrganization();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AccountingPaymentOption, 'id' | 'organization_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('accounting_payment_options')
        .insert({ ...input, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting-payment-options'] }),
  });
};

export const useUpdatePaymentOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccountingPaymentOption> & { id: string }) => {
      const { error } = await supabase
        .from('accounting_payment_options')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting-payment-options'] }),
  });
};

export const useDeletePaymentOption = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounting_payment_options')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounting-payment-options'] }),
  });
};

// ============================================================
// Invoice CRUD
// ============================================================

export const useInvoices = (filters?: {
  officeId?: string;
  status?: string;
  invoiceType?: CrmInvoiceType;
}) => {
  const { ledger } = useAccountingSetup();
  return useQuery({
    queryKey: ['accounting-invoices', ledger?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('accounting_invoices')
        .select('*, accounting_contacts(name), crm_contacts(id, first_name, last_name, email), crm_partners(id, name, email)')
        .eq('ledger_id', ledger!.id)
        .order('date', { ascending: false })
        .limit(200);

      if (filters?.officeId && filters.officeId !== 'all') {
        query = query.eq('office_id', filters.officeId);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }
      if (filters?.invoiceType) {
        query = query.eq('invoice_type', filters.invoiceType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ledger?.id,
  });
};

export const useInvoice = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['accounting-invoice', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoices')
        .select('*, accounting_contacts(name, email), crm_contacts(id, first_name, last_name, email), crm_partners(id, name, email)')
        .eq('id', invoiceId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!invoiceId,
  });
};

export const useInvoiceServices = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['accounting-invoice-services', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_services')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('sort_order');
      if (error) throw error;
      return data as AccountingInvoiceService[];
    },
    enabled: !!invoiceId,
  });
};

export const useInvoiceLines = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['accounting-invoice-lines', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_lines')
        .select('*, chart_of_accounts(code, name), tax_rates(name, rate)')
        .eq('invoice_id', invoiceId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
};

export const useInvoicePayments = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['accounting-invoice-payments', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('date');
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
};

// ============================================================
// Income Sharing
// ============================================================

export const useInvoiceIncomeSharing = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['accounting-invoice-income-sharing', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_income_sharing')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('created_at');
      if (error) throw error;
      return data as AccountingInvoiceIncomeSharing[];
    },
    enabled: !!invoiceId,
  });
};

export const useCreateIncomeSharing = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Omit<AccountingInvoiceIncomeSharing, 'id' | 'organization_id' | 'created_at' | 'status' | 'amount_paid' | 'payments'>) => {
      const { data, error } = await supabase
        .from('accounting_invoice_income_sharing')
        .insert({ ...input, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['accounting-invoice-income-sharing', vars.invoice_id] });
    },
  });
};

export const useDeleteIncomeSharing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { error } = await supabase
        .from('accounting_invoice_income_sharing')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return invoiceId;
    },
    onSuccess: (invoiceId) => {
      qc.invalidateQueries({ queryKey: ['accounting-invoice-income-sharing', invoiceId] });
    },
  });
};

// ============================================================
// Invoice Comments
// ============================================================

export const useInvoiceComments = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['accounting-invoice-comments', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_comments')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('created_at');
      if (error) throw error;
      return data as AccountingInvoiceComment[];
    },
    enabled: !!invoiceId,
  });
};

export const useCreateInvoiceComment = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: { invoice_id: string; author_type: string; author_name?: string; content: string }) => {
      const { data, error } = await supabase
        .from('accounting_invoice_comments')
        .insert({ ...input, organization_id: currentOrg!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['accounting-invoice-comments', vars.invoice_id] });
    },
  });
};

// ============================================================
// Invoice Schedules
// ============================================================

export const useInvoiceSchedules = (filters?: { status?: string }) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['accounting-invoice-schedules', currentOrg?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('accounting_invoice_schedules')
        .select('*, crm_deals(id, name), accounting_invoices(id, invoice_number, status)')
        .eq('organization_id', currentOrg!.id)
        .order('scheduled_date');
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentOrg?.id,
  });
};

// ============================================================
// Save Invoice (create or update with services + lines)
// ============================================================

export const useSaveInvoice = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const { ledger, setup } = useAccountingSetup();

  return useMutation({
    mutationFn: async ({
      formData,
      officeId,
      approve = false,
    }: {
      formData: InvoiceFormData;
      officeId: string;
      approve?: boolean;
    }) => {
      if (!currentOrg || !user || !ledger) throw new Error('Missing context');

      // Calculate totals
      let subtotal = 0;
      let taxTotal = 0;
      let discountTotal = 0;
      for (const svc of formData.services) {
        for (const line of svc.lines) {
          if (line.is_discount) {
            discountTotal += Math.abs(line.amount);
          } else {
            subtotal += line.amount;
          }
          taxTotal += line.tax_amount;
        }
      }
      const total = subtotal - discountTotal + taxTotal;

      // Insert invoice
      const { data: invoice, error: iErr } = await supabase
        .from('accounting_invoices')
        .insert({
          organization_id: currentOrg.id,
          ledger_id: ledger.id,
          office_id: officeId,
          invoice_number: formData.invoice_number,
          invoice_type: formData.invoice_type,
          recipient_type: formData.recipient_type,
          contact_id: formData.contact_id || null,
          crm_contact_id: formData.crm_contact_id || null,
          crm_partner_id: formData.crm_partner_id || null,
          deal_id: formData.deal_id || null,
          reference: formData.reference || null,
          date: formData.date,
          due_date: formData.due_date,
          currency: formData.currency || setup?.base_currency || 'AUD',
          tax_type: formData.tax_type,
          payment_option_id: formData.payment_option_id || null,
          enable_online_payment: formData.enable_online_payment,
          billing_address: formData.billing_address || null,
          notes: formData.notes || null,
          terms: formData.terms || null,
          subtotal,
          tax_total: taxTotal,
          discount_total: discountTotal,
          total,
          attachments: formData.attachments || [],
          status: approve ? 'approved' : 'draft',
          created_by: user.id,
          approved_by: approve ? user.id : null,
          approved_at: approve ? new Date().toISOString() : null,
        } as any)
        .select()
        .single();
      if (iErr) throw iErr;

      // Insert service blocks and their lines
      for (let si = 0; si < formData.services.length; si++) {
        const svc = formData.services[si];
        let svcSubtotal = 0;
        let svcTax = 0;
        for (const line of svc.lines) {
          if (!line.is_discount) svcSubtotal += line.amount;
          svcTax += line.tax_amount;
        }

        const { data: svcRow, error: svcErr } = await supabase
          .from('accounting_invoice_services')
          .insert({
            invoice_id: invoice.id,
            organization_id: currentOrg.id,
            service_id: svc.service_id || null,
            service_name: svc.service_name,
            provider_name: svc.provider_name || null,
            deal_fee_id: svc.deal_fee_id || null,
            sort_order: si,
            subtotal: svcSubtotal,
            tax_total: svcTax,
            total: svcSubtotal + svcTax,
          } as any)
          .select()
          .single();
        if (svcErr) throw svcErr;

        // Insert lines for this service
        const lineInserts = svc.lines.map((line, li) => ({
          invoice_id: invoice.id,
          invoice_service_id: svcRow.id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          amount: line.amount,
          account_id: line.account_id,
          tax_rate_id: line.tax_rate_id || null,
          tax_amount: line.tax_amount,
          fee_type: line.fee_type || null,
          account_category: line.account_category || null,
          is_discount: line.is_discount,
          instalment_id: line.instalment_id || null,
          sort_order: li,
        }));

        if (lineInserts.length > 0) {
          const { error: lErr } = await supabase
            .from('accounting_invoice_lines')
            .insert(lineInserts);
          if (lErr) throw lErr;
        }
      }

      // Audit event
      await supabase.from('accounting_audit_events').insert({
        organization_id: currentOrg.id,
        ledger_id: ledger.id,
        office_id: officeId,
        entity_type: 'accounting_invoice',
        entity_id: invoice.id,
        action: approve ? 'created_and_approved' : 'created_draft',
        actor_id: user.id,
        after_data: { invoice_number: formData.invoice_number, total },
      });

      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-invoices'] });
    },
  });
};

// ============================================================
// Update Invoice Status
// ============================================================

export const useUpdateInvoiceStatus = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'approved') {
        updates.approved_by = user?.id;
        updates.approved_at = new Date().toISOString();
      }
      if (status === 'sent') {
        updates.sent_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('accounting_invoices')
        .update(updates)
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ['accounting-invoice', invoiceId] });
      qc.invalidateQueries({ queryKey: ['accounting-invoices'] });
    },
  });
};

// ============================================================
// Record Payment
// ============================================================

export const useRecordInvoicePayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      amount,
      method = 'bank_transfer',
      reference,
      currentAmountPaid = 0,
      invoiceTotal = 0,
    }: {
      invoiceId: string;
      amount: number;
      method?: string;
      reference?: string;
      currentAmountPaid?: number;
      invoiceTotal?: number;
    }) => {
      if (amount <= 0) throw new Error('Invalid amount');

      const { error: pErr } = await supabase
        .from('accounting_invoice_payments')
        .insert({
          invoice_id: invoiceId,
          amount,
          reference: reference || null,
          method,
        });
      if (pErr) throw pErr;

      const newAmountPaid = currentAmountPaid + amount;
      const newStatus = newAmountPaid >= invoiceTotal ? 'paid' : 'partially_paid';
      const { error: uErr } = await supabase
        .from('accounting_invoices')
        .update({ amount_paid: newAmountPaid, status: newStatus })
        .eq('id', invoiceId);
      if (uErr) throw uErr;
    },
    onSuccess: (_, { invoiceId }) => {
      qc.invalidateQueries({ queryKey: ['accounting-invoice', invoiceId] });
      qc.invalidateQueries({ queryKey: ['accounting-invoice-payments', invoiceId] });
      qc.invalidateQueries({ queryKey: ['accounting-invoices'] });
    },
  });
};

// ============================================================
// Generate Public Token
// ============================================================

export const useGeneratePublicToken = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
      const { error } = await supabase
        .from('accounting_invoices')
        .update({ public_token: token })
        .eq('id', invoiceId);
      if (error) throw error;
      return token;
    },
    onSuccess: (_, invoiceId) => {
      qc.invalidateQueries({ queryKey: ['accounting-invoice', invoiceId] });
    },
  });
};

// ============================================================
// Public Invoice (by token, no auth needed)
// ============================================================

export const usePublicInvoice = (token: string | undefined) => {
  return useQuery({
    queryKey: ['public-invoice', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoices')
        .select('*, accounting_contacts(name, email), crm_contacts(id, first_name, last_name, email), crm_partners(id, name, email)')
        .eq('public_token', token!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
};

export const usePublicInvoiceServices = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['public-invoice-services', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_services')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('sort_order');
      if (error) throw error;
      return data as AccountingInvoiceService[];
    },
    enabled: !!invoiceId,
  });
};

export const usePublicInvoiceLines = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['public-invoice-lines', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_lines')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
};

export const usePublicInvoicePayments = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['public-invoice-payments', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('date');
      if (error) throw error;
      return data;
    },
    enabled: !!invoiceId,
  });
};

export const usePublicInvoiceComments = (invoiceId: string | undefined) => {
  return useQuery({
    queryKey: ['public-invoice-comments', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_invoice_comments')
        .select('*')
        .eq('invoice_id', invoiceId!)
        .order('created_at');
      if (error) throw error;
      return data as AccountingInvoiceComment[];
    },
    enabled: !!invoiceId,
  });
};
