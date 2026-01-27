
# Implementation Plan: Stripe Webhook Secret, Webhook URL, PlanSelector Integration, and Invoice PDF Generation

## Overview

This plan covers four key deliverables to complete the Stripe billing integration:
1. Add `STRIPE_WEBHOOK_SECRET` as a project secret
2. Provide Stripe Dashboard webhook configuration instructions
3. Integrate the `PlanSelector` component into `BillingSettings.tsx`
4. Create an edge function for invoice PDF generation

---

## Current State Analysis

| Component | Status |
|-----------|--------|
| `stripe-webhook` edge function | Complete - already checks for `STRIPE_WEBHOOK_SECRET` |
| `create-checkout-session` edge function | Complete |
| `create-portal-session` edge function | Complete |
| `PlanSelector` component | Complete - not yet integrated |
| `BillingSettings.tsx` | Shows plan info, usage, invoices - missing plan selection |
| Invoice PDF generation | Missing |
| `STRIPE_SECRET_KEY` secret | Configured |
| `STRIPE_WEBHOOK_SECRET` secret | Missing |

---

## Implementation Details

### 1. Add STRIPE_WEBHOOK_SECRET Secret

Use the `add_secret` tool to prompt you to enter the webhook signing secret from Stripe Dashboard.

**Secret name:** `STRIPE_WEBHOOK_SECRET`

**Where to find it:**
1. Go to Stripe Dashboard > Developers > Webhooks
2. Click on your endpoint (or create one)
3. Click "Reveal" under Signing secret
4. Copy the value starting with `whsec_`

---

### 2. Stripe Dashboard Webhook Configuration

**Webhook Endpoint URL:**
```text
https://rygowmzkvxgnxagqlyxf.supabase.co/functions/v1/stripe-webhook
```

**Events to subscribe:**
- `checkout.session.completed`
- `customer.created`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `payment_intent.succeeded`
- `payment_method.attached`

**Setup Steps:**
1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter the URL above
4. Select the events listed
5. Click "Add endpoint"
6. Copy the signing secret and add it as the `STRIPE_WEBHOOK_SECRET`

---

### 3. Integrate PlanSelector into BillingSettings

**File to modify:** `src/components/BillingSettings.tsx`

**Changes:**
1. Import the `PlanSelector` component
2. Add a "Change Plan" dialog/section
3. Add "Manage Billing" button to open Stripe Customer Portal
4. Display saved payment methods from `organization_payment_methods` table

**UI Flow:**
```text
Current Plan Card
├── Plan name + status badge
├── Price display
├── [Change Plan] button → Opens PlanSelector in dialog
├── [Manage Billing] button → Opens Stripe Customer Portal
└── Current period info

Payment Method Card (updated)
├── Display saved card (brand, last 4, expiry)
├── [Update] button → Opens Stripe Portal
└── "No payment method" state with Add button
```

**New imports:**
```typescript
import { PlanSelector } from "@/components/subscription/PlanSelector";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
```

**Key additions:**
- `useState` for dialog open state
- Query for payment methods from `organization_payment_methods`
- Handler for Stripe Portal redirect
- Handler for plan selection callback

---

### 4. Invoice PDF Generation Edge Function

**New file:** `supabase/functions/generate-invoice-pdf/index.ts`

**Functionality:**
1. Fetch invoice data with organization branding
2. Generate PDF using a Deno-compatible PDF library
3. Store PDF in Supabase Storage bucket
4. Return download URL

**PDF Content:**
```text
┌─────────────────────────────────────────────┐
│ [Organization Logo]     INVOICE             │
│ GlobalyOS                                   │
│                                             │
│ Invoice #: INV-2024-001                     │
│ Date: January 27, 2024                      │
│ Due Date: February 10, 2024                 │
│                                             │
│ Bill To:                                    │
│ [Organization Name]                         │
│ [Billing Contact Email]                     │
│                                             │
│ ─────────────────────────────────────────── │
│ Description              Qty    Amount      │
│ ─────────────────────────────────────────── │
│ Growth Plan (Annual)      1     $2,870.00   │
│                                             │
│ ─────────────────────────────────────────── │
│ Subtotal:                       $2,870.00   │
│ Tax (0%):                       $0.00       │
│ Total:                          $2,870.00   │
│ ─────────────────────────────────────────── │
│                                             │
│ Status: PAID (January 27, 2024)             │
│                                             │
│ Thank you for your business!                │
│ support@globalyos.com                     │
└─────────────────────────────────────────────┘
```

**PDF Library Options:**
- Use `jspdf` via npm specifier in Deno
- Or use `pdfkit` via esm.sh

**Storage:**
- Create `invoices` bucket in Supabase Storage
- Store PDFs with path: `{organization_id}/{invoice_number}.pdf`
- Return signed URL for download

**Database updates:**
- Add `pdf_url` column to `invoices` table to cache the generated PDF path

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/generate-invoice-pdf/index.ts` | Create | PDF generation edge function |
| `supabase/config.toml` | Modify | Add function config |
| `src/components/BillingSettings.tsx` | Modify | Integrate PlanSelector, portal, payment methods |
| Database migration | Create | Add `pdf_url` to invoices, create storage bucket |

---

## Database Migration

```sql
-- Add pdf_url column to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Create invoices storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for invoice PDFs - org members can read their own invoices
CREATE POLICY "Organization members can read invoice PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' AND
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.organization_id::text = (storage.foldername(name))[1]
  )
);

-- Only system can upload (via service role)
CREATE POLICY "Service role can upload invoice PDFs"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'invoices');
```

---

## Technical Considerations

### PDF Generation in Deno
Since Deno edge functions run in a constrained environment, we'll use a lightweight approach:
- Generate HTML invoice template
- Use a headless browser service (optional) or
- Use pure JavaScript PDF library like `jspdf`

### Caching Strategy
- Generate PDF on first download request
- Store in Supabase Storage
- Return cached URL on subsequent requests
- Invalidate if invoice is updated

### Security
- Verify user belongs to organization before generating/downloading
- Use signed URLs with expiration for downloads
- Service role for storage operations

---

## Implementation Order

1. **Add STRIPE_WEBHOOK_SECRET secret** (requires user action)
2. **Update BillingSettings.tsx** with PlanSelector integration
3. **Create generate-invoice-pdf edge function**
4. **Run database migration** for pdf_url column and storage bucket
5. **Connect download button** to PDF generation endpoint

---

## User Actions Required

1. **Add Webhook Secret**: You'll be prompted to enter the `STRIPE_WEBHOOK_SECRET` value
2. **Configure Stripe Webhook**: Follow the Stripe Dashboard setup steps above
3. **Optional**: Configure Stripe Customer Portal settings at stripe.com/dashboard/settings/billing/portal

