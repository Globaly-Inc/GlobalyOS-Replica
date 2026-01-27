
# Subscription Management System Analysis and Recommendations

## Executive Summary

GlobalyOS has a well-structured foundation for subscription management with essential database tables, Super Admin tooling, and basic billing workflows already in place. However, to implement a complete subscription system with Stripe integration, feature-based limitations, and self-service billing, several critical components are missing.

---

## Current Implementation Status

### What's Already Built

| Component | Status | Details |
|-----------|--------|---------|
| Database Schema | Complete | `subscriptions`, `subscription_plans`, `plan_limits`, `invoices`, `payments`, `usage_records`, `coupons`, `dunning_logs` tables |
| Plan Management (Super Admin) | Complete | CRUD for plans via `PlanManagement.tsx`, feature limits via `FeatureLimitsEditor.tsx` |
| Coupon Management | Complete | `CouponManagement.tsx` with applicable plans, discounts, usage tracking |
| Trial Management | Complete | Trial tracking, extension UI (`EditTrialDialog`), expiration processing |
| Dunning Process | Complete | 7-day dunning flow with `process-dunning` and `process-trial-expirations` edge functions |
| Manual Invoicing | Complete | `OrgBillingTab.tsx`, `CreateInvoiceDialog.tsx` for Super Admin manual billing |
| Manual Payments | Complete | Record bank transfers, cheques, cash; link to invoices |
| User Billing Settings | Partial | `BillingSettings.tsx` shows plan info, usage metrics, invoice history |
| Feature Flags | Complete | `organization_features` table with `useFeatureFlags` hook for gating features |

### Database Schema Summary

```text
subscription_plans
├── id, name, slug, description, tagline
├── monthly_price, annual_price, currency
├── trial_days, is_active, is_public, is_popular
├── feature_highlights (JSON array)
└── stripe_monthly_price_id, stripe_annual_price_id (placeholders)

subscriptions
├── id, organization_id, plan, status, billing_cycle
├── trial_starts_at, trial_ends_at, current_period_start/end
├── cancel_at_period_end, canceled_at
├── stripe_subscription_id, stripe_customer_id (placeholders)
├── payment_method_type
└── dunning_started_at, dunning_ends_at, dunning_attempts

invoices
├── id, organization_id, subscription_id, invoice_number
├── status, amount, currency, due_date, paid_at
├── billing_period_start/end, line_items (JSON)
└── stripe_invoice_id (placeholder)

payments
├── id, organization_id, invoice_id, amount, currency
├── payment_method, status, reference_number, notes
├── stripe_payment_id (placeholder)
└── processed_by, processed_at

plan_limits
├── id, plan (slug), feature, feature_name
├── monthly_limit, overage_rate, unit
└── is_active, sort_order
```

---

## Missing Components for Full Implementation

### Phase 1: Stripe Integration (Critical)

#### 1.1 Stripe Webhook Handler
**Missing**: Edge function to handle Stripe events

**Required Events**:
- `customer.subscription.created/updated/deleted`
- `invoice.payment_succeeded/failed`
- `payment_intent.succeeded/failed`
- `customer.created`
- `checkout.session.completed`

```text
supabase/functions/stripe-webhook/index.ts
├── Verify webhook signature
├── Handle subscription lifecycle events
├── Sync payment status to `payments` table
├── Update invoice status on payment
└── Trigger dunning on payment failure
```

#### 1.2 Stripe Checkout Session Creator
**Missing**: Edge function to create Stripe Checkout sessions

```text
supabase/functions/create-checkout-session/index.ts
├── Create Stripe customer (if not exists)
├── Create checkout session with price ID
├── Apply coupon if provided
├── Return checkout URL
└── Support both monthly and annual billing
```

#### 1.3 Customer Portal Session Creator
**Missing**: Edge function for Stripe Customer Portal

```text
supabase/functions/create-portal-session/index.ts
├── Retrieve or create Stripe customer
├── Create portal session
├── Return portal URL for self-service management
```

#### 1.4 Payment Method Charging
**Missing**: `charge-payment-method` edge function (referenced in DunningSection but doesn't exist)

```text
supabase/functions/charge-payment-method/index.ts
├── Retrieve stored payment method from Stripe
├── Create PaymentIntent
├── Confirm payment
├── Update invoice and subscription status
└── Record payment in `payments` table
```

---

### Phase 2: User-Facing Subscription Flows

#### 2.1 Plan Selection & Upgrade Flow
**Missing**: Self-service plan upgrade/downgrade UI for organization owners

```text
src/components/subscription/
├── PlanSelector.tsx           # Visual plan comparison with pricing
├── UpgradeDialog.tsx          # Confirm upgrade, redirect to Stripe Checkout
├── DowngradeDialog.tsx        # Warning about feature loss, schedule downgrade
├── BillingCycleToggle.tsx     # Monthly/Annual switch with savings display
└── PlanComparisonTable.tsx    # Feature-by-feature comparison
```

**User Flow**:
1. Owner clicks "Change Plan" in Settings → Billing
2. Sees current plan highlighted with available plans
3. Selects new plan and billing cycle
4. For upgrades: Redirect to Stripe Checkout
5. For downgrades: Show warning, schedule for period end

#### 2.2 Payment Method Management
**Missing**: UI for adding/updating payment methods

```text
src/components/subscription/
├── PaymentMethodForm.tsx      # Add new card via Stripe Elements
├── PaymentMethodList.tsx      # Show saved payment methods
└── SetDefaultPaymentMethod.tsx # Change default payment method
```

#### 2.3 Invoice Download & PDF Generation
**Missing**: PDF invoice generation

```text
supabase/functions/generate-invoice-pdf/index.ts
├── Fetch invoice data with line items
├── Generate PDF with company branding
├── Store in Supabase Storage
└── Return download URL
```

---

### Phase 3: Feature Limitation Enforcement

#### 3.1 Usage Tracking Hook
**Missing**: Real-time usage checking hook

```typescript
// src/hooks/useUsageLimits.ts
export function useUsageLimits() {
  // Returns current usage vs limits
  // Provides `canUse(feature)` function
  // Emits warnings at 80%, 90%, 100% thresholds
}
```

#### 3.2 Feature Gate Components
**Missing**: UI components to block actions when limits exceeded

```text
src/components/subscription/
├── UsageLimitWarning.tsx      # "You've used 80% of AI queries"
├── UpgradePrompt.tsx          # "Upgrade to Growth for more features"
├── FeatureGate.tsx            # Wrapper that blocks action + shows upgrade CTA
└── LimitReachedDialog.tsx     # Modal when user hits limit
```

#### 3.3 Server-Side Limit Enforcement
**Missing**: Edge function middleware for limit checking

```text
// In relevant edge functions (e.g., global-ask-ai):
- Check current usage against plan_limits
- Return 402 Payment Required if exceeded
- Suggest upgrade in error response
```

---

### Phase 4: Billing Automation

#### 4.1 Subscription Renewal Processing
**Missing**: Edge function for renewal invoicing

```text
supabase/functions/process-subscription-renewals/index.ts
├── Find subscriptions with current_period_end approaching
├── Generate renewal invoice
├── Attempt charge via Stripe
├── Handle success: Update period, send receipt
└── Handle failure: Enter dunning
```

#### 4.2 Proration Calculation
**Missing**: Logic for mid-cycle plan changes

```text
supabase/functions/calculate-proration/index.ts
├── Calculate remaining days in current period
├── Calculate credit for unused time
├── Calculate prorated charge for new plan
└── Generate adjustment invoice or credit
```

#### 4.3 Billing Email Notifications
**Missing**: Automated billing emails

| Email Type | Trigger |
|------------|---------|
| Payment Receipt | Invoice paid |
| Payment Failed | Invoice payment failure |
| Trial Ending Soon | 3 days before trial ends |
| Trial Ended | Trial expiration |
| Subscription Canceled | Plan cancellation |
| Renewal Reminder | 7 days before renewal |
| Usage Warning | At 80%, 90% of limits |

---

### Phase 5: Super Admin Enhancements

#### 5.1 Revenue Analytics Dashboard
**Missing**: Financial reporting

```text
src/pages/super-admin/SuperAdminRevenue.tsx
├── MRR (Monthly Recurring Revenue)
├── ARR (Annual Recurring Revenue)
├── Churn rate and cohort analysis
├── Revenue by plan breakdown
├── Payment success/failure rates
└── Outstanding invoice totals
```

#### 5.2 Subscription Lifecycle Timeline
**Partial**: `subscription_timeline` table exists, needs UI

```text
src/components/super-admin/SubscriptionTimeline.tsx
├── Visual timeline of subscription events
├── Trial → Active → Dunning → Canceled flow
├── Payment attempts and outcomes
└── Admin actions (extend trial, change plan)
```

---

## Database Schema Additions Required

### New Tables Needed

```sql
-- Organization payment methods (Stripe references)
CREATE TABLE organization_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  stripe_payment_method_id TEXT NOT NULL,
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Billing contacts
CREATE TABLE billing_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit notes for refunds/adjustments
CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  reason TEXT,
  status TEXT DEFAULT 'issued',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Implementation Roadmap

### Immediate Priority (Stripe-Ready)
1. Create `stripe-webhook` edge function
2. Create `create-checkout-session` edge function
3. Create `create-portal-session` edge function
4. Add `organization_payment_methods` table
5. Enable Stripe integration via Lovable

### Short-Term (Self-Service Billing)
1. Build plan selection UI for organization owners
2. Implement payment method management
3. Add invoice PDF generation
4. Create billing email templates

### Medium-Term (Limit Enforcement)
1. Build `useUsageLimits` hook
2. Add feature gate components
3. Update edge functions with limit checking
4. Add usage warning notifications

### Long-Term (Analytics & Automation)
1. Build revenue analytics dashboard
2. Implement proration calculations
3. Add subscription renewal automation
4. Create cohort analysis tools

---

## Technical Considerations

### Stripe Integration Notes
- Use Stripe Billing for subscription management
- Store Stripe IDs in existing columns (`stripe_subscription_id`, `stripe_customer_id`, etc.)
- Use webhooks as source of truth for subscription status
- Enable Customer Portal for self-service card updates

### Security Requirements
- Verify Stripe webhook signatures
- RLS policies on billing tables (owner/admin only)
- Audit logging for all billing operations
- PCI compliance via Stripe Elements (no raw card data)

### Multi-Tenant Isolation
- All billing queries scoped by `organization_id`
- Payment methods belong to organizations, not users
- Invoices and payments isolated per tenant
