import type {
  SubscriptionPlan, OrgSubscription, SubscriptionInvoice, DunningCampaign, DunningRun,
  Coupon, MRRMovement, ChurnPrediction, UpsellSignal, AnomalyEvent, CohortData,
  RevenueForecast, CampaignGroup, WinBackCampaign, SubscriptionAlert,
  PaymentHealthDay, SubscriberWaterfallMonth, ChurnEvent,
} from '@/types/subscriptions';

// ─── Plans ───────────────────────────────────────────────────
export const mockPlans: SubscriptionPlan[] = [
  {
    id: 'plan_starter', name: 'Starter', code: 'starter', description: 'For small teams getting started',
    pricing_model: 'flat_fee', base_price: 49, annual_price: 470, billing_frequencies: ['monthly', 'annual'],
    trial_days: 14, status: 'active', subscriber_count: 423, mrr: 20727,
    features: [
      { name: 'Max Employees', limit_type: 'number', value: 25, max: 25 },
      { name: 'Storage (GB)', limit_type: 'number', value: 10, max: 10 },
      { name: 'AI Tokens/mo', limit_type: 'number', value: 5000, max: 5000 },
      { name: 'Active Modules', limit_type: 'multi_select', value: ['HR', 'Leave', 'Attendance'] },
    ],
    created_at: '2024-01-15',
  },
  {
    id: 'plan_professional', name: 'Professional', code: 'professional', description: 'For growing companies',
    pricing_model: 'per_seat', base_price: 12, annual_price: 115, per_seat_price: 12, annual_per_seat_price: 115,
    billing_frequencies: ['monthly', 'annual'], trial_days: 14, status: 'active', subscriber_count: 891, mrr: 116688,
    features: [
      { name: 'Max Employees', limit_type: 'number', value: 100, max: 100 },
      { name: 'Storage (GB)', limit_type: 'number', value: 50, max: 50 },
      { name: 'AI Tokens/mo', limit_type: 'number', value: 50000, max: 50000 },
      { name: 'Active Modules', limit_type: 'multi_select', value: ['HR', 'Leave', 'Attendance', 'Wiki', 'Chat', 'Tasks'] },
    ],
    created_at: '2024-01-15',
  },
  {
    id: 'plan_business', name: 'Business', code: 'business', description: 'For established organizations',
    pricing_model: 'hybrid', base_price: 99, annual_price: 950, per_seat_price: 8, annual_per_seat_price: 77,
    billing_frequencies: ['monthly', 'annual'], trial_days: 30, status: 'active', subscriber_count: 387, mrr: 79716,
    features: [
      { name: 'Max Employees', limit_type: 'number', value: 500, max: 500 },
      { name: 'Storage (GB)', limit_type: 'number', value: 200, max: 200 },
      { name: 'AI Tokens/mo', limit_type: 'number', value: 200000, max: 200000 },
      { name: 'Active Modules', limit_type: 'multi_select', value: ['HR', 'Leave', 'Attendance', 'Wiki', 'Chat', 'Tasks', 'CRM', 'Payroll'] },
    ],
    created_at: '2024-02-01',
  },
  {
    id: 'plan_enterprise', name: 'Enterprise', code: 'enterprise', description: 'Custom solutions for large organizations',
    pricing_model: 'hybrid', base_price: 499, billing_frequencies: ['monthly', 'annual', 'custom'],
    trial_days: 30, status: 'active', subscriber_count: 96, mrr: 67589,
    features: [
      { name: 'Max Employees', limit_type: 'number', value: 9999, max: 9999 },
      { name: 'Storage (GB)', limit_type: 'number', value: 1000, max: 1000 },
      { name: 'AI Tokens/mo', limit_type: 'number', value: 1000000, max: 1000000 },
      { name: 'Active Modules', limit_type: 'multi_select', value: ['All'] },
    ],
    created_at: '2024-03-01',
  },
  {
    id: 'plan_legacy', name: 'Legacy Basic', code: 'legacy-basic', description: 'Grandfathered plan — no longer available',
    pricing_model: 'flat_fee', base_price: 29, annual_price: 278, billing_frequencies: ['monthly', 'annual'],
    trial_days: 0, status: 'grandfathered', subscriber_count: 50, mrr: 1450,
    features: [
      { name: 'Max Employees', limit_type: 'number', value: 10, max: 10 },
      { name: 'Storage (GB)', limit_type: 'number', value: 5, max: 5 },
      { name: 'AI Tokens/mo', limit_type: 'number', value: 1000, max: 1000 },
      { name: 'Active Modules', limit_type: 'multi_select', value: ['HR', 'Leave'] },
    ],
    created_at: '2023-06-01',
  },
];

// ─── Org Subscriptions ──────────────────────────────────────
export const mockSubscriptions: OrgSubscription[] = [
  {
    id: 'sub_1', org_id: 'org_1', org_name: 'TechCorp Solutions', plan_id: 'plan_professional', plan_name: 'Professional',
    status: 'active', mrr: 348, billing_frequency: 'annual', next_renewal: '2026-08-15', member_count: 29, health_score: 92, churn_risk_score: 8,
    payment_method: { type: 'visa', last4: '4242', expiry: '12/27', is_primary: true },
    started_at: '2024-08-15',
    usage: [{ feature: 'Employees', used: 29, limit: 100, unit: 'seats' }, { feature: 'Storage', used: 12.4, limit: 50, unit: 'GB' }, { feature: 'AI Tokens', used: 38200, limit: 50000, unit: 'tokens' }],
    timeline: [
      { id: 'e1', date: '2024-08-15', type: 'created', description: 'Subscription created on Professional plan' },
      { id: 'e2', date: '2025-01-10', type: 'upgraded', description: 'Upgraded from Starter to Professional', actor: 'Admin User' },
    ],
  },
  {
    id: 'sub_2', org_id: 'org_2', org_name: 'BuildRight Constructions', plan_id: 'plan_starter', plan_name: 'Starter',
    status: 'past_due', mrr: 49, billing_frequency: 'monthly', next_renewal: '2026-03-01', member_count: 8, health_score: 31, churn_risk_score: 87,
    payment_method: { type: 'visa', last4: '1234', expiry: '03/25', is_primary: true },
    started_at: '2025-06-01',
    usage: [{ feature: 'Employees', used: 8, limit: 25, unit: 'seats' }, { feature: 'Storage', used: 2.1, limit: 10, unit: 'GB' }, { feature: 'AI Tokens', used: 800, limit: 5000, unit: 'tokens' }],
    timeline: [
      { id: 'e3', date: '2025-06-01', type: 'created', description: 'Subscription created' },
      { id: 'e4', date: '2026-02-15', type: 'payment_failed', description: 'Payment failed — card expired' },
      { id: 'e5', date: '2026-02-16', type: 'dunning_sent', description: 'Dunning email sent (Stage 1)' },
    ],
  },
  {
    id: 'sub_3', org_id: 'org_3', org_name: 'GlobalTrade Inc', plan_id: 'plan_business', plan_name: 'Business',
    status: 'active', mrr: 1260, billing_frequency: 'annual', next_renewal: '2026-11-20', member_count: 142, health_score: 78, churn_risk_score: 22,
    payment_method: { type: 'mastercard', last4: '5678', expiry: '09/28', is_primary: true },
    started_at: '2024-11-20',
    usage: [{ feature: 'Employees', used: 142, limit: 500, unit: 'seats' }, { feature: 'Storage', used: 89.3, limit: 200, unit: 'GB' }, { feature: 'AI Tokens', used: 156000, limit: 200000, unit: 'tokens' }],
    timeline: [{ id: 'e6', date: '2024-11-20', type: 'created', description: 'Subscription created on Business plan' }],
  },
  {
    id: 'sub_4', org_id: 'org_4', org_name: 'QuickLearn Academy', plan_id: 'plan_professional', plan_name: 'Professional',
    status: 'trialing', mrr: 0, billing_frequency: 'monthly', next_renewal: '2026-02-25', member_count: 5, health_score: 55, churn_risk_score: 74,
    payment_method: { type: 'visa', last4: '9999', expiry: '06/28', is_primary: true },
    started_at: '2026-02-11', trial_ends_at: '2026-02-25',
    usage: [{ feature: 'Employees', used: 5, limit: 100, unit: 'seats' }, { feature: 'Storage', used: 0.3, limit: 50, unit: 'GB' }, { feature: 'AI Tokens', used: 1200, limit: 50000, unit: 'tokens' }],
    timeline: [{ id: 'e7', date: '2026-02-11', type: 'trial_started', description: 'Free trial started' }],
  },
  {
    id: 'sub_5', org_id: 'org_5', org_name: 'RetailPro Group', plan_id: 'plan_business', plan_name: 'Business',
    status: 'paused', mrr: 0, billing_frequency: 'annual', next_renewal: '2026-07-01', member_count: 67, health_score: 62, churn_risk_score: 45,
    payment_method: { type: 'amex', last4: '3456', expiry: '11/27', is_primary: true },
    started_at: '2024-07-01', paused_until: '2026-04-01',
    usage: [{ feature: 'Employees', used: 67, limit: 500, unit: 'seats' }, { feature: 'Storage', used: 34.5, limit: 200, unit: 'GB' }, { feature: 'AI Tokens', used: 0, limit: 200000, unit: 'tokens' }],
    timeline: [
      { id: 'e8', date: '2024-07-01', type: 'created', description: 'Subscription created' },
      { id: 'e9', date: '2026-01-15', type: 'paused', description: 'Subscription paused until April 2026', actor: 'CEO User' },
    ],
  },
  {
    id: 'sub_6', org_id: 'org_6', org_name: 'DataFlow Systems', plan_id: 'plan_business', plan_name: 'Business',
    status: 'active', mrr: 891, billing_frequency: 'monthly', next_renewal: '2026-03-15', member_count: 99, health_score: 85, churn_risk_score: 12,
    payment_method: { type: 'visa', last4: '7890', expiry: '04/29', is_primary: true }, started_at: '2025-03-15',
    usage: [{ feature: 'Employees', used: 99, limit: 500, unit: 'seats' }, { feature: 'Storage', used: 120.8, limit: 200, unit: 'GB' }, { feature: 'AI Tokens', used: 192000, limit: 200000, unit: 'tokens' }],
    timeline: [{ id: 'e10', date: '2025-03-15', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_7', org_id: 'org_7', org_name: 'GreenBuild Co', plan_id: 'plan_starter', plan_name: 'Starter',
    status: 'active', mrr: 49, billing_frequency: 'monthly', next_renewal: '2026-03-10', member_count: 12, health_score: 68, churn_risk_score: 35,
    payment_method: { type: 'mastercard', last4: '2345', expiry: '08/27', is_primary: true }, started_at: '2025-09-10',
    usage: [{ feature: 'Employees', used: 12, limit: 25, unit: 'seats' }, { feature: 'Storage', used: 4.2, limit: 10, unit: 'GB' }, { feature: 'AI Tokens', used: 3800, limit: 5000, unit: 'tokens' }],
    timeline: [{ id: 'e11', date: '2025-09-10', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_8', org_id: 'org_8', org_name: 'MediaStream Co', plan_id: 'plan_business', plan_name: 'Business',
    status: 'active', mrr: 540, billing_frequency: 'annual', next_renewal: '2026-09-01', member_count: 55, health_score: 52, churn_risk_score: 71,
    payment_method: { type: 'visa', last4: '6543', expiry: '12/26', is_primary: true }, started_at: '2024-09-01',
    usage: [{ feature: 'Employees', used: 33, limit: 500, unit: 'seats' }, { feature: 'Storage', used: 45.0, limit: 200, unit: 'GB' }, { feature: 'AI Tokens', used: 45000, limit: 200000, unit: 'tokens' }],
    timeline: [{ id: 'e12', date: '2024-09-01', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_9', org_id: 'org_9', org_name: 'FinanceHub Ltd', plan_id: 'plan_enterprise', plan_name: 'Enterprise',
    status: 'active', mrr: 2400, billing_frequency: 'annual', next_renewal: '2026-12-01', member_count: 312, health_score: 95, churn_risk_score: 5,
    payment_method: { type: 'bank_transfer', last4: '0001', expiry: 'N/A', is_primary: true }, started_at: '2024-12-01',
    usage: [{ feature: 'Employees', used: 312, limit: 9999, unit: 'seats' }, { feature: 'Storage', used: 340.0, limit: 1000, unit: 'GB' }, { feature: 'AI Tokens', used: 680000, limit: 1000000, unit: 'tokens' }],
    timeline: [{ id: 'e13', date: '2024-12-01', type: 'created', description: 'Enterprise subscription created' }],
  },
  {
    id: 'sub_10', org_id: 'org_10', org_name: 'HealthFirst Clinics', plan_id: 'plan_professional', plan_name: 'Professional',
    status: 'active', mrr: 180, billing_frequency: 'monthly', next_renewal: '2026-03-20', member_count: 15, health_score: 88, churn_risk_score: 10,
    payment_method: { type: 'visa', last4: '8765', expiry: '07/28', is_primary: true }, started_at: '2025-07-20',
    usage: [{ feature: 'Employees', used: 15, limit: 100, unit: 'seats' }, { feature: 'Storage', used: 8.9, limit: 50, unit: 'GB' }, { feature: 'AI Tokens', used: 22000, limit: 50000, unit: 'tokens' }],
    timeline: [{ id: 'e14', date: '2025-07-20', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_11', org_id: 'org_11', org_name: 'EduStar Schools', plan_id: 'plan_starter', plan_name: 'Starter',
    status: 'active', mrr: 49, billing_frequency: 'monthly', next_renewal: '2026-03-05', member_count: 18, health_score: 72, churn_risk_score: 28,
    payment_method: { type: 'mastercard', last4: '4321', expiry: '05/27', is_primary: true }, started_at: '2025-11-05',
    usage: [{ feature: 'Employees', used: 18, limit: 25, unit: 'seats' }, { feature: 'Storage', used: 6.1, limit: 10, unit: 'GB' }, { feature: 'AI Tokens', used: 4200, limit: 5000, unit: 'tokens' }],
    timeline: [{ id: 'e15', date: '2025-11-05', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_12', org_id: 'org_12', org_name: 'AgriTech Solutions', plan_id: 'plan_professional', plan_name: 'Professional',
    status: 'cancelled', mrr: 0, billing_frequency: 'monthly', next_renewal: '', member_count: 0, health_score: 0, churn_risk_score: 100,
    payment_method: { type: 'visa', last4: '1111', expiry: '01/26', is_primary: true }, started_at: '2025-04-01',
    usage: [], timeline: [{ id: 'e16', date: '2026-01-15', type: 'cancelled', description: 'Subscription cancelled — too expensive' }],
  },
  {
    id: 'sub_13', org_id: 'org_13', org_name: 'CloudNine Hosting', plan_id: 'plan_enterprise', plan_name: 'Enterprise',
    status: 'active', mrr: 3200, billing_frequency: 'annual', next_renewal: '2027-01-01', member_count: 478, health_score: 91, churn_risk_score: 7,
    payment_method: { type: 'bank_transfer', last4: '0002', expiry: 'N/A', is_primary: true }, started_at: '2025-01-01',
    usage: [{ feature: 'Employees', used: 478, limit: 9999, unit: 'seats' }, { feature: 'Storage', used: 560.0, limit: 1000, unit: 'GB' }, { feature: 'AI Tokens', used: 820000, limit: 1000000, unit: 'tokens' }],
    timeline: [{ id: 'e17', date: '2025-01-01', type: 'created', description: 'Enterprise subscription created' }],
  },
  {
    id: 'sub_14', org_id: 'org_14', org_name: 'LegalEase Partners', plan_id: 'plan_professional', plan_name: 'Professional',
    status: 'active', mrr: 264, billing_frequency: 'annual', next_renewal: '2026-06-15', member_count: 22, health_score: 81, churn_risk_score: 18,
    payment_method: { type: 'amex', last4: '9876', expiry: '10/28', is_primary: true }, started_at: '2024-06-15',
    usage: [{ feature: 'Employees', used: 22, limit: 100, unit: 'seats' }, { feature: 'Storage', used: 15.3, limit: 50, unit: 'GB' }, { feature: 'AI Tokens', used: 31000, limit: 50000, unit: 'tokens' }],
    timeline: [{ id: 'e18', date: '2024-06-15', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_15', org_id: 'org_15', org_name: 'SmartLogistics Ltd', plan_id: 'plan_business', plan_name: 'Business',
    status: 'past_due', mrr: 657, billing_frequency: 'monthly', next_renewal: '2026-02-28', member_count: 71, health_score: 42, churn_risk_score: 65,
    payment_method: { type: 'visa', last4: '5555', expiry: '02/26', is_primary: true }, started_at: '2025-05-28',
    usage: [{ feature: 'Employees', used: 71, limit: 500, unit: 'seats' }, { feature: 'Storage', used: 88.2, limit: 200, unit: 'GB' }, { feature: 'AI Tokens', used: 110000, limit: 200000, unit: 'tokens' }],
    timeline: [{ id: 'e19', date: '2026-02-20', type: 'payment_failed', description: 'Payment failed — insufficient funds' }],
  },
  {
    id: 'sub_16', org_id: 'org_16', org_name: 'CreativeStudio Inc', plan_id: 'plan_starter', plan_name: 'Starter',
    status: 'active', mrr: 49, billing_frequency: 'monthly', next_renewal: '2026-03-12', member_count: 6, health_score: 76, churn_risk_score: 25,
    payment_method: { type: 'paypal', last4: '0000', expiry: 'N/A', is_primary: true }, started_at: '2025-12-12',
    usage: [{ feature: 'Employees', used: 6, limit: 25, unit: 'seats' }, { feature: 'Storage', used: 3.4, limit: 10, unit: 'GB' }, { feature: 'AI Tokens', used: 2100, limit: 5000, unit: 'tokens' }],
    timeline: [{ id: 'e20', date: '2025-12-12', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_17', org_id: 'org_17', org_name: 'NovaPharma Labs', plan_id: 'plan_enterprise', plan_name: 'Enterprise',
    status: 'active', mrr: 4800, billing_frequency: 'annual', next_renewal: '2027-03-01', member_count: 650, health_score: 94, churn_risk_score: 4,
    payment_method: { type: 'bank_transfer', last4: '0003', expiry: 'N/A', is_primary: true }, started_at: '2025-03-01',
    usage: [{ feature: 'Employees', used: 650, limit: 9999, unit: 'seats' }, { feature: 'Storage', used: 780.0, limit: 1000, unit: 'GB' }, { feature: 'AI Tokens', used: 920000, limit: 1000000, unit: 'tokens' }],
    timeline: [{ id: 'e21', date: '2025-03-01', type: 'created', description: 'Enterprise subscription created' }],
  },
  {
    id: 'sub_18', org_id: 'org_18', org_name: 'FoodChain Express', plan_id: 'plan_professional', plan_name: 'Professional',
    status: 'trialing', mrr: 0, billing_frequency: 'monthly', next_renewal: '2026-03-08', member_count: 11, health_score: 60, churn_risk_score: 50,
    payment_method: { type: 'visa', last4: '3333', expiry: '09/28', is_primary: true }, started_at: '2026-02-22', trial_ends_at: '2026-03-08',
    usage: [{ feature: 'Employees', used: 11, limit: 100, unit: 'seats' }, { feature: 'Storage', used: 1.2, limit: 50, unit: 'GB' }, { feature: 'AI Tokens', used: 3400, limit: 50000, unit: 'tokens' }],
    timeline: [{ id: 'e22', date: '2026-02-22', type: 'trial_started', description: 'Free trial started' }],
  },
  {
    id: 'sub_19', org_id: 'org_19', org_name: 'SafeGuard Security', plan_id: 'plan_business', plan_name: 'Business',
    status: 'active', mrr: 435, billing_frequency: 'annual', next_renewal: '2026-10-15', member_count: 42, health_score: 83, churn_risk_score: 15,
    payment_method: { type: 'mastercard', last4: '6789', expiry: '11/28', is_primary: true }, started_at: '2024-10-15',
    usage: [{ feature: 'Employees', used: 42, limit: 500, unit: 'seats' }, { feature: 'Storage', used: 55.0, limit: 200, unit: 'GB' }, { feature: 'AI Tokens', used: 78000, limit: 200000, unit: 'tokens' }],
    timeline: [{ id: 'e23', date: '2024-10-15', type: 'created', description: 'Subscription created' }],
  },
  {
    id: 'sub_20', org_id: 'org_20', org_name: 'UrbanDesign Collective', plan_id: 'plan_legacy', plan_name: 'Legacy Basic',
    status: 'active', mrr: 29, billing_frequency: 'monthly', next_renewal: '2026-03-18', member_count: 4, health_score: 58, churn_risk_score: 40,
    payment_method: { type: 'visa', last4: '7777', expiry: '03/27', is_primary: true }, started_at: '2023-09-18',
    usage: [{ feature: 'Employees', used: 4, limit: 10, unit: 'seats' }, { feature: 'Storage', used: 2.8, limit: 5, unit: 'GB' }, { feature: 'AI Tokens', used: 650, limit: 1000, unit: 'tokens' }],
    timeline: [{ id: 'e24', date: '2023-09-18', type: 'created', description: 'Subscription created on Legacy Basic' }],
  },
];

// ─── Invoices ────────────────────────────────────────────────
const invoiceStatuses: Array<'pending' | 'paid' | 'past_due' | 'voided' | 'partially_paid'> = ['pending', 'paid', 'past_due', 'voided', 'partially_paid'];
export const mockInvoices: SubscriptionInvoice[] = Array.from({ length: 30 }, (_, i) => {
  const sub = mockSubscriptions[i % mockSubscriptions.length];
  const status = i < 18 ? 'paid' : invoiceStatuses[i % invoiceStatuses.length];
  const month = (i % 12) + 1;
  return {
    id: `inv_${i + 1}`,
    invoice_number: `INV-2026-${String(i + 1).padStart(4, '0')}`,
    org_id: sub.org_id,
    org_name: sub.org_name,
    amount: sub.mrr || 49 + i * 10,
    status,
    issue_date: `2026-${String(month).padStart(2, '0')}-01`,
    due_date: `2026-${String(month).padStart(2, '0')}-15`,
    paid_at: status === 'paid' ? `2026-${String(month).padStart(2, '0')}-03` : undefined,
    line_items: [{ description: `${sub.plan_name} Plan — ${sub.billing_frequency}`, quantity: 1, unit_price: sub.mrr || 49, amount: sub.mrr || 49 }],
    credit_applied: 0,
    tax_amount: (sub.mrr || 49) * 0.1,
    discount_amount: 0,
  };
});

// ─── Dunning ─────────────────────────────────────────────────
export const mockDunningCampaigns: DunningCampaign[] = [
  {
    id: 'dc_1', name: 'Standard Recovery', assigned_to: 'All plans', recovery_rate: 64, active_runs: 18, status: 'active',
    stages: [
      { day: 1, retry: true, email_template: 'Payment Failed', escalation: 'none' },
      { day: 3, retry: true, email_template: 'Action Required', escalation: 'none' },
      { day: 7, retry: true, email_template: 'Final Notice', escalation: 'none' },
      { day: 14, retry: true, email_template: 'Service Suspension Warning', escalation: 'backup_payment' },
      { day: 21, retry: false, email_template: 'Account Suspended', escalation: 'suspend_access' },
    ],
  },
  {
    id: 'dc_2', name: 'Enterprise Recovery', assigned_to: 'Enterprise', recovery_rate: 78, active_runs: 4, status: 'active',
    stages: [
      { day: 1, retry: true, email_template: 'Payment Failed', escalation: 'none' },
      { day: 3, retry: true, email_template: 'Action Required', escalation: 'none' },
      { day: 5, retry: true, email_template: 'Urgent Follow-up', escalation: 'none' },
      { day: 7, retry: true, email_template: 'Manager Notification', escalation: 'notify_csm' },
      { day: 10, retry: true, email_template: 'Executive Outreach', escalation: 'none' },
      { day: 14, retry: true, email_template: 'Final Notice', escalation: 'backup_payment' },
      { day: 21, retry: false, email_template: 'Service Review', escalation: 'manual_review' },
    ],
  },
  {
    id: 'dc_3', name: 'Quick Retry', assigned_to: 'Starter', recovery_rate: 51, active_runs: 1, status: 'active',
    stages: [
      { day: 1, retry: true, email_template: 'Payment Failed', escalation: 'none' },
      { day: 3, retry: true, email_template: 'Update Payment', escalation: 'none' },
      { day: 7, retry: false, email_template: 'Account Suspended', escalation: 'suspend_access' },
    ],
  },
];

export const mockDunningRuns: DunningRun[] = [
  { id: 'dr_1', org_id: 'org_2', org_name: 'BuildRight Constructions', campaign_id: 'dc_1', current_stage: 2, total_stages: 5, days_overdue: 5, amount: 49, next_retry: '2026-02-25', last_email_sent: '2026-02-22' },
  { id: 'dr_2', org_id: 'org_15', org_name: 'SmartLogistics Ltd', campaign_id: 'dc_1', current_stage: 1, total_stages: 5, days_overdue: 2, amount: 657, next_retry: '2026-02-24', last_email_sent: '2026-02-22' },
];

// ─── Coupons ─────────────────────────────────────────────────
export const mockCoupons: Coupon[] = [
  { id: 'c_1', code: 'LAUNCH25', type: 'percentage', value: 25, duration: 'repeating', duration_months: 3, redemptions: 147, status: 'active', new_subscribers_only: false, stackable: false, campaign_id: 'cg_1', campaign_name: 'Q1 2026 Growth', created_at: '2025-12-01' },
  { id: 'c_2', code: 'ANNUAL20', type: 'percentage', value: 20, duration: 'once', redemptions: 89, status: 'active', new_subscribers_only: false, stackable: false, plan_restrictions: ['annual'], campaign_id: 'cg_1', campaign_name: 'Q1 2026 Growth', created_at: '2025-12-15' },
  { id: 'c_3', code: 'ENTERPRISE500', type: 'fixed_amount', value: 500, duration: 'once', redemptions: 12, limit: 50, status: 'active', new_subscribers_only: true, stackable: false, campaign_id: 'cg_3', campaign_name: 'Enterprise Pipeline', created_at: '2026-01-01' },
  { id: 'c_4', code: 'COMEBACK30', type: 'percentage', value: 30, duration: 'repeating', duration_months: 2, redemptions: 34, status: 'active', new_subscribers_only: false, stackable: false, campaign_id: 'cg_2', campaign_name: 'Win-Back March', created_at: '2026-02-01' },
  { id: 'c_5', code: 'STARTUP10', type: 'percentage', value: 10, duration: 'forever', redemptions: 56, status: 'active', new_subscribers_only: true, stackable: true, created_at: '2025-10-01' },
  { id: 'c_6', code: 'TRIALPLUS', type: 'trial_extension', value: 14, duration: 'once', redemptions: 22, status: 'active', new_subscribers_only: true, stackable: false, created_at: '2025-11-01' },
  { id: 'c_7', code: 'BF2025', type: 'percentage', value: 40, duration: 'once', redemptions: 312, status: 'expired', new_subscribers_only: false, stackable: false, expiry: '2025-12-01', created_at: '2025-11-20' },
  { id: 'c_8', code: 'REFER50', type: 'fixed_amount', value: 50, duration: 'once', redemptions: 98, status: 'active', new_subscribers_only: true, stackable: true, created_at: '2025-08-01' },
  { id: 'c_9', code: 'PARTNER15', type: 'percentage', value: 15, duration: 'repeating', duration_months: 6, redemptions: 41, status: 'active', new_subscribers_only: false, stackable: false, campaign_id: 'cg_3', campaign_name: 'Enterprise Pipeline', created_at: '2026-01-15' },
  { id: 'c_10', code: 'SUMMER23', type: 'percentage', value: 20, duration: 'repeating', duration_months: 3, redemptions: 180, status: 'expired', new_subscribers_only: false, stackable: false, expiry: '2023-09-30', created_at: '2023-06-01' },
  { id: 'c_11', code: 'NEWYEAR26', type: 'percentage', value: 15, duration: 'once', redemptions: 0, status: 'scheduled', new_subscribers_only: false, stackable: false, created_at: '2026-02-15' },
  { id: 'c_12', code: 'WINBACK20', type: 'percentage', value: 20, duration: 'repeating', duration_months: 3, redemptions: 7, status: 'active', new_subscribers_only: false, stackable: false, campaign_id: 'cg_2', campaign_name: 'Win-Back March', created_at: '2026-02-01' },
  { id: 'c_13', code: 'VIP100', type: 'fixed_amount', value: 100, duration: 'once', redemptions: 5, limit: 10, status: 'active', new_subscribers_only: false, stackable: false, campaign_id: 'cg_3', campaign_name: 'Enterprise Pipeline', created_at: '2026-01-20' },
  { id: 'c_14', code: 'EARLYBIRD', type: 'percentage', value: 35, duration: 'repeating', duration_months: 6, redemptions: 234, status: 'expired', new_subscribers_only: true, stackable: false, expiry: '2025-06-30', created_at: '2025-01-01' },
  { id: 'c_15', code: 'FREEMONTH', type: 'percentage', value: 100, duration: 'once', redemptions: 15, limit: 20, status: 'active', new_subscribers_only: false, stackable: false, created_at: '2026-02-10' },
];

export const mockCampaignGroups: CampaignGroup[] = [
  { id: 'cg_1', name: 'Q1 2026 Growth Campaign', coupon_count: 5, total_redemptions: 234, revenue_impact: 18400 },
  { id: 'cg_2', name: 'Win-Back March', coupon_count: 2, total_redemptions: 41, revenue_impact: 12200, reactivations: 38 },
  { id: 'cg_3', name: 'Enterprise Pipeline', coupon_count: 3, total_redemptions: 18, revenue_impact: 28500 },
];

// ─── MRR Movement ────────────────────────────────────────────
export const mockMRRMovement: MRRMovement[] = [
  { month: 'Mar 2025', new_mrr: 12400, expansion_mrr: 4200, reactivation_mrr: 1800, contraction_mrr: 2100, churn_mrr: 3400, net_mrr: 12900 },
  { month: 'Apr 2025', new_mrr: 14200, expansion_mrr: 5100, reactivation_mrr: 2200, contraction_mrr: 1800, churn_mrr: 3100, net_mrr: 16600 },
  { month: 'May 2025', new_mrr: 11800, expansion_mrr: 4800, reactivation_mrr: 1500, contraction_mrr: 2400, churn_mrr: 4200, net_mrr: 11500 },
  { month: 'Jun 2025', new_mrr: 15600, expansion_mrr: 6200, reactivation_mrr: 2800, contraction_mrr: 1600, churn_mrr: 3800, net_mrr: 19200 },
  { month: 'Jul 2025', new_mrr: 13900, expansion_mrr: 5500, reactivation_mrr: 2100, contraction_mrr: 2200, churn_mrr: 3600, net_mrr: 15700 },
  { month: 'Aug 2025', new_mrr: 16200, expansion_mrr: 7100, reactivation_mrr: 3200, contraction_mrr: 1900, churn_mrr: 4100, net_mrr: 20500 },
  { month: 'Sep 2025', new_mrr: 14800, expansion_mrr: 6400, reactivation_mrr: 2600, contraction_mrr: 2300, churn_mrr: 3900, net_mrr: 17600 },
  { month: 'Oct 2025', new_mrr: 17100, expansion_mrr: 7800, reactivation_mrr: 3100, contraction_mrr: 2000, churn_mrr: 4500, net_mrr: 21500 },
  { month: 'Nov 2025', new_mrr: 15400, expansion_mrr: 6900, reactivation_mrr: 2400, contraction_mrr: 2600, churn_mrr: 4800, net_mrr: 17300 },
  { month: 'Dec 2025', new_mrr: 18200, expansion_mrr: 8200, reactivation_mrr: 3800, contraction_mrr: 1700, churn_mrr: 3200, net_mrr: 25300 },
  { month: 'Jan 2026', new_mrr: 16800, expansion_mrr: 7400, reactivation_mrr: 2900, contraction_mrr: 2100, churn_mrr: 4200, net_mrr: 20800 },
  { month: 'Feb 2026', new_mrr: 19100, expansion_mrr: 8800, reactivation_mrr: 3400, contraction_mrr: 1800, churn_mrr: 3600, net_mrr: 25900 },
];

// ─── Churn ───────────────────────────────────────────────────
export const mockChurnPredictions: ChurnPrediction[] = [
  { org_id: 'org_2', org_name: 'BuildRight Constructions', plan: 'Starter', risk_score: 87, risk_level: 'critical', signals: ['Payment failed', 'Login frequency dropped 3x→1x/week', '2 support tickets'], recommended_action: 'Assign Win-Back', potential_mrr_at_risk: 49, days_since_login: 12, feature_adoption_score: 22, mrr: 49 },
  { org_id: 'org_4', org_name: 'QuickLearn Academy', plan: 'Professional', risk_score: 74, risk_level: 'high', signals: ['Trial ending', 'No payment method', 'Low feature adoption'], recommended_action: 'Send Offer', potential_mrr_at_risk: 60, days_since_login: 3, feature_adoption_score: 35, mrr: 0 },
  { org_id: 'org_8', org_name: 'MediaStream Co', plan: 'Business', risk_score: 71, risk_level: 'high', signals: ['Seat utilization dropped 40%', 'Manager resigned', 'Support escalation'], recommended_action: 'Schedule Call', potential_mrr_at_risk: 540, days_since_login: 5, feature_adoption_score: 41, mrr: 540 },
  { org_id: 'org_15', org_name: 'SmartLogistics Ltd', plan: 'Business', risk_score: 65, risk_level: 'high', signals: ['Payment past due', 'Feature usage declining'], recommended_action: 'Dunning + Outreach', potential_mrr_at_risk: 657, days_since_login: 8, feature_adoption_score: 48, mrr: 657 },
  { org_id: 'org_20', org_name: 'UrbanDesign Collective', plan: 'Legacy Basic', risk_score: 58, risk_level: 'medium', signals: ['Low engagement', 'Legacy plan user'], recommended_action: 'Upgrade Offer', potential_mrr_at_risk: 29, days_since_login: 15, feature_adoption_score: 30, mrr: 29 },
  { org_id: 'org_5', org_name: 'RetailPro Group', plan: 'Business', risk_score: 45, risk_level: 'medium', signals: ['Subscription paused', 'Usage at zero'], recommended_action: 'Resume Incentive', potential_mrr_at_risk: 435, days_since_login: 30, feature_adoption_score: 55, mrr: 0 },
  { org_id: 'org_7', org_name: 'GreenBuild Co', plan: 'Starter', risk_score: 35, risk_level: 'medium', signals: ['Near seat limit', '3 non-activated modules'], recommended_action: 'Upgrade Nudge', potential_mrr_at_risk: 49, days_since_login: 2, feature_adoption_score: 62, mrr: 49 },
  { org_id: 'org_18', org_name: 'FoodChain Express', plan: 'Professional', risk_score: 50, risk_level: 'medium', signals: ['Trial user', 'Low adoption'], recommended_action: 'Onboarding Call', potential_mrr_at_risk: 132, days_since_login: 1, feature_adoption_score: 38, mrr: 0 },
  { org_id: 'org_11', org_name: 'EduStar Schools', plan: 'Starter', risk_score: 28, risk_level: 'low', signals: ['Near limits but steady usage'], recommended_action: 'Monitor', potential_mrr_at_risk: 49, days_since_login: 1, feature_adoption_score: 70, mrr: 49 },
  { org_id: 'org_16', org_name: 'CreativeStudio Inc', plan: 'Starter', risk_score: 25, risk_level: 'low', signals: ['Healthy engagement'], recommended_action: 'None', potential_mrr_at_risk: 49, days_since_login: 0, feature_adoption_score: 75, mrr: 49 },
  { org_id: 'org_1', org_name: 'TechCorp Solutions', plan: 'Professional', risk_score: 8, risk_level: 'low', signals: ['Very healthy'], recommended_action: 'Upsell', potential_mrr_at_risk: 348, days_since_login: 0, feature_adoption_score: 92, mrr: 348 },
  { org_id: 'org_3', org_name: 'GlobalTrade Inc', plan: 'Business', risk_score: 22, risk_level: 'low', signals: ['Stable usage', 'Annual billing'], recommended_action: 'Monitor', potential_mrr_at_risk: 1260, days_since_login: 0, feature_adoption_score: 78, mrr: 1260 },
  { org_id: 'org_6', org_name: 'DataFlow Systems', plan: 'Business', risk_score: 12, risk_level: 'low', signals: ['High AI usage — near limit'], recommended_action: 'Upgrade Nudge', potential_mrr_at_risk: 891, days_since_login: 0, feature_adoption_score: 85, mrr: 891 },
  { org_id: 'org_9', org_name: 'FinanceHub Ltd', plan: 'Enterprise', risk_score: 5, risk_level: 'low', signals: ['Very healthy enterprise'], recommended_action: 'None', potential_mrr_at_risk: 2400, days_since_login: 0, feature_adoption_score: 95, mrr: 2400 },
  { org_id: 'org_10', org_name: 'HealthFirst Clinics', plan: 'Professional', risk_score: 10, risk_level: 'low', signals: ['Steady growth'], recommended_action: 'None', potential_mrr_at_risk: 180, days_since_login: 0, feature_adoption_score: 88, mrr: 180 },
  { org_id: 'org_13', org_name: 'CloudNine Hosting', plan: 'Enterprise', risk_score: 7, risk_level: 'low', signals: ['Very healthy'], recommended_action: 'None', potential_mrr_at_risk: 3200, days_since_login: 0, feature_adoption_score: 91, mrr: 3200 },
  { org_id: 'org_14', org_name: 'LegalEase Partners', plan: 'Professional', risk_score: 18, risk_level: 'low', signals: ['Consistent usage'], recommended_action: 'None', potential_mrr_at_risk: 264, days_since_login: 1, feature_adoption_score: 81, mrr: 264 },
  { org_id: 'org_17', org_name: 'NovaPharma Labs', plan: 'Enterprise', risk_score: 4, risk_level: 'low', signals: ['Top engagement'], recommended_action: 'None', potential_mrr_at_risk: 4800, days_since_login: 0, feature_adoption_score: 94, mrr: 4800 },
  { org_id: 'org_19', org_name: 'SafeGuard Security', plan: 'Business', risk_score: 15, risk_level: 'low', signals: ['Healthy'], recommended_action: 'None', potential_mrr_at_risk: 435, days_since_login: 1, feature_adoption_score: 83, mrr: 435 },
  { org_id: 'org_12', org_name: 'AgriTech Solutions', plan: 'Professional', risk_score: 100, risk_level: 'critical', signals: ['Already churned'], recommended_action: 'Win-Back', potential_mrr_at_risk: 0, days_since_login: 45, feature_adoption_score: 0, mrr: 0 },
];

export const mockChurnEvents: ChurnEvent[] = [
  { id: 'ce_1', org_id: 'org_12', org_name: 'AgriTech Solutions', churn_type: 'voluntary_cancel', reason: 'Too expensive', mrr_lost: 144, churned_at: '2026-01-15', previous_plan: 'Professional' },
  { id: 'ce_2', org_id: 'org_x1', org_name: 'TravelBiz Co', churn_type: 'involuntary_payment', reason: 'Payment failed after dunning', mrr_lost: 99, churned_at: '2026-01-22', previous_plan: 'Business' },
  { id: 'ce_3', org_id: 'org_x2', org_name: 'OldTech Corp', churn_type: 'voluntary_non_renewal', reason: 'Switched competitor', mrr_lost: 348, churned_at: '2026-02-01', previous_plan: 'Professional' },
];

// ─── Upsell Signals ──────────────────────────────────────────
export const mockUpsellSignals: UpsellSignal[] = [
  { org_id: 'org_1', org_name: 'TechCorp Solutions', signal_type: 'At seat limit (29/100 but growing fast)', current_plan: 'Professional', recommended_plan: 'Business', potential_mrr_lift: 312 },
  { org_id: 'org_6', org_name: 'DataFlow Systems', signal_type: 'AI tokens >95% usage', current_plan: 'Business', recommended_plan: 'Enterprise', potential_mrr_lift: 540 },
  { org_id: 'org_7', org_name: 'GreenBuild Co', signal_type: '3 non-activated modules available', current_plan: 'Starter', recommended_plan: 'Professional', potential_mrr_lift: 299 },
  { org_id: 'org_11', org_name: 'EduStar Schools', signal_type: 'Near employee limit (18/25)', current_plan: 'Starter', recommended_plan: 'Professional', potential_mrr_lift: 167 },
  { org_id: 'org_10', org_name: 'HealthFirst Clinics', signal_type: 'Storage usage 78% — requesting more', current_plan: 'Professional', recommended_plan: 'Business', potential_mrr_lift: 220 },
  { org_id: 'org_16', org_name: 'CreativeStudio Inc', signal_type: 'AI usage growing 30% MoM', current_plan: 'Starter', recommended_plan: 'Professional', potential_mrr_lift: 95 },
  { org_id: 'org_3', org_name: 'GlobalTrade Inc', signal_type: 'Requested accounting module', current_plan: 'Business', recommended_plan: 'Enterprise', potential_mrr_lift: 740 },
  { org_id: 'org_14', org_name: 'LegalEase Partners', signal_type: 'Approaching seat limit', current_plan: 'Professional', recommended_plan: 'Business', potential_mrr_lift: 185 },
  { org_id: 'org_19', org_name: 'SafeGuard Security', signal_type: 'Multiple feature requests filed', current_plan: 'Business', recommended_plan: 'Enterprise', potential_mrr_lift: 465 },
  { org_id: 'org_20', org_name: 'UrbanDesign Collective', signal_type: 'Legacy plan — missing features', current_plan: 'Legacy Basic', recommended_plan: 'Starter', potential_mrr_lift: 20 },
  { org_id: 'org_8', org_name: 'MediaStream Co', signal_type: 'Requested API access', current_plan: 'Business', recommended_plan: 'Enterprise', potential_mrr_lift: 360 },
  { org_id: 'org_18', org_name: 'FoodChain Express', signal_type: 'Actively evaluating — trial user', current_plan: 'Professional', recommended_plan: 'Business', potential_mrr_lift: 200 },
  { org_id: 'org_15', org_name: 'SmartLogistics Ltd', signal_type: 'High storage usage', current_plan: 'Business', recommended_plan: 'Enterprise', potential_mrr_lift: 343 },
  { org_id: 'org_4', org_name: 'QuickLearn Academy', signal_type: 'Trial user exploring CRM', current_plan: 'Professional', recommended_plan: 'Business', potential_mrr_lift: 150 },
  { org_id: 'org_5', org_name: 'RetailPro Group', signal_type: 'Was on Business — could reactivate at higher tier', current_plan: 'Business', recommended_plan: 'Enterprise', potential_mrr_lift: 565 },
];

// ─── Anomalies ───────────────────────────────────────────────
export const mockAnomalies: AnomalyEvent[] = [
  { id: 'an_1', date: '2026-02-20', description: 'Payment failure rate for Visa spiked 340% between 2-4 PM AEST', status: 'resolved', severity: 'high' },
  { id: 'an_2', date: '2026-02-18', description: '3 orgs from same IP range signed up with gift cards', status: 'flagged', severity: 'high' },
  { id: 'an_3', date: '2026-02-15', description: 'MRR drop of $8,400 detected — traced to 4 annual downgrades', status: 'documented', severity: 'medium' },
  { id: 'an_4', date: '2026-02-10', description: 'Unusual spike in trial signups from Southeast Asia (42 in 2 hours)', status: 'investigating', severity: 'medium' },
  { id: 'an_5', date: '2026-02-05', description: 'Stripe webhook delays caused 12 invoices to show as pending incorrectly', status: 'resolved', severity: 'low' },
];

// ─── Cohort Retention ────────────────────────────────────────
export const mockCohortData: CohortData[] = [
  { cohort: 'Jan 2025', retention: [100, 92, 87, 83, 80, 78, 76, 74, 73, 72, 71, 70] },
  { cohort: 'Feb 2025', retention: [100, 90, 84, 80, 77, 75, 73, 71, 70, 69, 68, 0] },
  { cohort: 'Mar 2025', retention: [100, 88, 82, 78, 74, 72, 70, 68, 67, 66, 0, 0] },
  { cohort: 'Apr 2025', retention: [100, 91, 86, 82, 79, 77, 75, 73, 72, 0, 0, 0] },
  { cohort: 'May 2025', retention: [100, 89, 83, 79, 76, 74, 72, 70, 0, 0, 0, 0] },
  { cohort: 'Jun 2025', retention: [100, 93, 88, 84, 81, 79, 77, 0, 0, 0, 0, 0] },
  { cohort: 'Jul 2025', retention: [100, 87, 81, 77, 74, 72, 0, 0, 0, 0, 0, 0] },
  { cohort: 'Aug 2025', retention: [100, 90, 85, 81, 78, 0, 0, 0, 0, 0, 0, 0] },
  { cohort: 'Sep 2025', retention: [100, 92, 87, 83, 0, 0, 0, 0, 0, 0, 0, 0] },
  { cohort: 'Oct 2025', retention: [100, 88, 83, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { cohort: 'Nov 2025', retention: [100, 91, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { cohort: 'Dec 2025', retention: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

// ─── Revenue Forecast ────────────────────────────────────────
export const mockRevenueForecast: RevenueForecast[] = [
  { month: 'Mar 2025', actual: 232400 },
  { month: 'Apr 2025', actual: 239800 },
  { month: 'May 2025', actual: 245200 },
  { month: 'Jun 2025', actual: 254600 },
  { month: 'Jul 2025', actual: 260100 },
  { month: 'Aug 2025', actual: 268500 },
  { month: 'Sep 2025', actual: 274200 },
  { month: 'Oct 2025', actual: 280800 },
  { month: 'Nov 2025', actual: 278100 },
  { month: 'Dec 2025', actual: 284720 },
  { month: 'Jan 2026', actual: 279500 },
  { month: 'Feb 2026', actual: 284720 },
  { month: 'Mar 2026', forecast: 292000, optimistic: 298000, conservative: 286000 },
  { month: 'Apr 2026', forecast: 299500, optimistic: 310000, conservative: 289000 },
  { month: 'May 2026', forecast: 307200, optimistic: 322000, conservative: 292000 },
  { month: 'Jun 2026', forecast: 315100, optimistic: 335000, conservative: 295000 },
  { month: 'Jul 2026', forecast: 323200, optimistic: 348000, conservative: 298000 },
  { month: 'Aug 2026', forecast: 331500, optimistic: 362000, conservative: 301000 },
];

// ─── Alerts ──────────────────────────────────────────────────
export const mockAlerts: SubscriptionAlert[] = [
  { id: 'a_1', severity: 'critical', message: '23 orgs have failed payments > 3 days', action_label: 'Trigger Dunning', action_path: '/super-admin/subscriptions/dunning' },
  { id: 'a_2', severity: 'warning', message: '8 trial orgs expire in 48h without payment method', action_label: 'Send Reminder', action_path: '/super-admin/subscriptions/subscribers' },
  { id: 'a_3', severity: 'warning', message: '3 orgs at MRR churn risk > 80% (AI)', action_label: 'Review Accounts', action_path: '/super-admin/subscriptions/churn' },
  { id: 'a_4', severity: 'info', message: '$12,400 recovered via dunning this week', action_label: 'View Details', action_path: '/super-admin/subscriptions/dunning' },
  { id: 'a_5', severity: 'info', message: '14 win-back emails sent, 3 reactivations', action_label: 'View Campaign', action_path: '/super-admin/subscriptions/churn' },
];

// ─── Payment Health ──────────────────────────────────────────
export const mockPaymentHealth: PaymentHealthDay[] = Array.from({ length: 30 }, (_, i) => ({
  date: `Feb ${i + 1}`,
  successful: 40 + Math.floor(Math.random() * 20),
  failed: 1 + Math.floor(Math.random() * 5),
}));

// ─── Subscriber Waterfall ────────────────────────────────────
export const mockSubscriberWaterfall: SubscriberWaterfallMonth[] = [
  { month: 'Mar', new_subs: 45, reactivated: 8, upgraded: 12, downgraded: 4, churned: 15 },
  { month: 'Apr', new_subs: 52, reactivated: 6, upgraded: 15, downgraded: 3, churned: 12 },
  { month: 'May', new_subs: 38, reactivated: 10, upgraded: 9, downgraded: 5, churned: 18 },
  { month: 'Jun', new_subs: 61, reactivated: 12, upgraded: 18, downgraded: 2, churned: 14 },
  { month: 'Jul', new_subs: 48, reactivated: 7, upgraded: 14, downgraded: 6, churned: 16 },
  { month: 'Aug', new_subs: 55, reactivated: 9, upgraded: 20, downgraded: 3, churned: 11 },
  { month: 'Sep', new_subs: 42, reactivated: 11, upgraded: 16, downgraded: 4, churned: 13 },
  { month: 'Oct', new_subs: 58, reactivated: 8, upgraded: 22, downgraded: 5, churned: 17 },
  { month: 'Nov', new_subs: 50, reactivated: 6, upgraded: 13, downgraded: 7, churned: 19 },
  { month: 'Dec', new_subs: 65, reactivated: 14, upgraded: 25, downgraded: 2, churned: 10 },
  { month: 'Jan', new_subs: 53, reactivated: 10, upgraded: 18, downgraded: 4, churned: 15 },
  { month: 'Feb', new_subs: 60, reactivated: 12, upgraded: 21, downgraded: 3, churned: 12 },
];

// ─── Win-Back Campaigns ──────────────────────────────────────
export const mockWinBackCampaigns: WinBackCampaign[] = [
  { id: 'wb_1', name: '30-Day Win-Back', trigger_days: 30, offer: '30% off for 3 months', emails_sent: 124, reactivations: 18, conversion_rate: 14.5, status: 'active' },
  { id: 'wb_2', name: '60-Day Re-Engage', trigger_days: 60, offer: 'Free month + priority support', emails_sent: 89, reactivations: 8, conversion_rate: 9.0, status: 'active' },
  { id: 'wb_3', name: '90-Day Last Chance', trigger_days: 90, offer: '50% off for 6 months', emails_sent: 56, reactivations: 12, conversion_rate: 21.4, status: 'active' },
];
