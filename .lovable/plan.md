

# GlobalyOS Subscription Management System — Build Plan

A complete, production-quality Subscription Management System (SMS) for the Super Admin portal with 9 sub-modules, all using mock data, interactive UI, and charts.

---

## Architecture Overview

The SMS is a self-contained section under `/super-admin/subscriptions/*` with its own sidebar layout component. It does NOT modify any existing Super Admin pages — only adds a new nav item ("Subscriptions") to `SuperAdminLayout.tsx` and new routes to `App.tsx`.

```text
src/
  types/
    subscriptions.ts              -- All TypeScript types
  data/
    subscriptions-mock.ts         -- All mock data (20 orgs, 5 plans, 30 invoices, etc.)
  components/
    super-admin/
      subscriptions/
        SubscriptionsLayout.tsx   -- Sidebar sub-nav + content area
        overview/
          OverviewDashboard.tsx   -- KPI cards, charts, alerts
          KPICard.tsx             -- Reusable stat card with sparkline
          AlertPanel.tsx          -- Action items sidebar
        plans/
          PlansAndPricing.tsx     -- Plan catalog table
          CreatePlanSheet.tsx     -- Side sheet with 5 form sections
          PlanDetail.tsx          -- Plan detail page
        subscribers/
          SubscribersList.tsx     -- Full data table with filters
          SubscriptionDetailSheet.tsx -- 5-tab detail sheet
        billing/
          BillingAndInvoices.tsx  -- Invoice list with tabs
          InvoiceDetailSheet.tsx  -- Invoice preview + actions
          ReceivablesAging.tsx    -- Aging bar chart widget
        dunning/
          DunningDashboard.tsx    -- Recovery stats + campaigns
          CampaignBuilder.tsx     -- Visual stage builder
          ActiveDunningRuns.tsx   -- Active runs table
        churn/
          ChurnManagement.tsx     -- Stats, charts, cohort table
          ChurnRiskList.tsx       -- At-risk orgs table
          CancellationFlowPreview.tsx -- Modal preview
          WinBackCampaigns.tsx    -- Win-back manager
        coupons/
          CouponsAndPromos.tsx    -- Coupon list + campaigns
          CreateCouponSheet.tsx   -- Coupon creation form
        analytics/
          RevenueAnalytics.tsx    -- 5 report tabs
          MRRMovementChart.tsx    -- Stacked bar chart
          TrialPerformance.tsx    -- Funnel + metrics
          RevenueForecast.tsx     -- Forecast line chart
          CustomReportBuilder.tsx -- Drag-and-drop builder UI
        ai-insights/
          AIInsights.tsx          -- AI action feed + panels
          ChurnRiskScatter.tsx    -- Interactive scatter plot
          UpsellSignals.tsx       -- Expansion opportunities
          AnomalyFeed.tsx         -- Anomaly timeline
  pages/
    super-admin/
      SuperAdminSubscriptions.tsx         -- Route: /super-admin/subscriptions
      SuperAdminSubscriptionPlans.tsx     -- Route: /super-admin/subscriptions/plans
      SuperAdminSubscriptionPlanDetail.tsx -- Route: /super-admin/subscriptions/plans/:planId
      SuperAdminSubscribers.tsx           -- Route: /super-admin/subscriptions/subscribers
      SuperAdminBilling.tsx               -- Route: /super-admin/subscriptions/billing
      SuperAdminDunning.tsx               -- Route: /super-admin/subscriptions/dunning
      SuperAdminChurn.tsx                 -- Route: /super-admin/subscriptions/churn
      SuperAdminCoupons.tsx               -- Route: /super-admin/subscriptions/coupons
      SuperAdminRevenueAnalytics.tsx      -- Route: /super-admin/subscriptions/analytics
      SuperAdminAIInsights.tsx            -- Route: /super-admin/subscriptions/ai-insights
```

---

## Phase 1: Foundation (Types, Mock Data, Layout, Routing)

### 1a. Types (`src/types/subscriptions.ts`)
All TypeScript types as specified: `PricingModel`, `BillingFrequency`, `SubscriptionStatus`, `InvoiceStatus`, `ChurnType`, `RiskLevel`, and all interfaces (`SubscriptionPlan`, `OrgSubscription`, `Invoice`, `DunningCampaign`, `ChurnEvent`, `Coupon`, `MRRMovement`, `ChurnPrediction`, `UpsellSignal`, etc.)

### 1b. Mock Data (`src/data/subscriptions-mock.ts`)
Comprehensive mock data including:
- 5 subscription plans (Starter, Professional, Business, Enterprise, Legacy Basic)
- 20 org subscriptions with mixed statuses, health scores, MRR values
- 30 invoices across all statuses
- 3 dunning campaigns with stage definitions
- 15 coupons across 3 campaign groups
- 12 months of MRR movement data
- 20 churn predictions with risk scores and signals
- 15 upsell signals
- 5 anomaly events
- 12x12 cohort retention matrix
- 18 months revenue forecast (12 historical + 6 projected)

### 1c. Subscriptions Layout (`SubscriptionsLayout.tsx`)
- Fixed left sidebar (240px, collapsible to 64px icon-only)
- 9 nav items with lucide icons: LayoutDashboard, Layers, Users, Receipt, RefreshCw, TrendingDown, Tag, BarChart2, Sparkles
- Active state highlighting matching current route
- Content area with `flex-1 overflow-auto`
- Wrapped in existing `SuperAdminLayout` for the top-level nav

### 1d. Routing Changes (`App.tsx`)
- Add lazy imports for all 10 new page components
- Add routes under `/super-admin/subscriptions/*` wrapped in `SuperAdminProtectedRoute`
- Add redirect from `/super-admin/subscriptions` to the Overview page

### 1e. Navigation Update (`SuperAdminLayout.tsx`)
- Update the existing "Subscription" nav item path from `/super-admin/payments` to `/super-admin/subscriptions`
- Keep the existing `/super-admin/payments` route working (no removal)

---

## Phase 2: Overview Dashboard

### KPI Cards Row
- 8 cards in a responsive 4-column grid (2 rows on desktop)
- Each card: metric name, formatted value, delta badge (green for positive, red for negative), mini sparkline using Recharts `<Sparkline>` (tiny area chart, 40px height)
- Cards: MRR, ARR, Active Subscribers, Trial Conversion Rate, MRR Churn Rate, Net Revenue Retention, Avg Revenue Per Org, Failed Payment Rate

### Charts Section (2-column grid)
- **MRR Growth Chart**: Stacked area chart (Recharts `AreaChart`) with 4 colored bands, 12 months, month labels on x-axis
- **Subscriber Waterfall**: Grouped bar chart showing New, Reactivated, Upgraded, Downgraded, Churned per month
- **Revenue by Plan**: Donut chart (`PieChart`) with legend showing Starter/Professional/Business/Enterprise percentages
- **Payment Health**: Bar chart (30 days) with green (success) and red (failed) stacked bars

### Alert Panel
- Scrollable right sidebar panel with color-coded alerts (red/yellow/green left border)
- Each alert: severity icon, description, [Take Action] button linking to relevant sub-module
- 5 mock alerts as specified

---

## Phase 3: Plans and Pricing

### Plan Catalog Table
- Data table with sortable columns: Plan Name, Pricing Model, Price, Billing Cycles, Subscribers, MRR, Status (badge), Actions (Edit, Archive)
- 5 mock plans with status badges (Active = green, Grandfathered = amber)
- Empty state with illustration

### Create Plan Sheet (Side Sheet)
- 5 form sections with validation:
  - Section 1: Plan Details (name, code auto-slug, description, visibility radio)
  - Section 2: Pricing Model (6 radio cards with icons and descriptions)
  - Section 3: Pricing and Billing (price input, currency selector, frequency checkboxes, annual discount, setup fee)
  - Section 4: Trial Configuration (enable toggle, duration, require card, auto-convert)
  - Section 5: Feature Entitlements (table form with feature name, limit type, value, max)
- Footer: Cancel, Save as Draft, Publish buttons

### Plan Detail Page (`/super-admin/subscriptions/plans/:planId`)
- Overview cards (subscribers, MRR, avg MRR/org)
- Subscriber count over time line chart
- Revenue contribution area chart
- Orgs on this plan table
- Version history timeline

---

## Phase 4: Subscribers

### Subscriber List
- Full data table (20 mock orgs) with columns: Org Name, Plan (badge), Status (colored badge), MRR, Billing Cycle, Members, Health Score (color-coded 0-100), Next Renewal, Actions
- Filter bar: Plan selector, Status multi-select, Billing cycle, Search, Date range
- Row click opens detail sheet

### Subscription Detail Sheet (5 tabs)
- **Overview**: Subscription info card, feature usage progress bars (Employees, Storage, AI Tokens), event timeline
- **Lifecycle Actions**: 3-column grid of action buttons (Upgrade, Downgrade, Change Cycle, Pause, Cancel, Reactivate, Apply Coupon, Extend Trial, Issue Credit, Waive Invoice, Force Renew) with confirmation modals for destructive actions showing impact previews
- **Payment Methods**: Saved cards table with type, last 4, expiry, primary/backup badge
- **Invoice History**: Invoice table with Download, Resend, Record Payment actions
- **Activity Log**: Chronological timeline with timestamps, actor names, action descriptions, icons

---

## Phase 5: Billing and Invoices

### Invoice List
- Tabs: All, Pending, Past Due, Paid, Voided
- 30 mock invoices with columns: Invoice #, Organization, Amount, Status (colored badge), Issue Date, Due Date, Payment Date, Actions
- Bulk actions bar on selection: Send Reminder, Mark as Paid, Export CSV

### Invoice Detail Sheet
- Styled invoice preview (logo, org details, line items table, subtotal, tax, total)
- Payment recording form
- Credit note issuance
- Email delivery status
- Actions: Download PDF, Resend, Void, Apply Partial Payment

### Receivables Aging Widget
- Horizontal bar chart showing outstanding by age bucket (0-30, 31-60, 61-90, 90+ days)

---

## Phase 6: Dunning and Recovery

### Recovery Dashboard
- 4 stat cards (Recovered, Recovery Rate, Avg Recovery Time, Active Runs)
- Recovery breakdown donut chart (Intelligent Retry, Backup Payment, Account Updater, Manual)

### Dunning Campaigns Table
- 3 mock campaigns with columns: Campaign, Assigned To, Stages, Recovery Rate, Active Runs, Status
- "Create Campaign" button opens Campaign Builder Sheet

### Campaign Builder Sheet
- Visual vertical timeline with stage cards
- Each stage: Day offset input, Retry toggle, Email template selector, Escalation action selector
- "+ Add Stage" button

### Active Dunning Runs Table
- Orgs in dunning: Org Name, Current Stage, Days Overdue, Amount, Next Retry, Last Email Sent, Actions (Pause, Resolve, Write Off)

---

## Phase 7: Churn Management

### Churn Overview Stats + Charts
- 4 stat cards (Churn Rate, Churned MRR, Voluntary %, Involuntary %)
- Voluntary vs Involuntary stacked bar chart (12 months)
- Churn Reasons donut chart

### Cohort Retention Table
- 12x12 grid with color-coded retention percentages (green to red)

### Churn Risk Orgs List
- Table sorted by risk score with signals and action buttons

### Cancellation Deflection Flow Preview
- Modal with 4-step visual mockup (reason selector, tailored offer, pause options, confirm)

### Win-Back Campaign Manager
- Table with campaign name, trigger days, offer, emails sent, reactivations, conversion rate

---

## Phase 8: Coupons and Promotions

### Coupon List
- Tabs: Active, Scheduled, Expired, All
- 15 mock coupons with columns: Code, Type, Discount, Redemptions, Limit, Expiry, Campaign, Status, Actions

### Create Coupon Sheet
- Form: Code input with "Generate" button, Type radio, Discount value, Duration, Plan restrictions, New subscribers toggle, Redemption limit, Expiry date, Campaign association, Stackable toggle

### Campaign Groups
- Card grid showing 3 promotion campaigns with mini performance bars

---

## Phase 9: Analytics

### Header Controls
- Date range picker (presets: 7d, 30d, 90d, 12m, Custom)
- Plan filter dropdown
- Export button (CSV, PDF)

### 5 Report Tabs
1. **MRR Movement**: Stacked bar chart (5 MRR components, 12 months) + monthly totals table
2. **Plan Performance**: Table with sparkline trends per plan
3. **Trial Performance**: Funnel chart, conversion by plan, trial length histogram, expiring trials countdown
4. **Revenue Forecast**: Line chart with actual (solid) + forecast (dashed) + confidence bands (shaded green/red)
5. **Custom Report Builder**: Draggable metric chips, report canvas, filters panel, visualization type selector, Save + Schedule buttons

---

## Phase 10: AI Insights

### AI Action Feed
- Prioritized list of 4 AI-generated recommendation cards
- Each: colored left border by severity, description, projected impact value, action buttons
- Subtle animated gradient background on cards (CSS animation)

### Churn Risk Scatter Plot
- Recharts `ScatterChart`: X = days since login, Y = feature adoption score, bubble size = MRR, color = risk score (green to red)
- Hover tooltips with org details
- Below: sortable data table of top 20 at-risk orgs

### Upsell Signals Panel
- Table: Org, Signal, Current Plan, Recommended Plan, Potential MRR Lift

### Anomaly Detection Feed
- Timeline of 5 detected anomalies (last 30 days) with date, description, status badge

---

## Files Summary

| Category | Count |
|---|---|
| New type files | 1 |
| New mock data files | 1 |
| New page components | 10 |
| New UI components | ~30 |
| Modified files | 2 (App.tsx routing, SuperAdminLayout.tsx nav) |
| **Total new files** | **~42** |

## Design Standards Applied
- All tables: column sorting, hover states, empty states with illustrations
- All stat cards: white bg, subtle shadow, blue bottom accent
- All sheets: slide from right, max-width 680px (detail) or 520px (forms), sticky header/footer
- All charts: Recharts, consistent color palette, responsive, 280px min height
- Loading: skeleton loaders for tables and charts
- Typography: text-2xl bold titles, text-lg semibold sections, text-xs uppercase table headers
- Layout: max-w-[1400px] mx-auto px-6 py-8 content area
- Responsive: works down to 1024px width

## Implementation Order
Due to the size, this will be implemented in logical batches:
1. Types + Mock Data + Layout + Routing (foundation)
2. Overview Dashboard (KPIs, charts, alerts)
3. Plans and Pricing (catalog, create sheet, detail page)
4. Subscribers (list, detail sheet with 5 tabs)
5. Billing and Invoices (invoice list, detail, receivables)
6. Dunning and Recovery (dashboard, campaign builder, active runs)
7. Churn Management (stats, cohort table, risk list, cancellation flow, win-back)
8. Coupons and Promotions (list, create form, campaign groups)
9. Analytics (5 report tabs including forecast and report builder)
10. AI Insights (action feed, scatter plot, upsell signals, anomalies)

