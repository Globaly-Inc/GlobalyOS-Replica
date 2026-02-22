-- Add FK from accounting_invoice_schedules.deal_fee_id to crm_deal_fees
ALTER TABLE public.accounting_invoice_schedules
  ADD CONSTRAINT accounting_invoice_schedules_deal_fee_id_fkey
    FOREIGN KEY (deal_fee_id) REFERENCES public.crm_deal_fees(id);