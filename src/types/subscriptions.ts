export type PricingModel = 'flat_fee' | 'per_seat' | 'usage_based' | 'tiered' | 'hybrid' | 'one_time';
export type BillingFrequency = 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'paused' | 'cancelled' | 'unpaid';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partially_paid' | 'past_due' | 'uncollectible' | 'voided';
export type ChurnType = 'voluntary_cancel' | 'voluntary_non_renewal' | 'involuntary_payment' | 'involuntary_closed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CouponType = 'percentage' | 'fixed_amount' | 'trial_extension';
export type CouponStatus = 'active' | 'scheduled' | 'expired' | 'archived';
export type CouponDuration = 'once' | 'repeating' | 'forever';

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  pricing_model: PricingModel;
  base_price: number;
  annual_price?: number;
  per_seat_price?: number;
  annual_per_seat_price?: number;
  billing_frequencies: BillingFrequency[];
  trial_days: number;
  status: 'active' | 'grandfathered' | 'archived';
  subscriber_count: number;
  mrr: number;
  features: PlanFeature[];
  created_at: string;
}

export interface PlanFeature {
  name: string;
  limit_type: 'number' | 'boolean' | 'multi_select';
  value: number | boolean | string[];
  max?: number;
}

export interface OrgSubscription {
  id: string;
  org_id: string;
  org_name: string;
  plan_id: string;
  plan_name: string;
  status: SubscriptionStatus;
  mrr: number;
  billing_frequency: BillingFrequency;
  next_renewal: string;
  member_count: number;
  health_score: number;
  churn_risk_score: number;
  payment_method: PaymentMethod;
  started_at: string;
  trial_ends_at?: string;
  paused_until?: string;
  usage: FeatureUsage[];
  timeline: TimelineEvent[];
}

export interface PaymentMethod {
  type: 'visa' | 'mastercard' | 'amex' | 'paypal' | 'bank_transfer';
  last4: string;
  expiry: string;
  is_primary: boolean;
}

export interface FeatureUsage {
  feature: string;
  used: number;
  limit: number;
  unit: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: 'created' | 'upgraded' | 'downgraded' | 'payment_failed' | 'payment_success' | 'dunning_sent' | 'recovered' | 'cancelled' | 'reactivated' | 'paused' | 'resumed' | 'coupon_applied' | 'trial_started' | 'trial_converted';
  description: string;
  actor?: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoice_number: string;
  org_id: string;
  org_name: string;
  amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_at?: string;
  line_items: InvoiceLineItem[];
  credit_applied: number;
  tax_amount: number;
  discount_amount: number;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface DunningStage {
  day: number;
  retry: boolean;
  email_template: string;
  escalation: string;
}

export interface DunningCampaign {
  id: string;
  name: string;
  assigned_to: string;
  stages: DunningStage[];
  recovery_rate: number;
  active_runs: number;
  status: 'active' | 'paused' | 'archived';
}

export interface DunningRun {
  id: string;
  org_id: string;
  org_name: string;
  campaign_id: string;
  current_stage: number;
  total_stages: number;
  days_overdue: number;
  amount: number;
  next_retry: string;
  last_email_sent: string;
}

export interface ChurnEvent {
  id: string;
  org_id: string;
  org_name: string;
  churn_type: ChurnType;
  reason: string;
  mrr_lost: number;
  churned_at: string;
  previous_plan: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  duration: CouponDuration;
  duration_months?: number;
  redemptions: number;
  limit?: number;
  expiry?: string;
  campaign_id?: string;
  campaign_name?: string;
  plan_restrictions?: string[];
  new_subscribers_only: boolean;
  stackable: boolean;
  status: CouponStatus;
  created_at: string;
}

export interface MRRMovement {
  month: string;
  new_mrr: number;
  expansion_mrr: number;
  reactivation_mrr: number;
  contraction_mrr: number;
  churn_mrr: number;
  net_mrr: number;
}

export interface ChurnPrediction {
  org_id: string;
  org_name: string;
  plan: string;
  risk_score: number;
  risk_level: RiskLevel;
  signals: string[];
  recommended_action: string;
  potential_mrr_at_risk: number;
  days_since_login: number;
  feature_adoption_score: number;
  mrr: number;
}

export interface UpsellSignal {
  org_id: string;
  org_name: string;
  signal_type: string;
  current_plan: string;
  recommended_plan: string;
  potential_mrr_lift: number;
}

export interface AnomalyEvent {
  id: string;
  date: string;
  description: string;
  status: 'resolved' | 'investigating' | 'flagged' | 'documented';
  severity: 'low' | 'medium' | 'high';
}

export interface CohortData {
  cohort: string;
  retention: number[];
}

export interface RevenueForecast {
  month: string;
  actual?: number;
  forecast?: number;
  optimistic?: number;
  conservative?: number;
}

export interface CampaignGroup {
  id: string;
  name: string;
  coupon_count: number;
  total_redemptions: number;
  revenue_impact: number;
  reactivations?: number;
}

export interface WinBackCampaign {
  id: string;
  name: string;
  trigger_days: number;
  offer: string;
  emails_sent: number;
  reactivations: number;
  conversion_rate: number;
  status: 'active' | 'paused' | 'completed';
}

export interface SubscriptionAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  action_label: string;
  action_path: string;
}

export interface PaymentHealthDay {
  date: string;
  successful: number;
  failed: number;
}

export interface SubscriberWaterfallMonth {
  month: string;
  new_subs: number;
  reactivated: number;
  upgraded: number;
  downgraded: number;
  churned: number;
}
