import { WebsiteHeader, WebsiteFooter, PricingCard } from "@/components/website";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const pricingPlans = [
  {
    name: "Starter",
    price: "$149",
    description: "For small teams getting organized",
    features: [
      { name: "Unlimited users", included: true },
      { name: "Employee profiles & directory", included: true },
      { name: "Leave management", included: true, detail: "50 requests/mo" },
      { name: "Attendance tracking", included: true, detail: "500 scans/mo" },
      { name: "Social feed (wins, kudos)", included: true },
      { name: "Basic reporting", included: true },
      { name: "Email support", included: true },
      { name: "Team Wiki", included: false },
      { name: "AI features", included: false },
      { name: "Performance reviews", included: false },
    ],
  },
  {
    name: "Growth",
    price: "$299",
    description: "For growing teams that need everything",
    popular: true,
    features: [
      { name: "Unlimited users", included: true },
      { name: "Everything in Starter", included: true },
      { name: "Unlimited leave requests", included: true },
      { name: "Unlimited attendance scans", included: true },
      { name: "Team Wiki & Knowledge Base", included: true },
      { name: "Team Calendar", included: true },
      { name: "Position & salary tracking", included: true },
      { name: "KPI/OKR management", included: true },
      { name: "Performance reviews", included: true },
      { name: "AI Assistant", included: true, detail: "100 queries/mo" },
      { name: "AI Writing Assist", included: true },
      { name: "Mobile PWA app", included: true },
      { name: "Priority support", included: true },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For larger organizations with advanced needs",
    ctaText: "Contact Sales",
    features: [
      { name: "Unlimited users", included: true },
      { name: "Everything in Growth", included: true },
      { name: "Team Chat", included: true, detail: "Coming Soon" },
      { name: "Unlimited AI queries", included: true },
      { name: "Advanced analytics", included: true },
      { name: "SSO / SAML authentication", included: true },
      { name: "Custom integrations", included: true },
      { name: "API access", included: true },
      { name: "Dedicated account manager", included: true },
      { name: "Custom onboarding", included: true },
      { name: "SLA guarantees", included: true },
    ],
  },
];

const usageAddons = [
  { activity: "Leave requests", starter: "50/mo", growth: "Unlimited", overage: "—" },
  { activity: "Attendance scans", starter: "500/mo", growth: "Unlimited", overage: "—" },
  { activity: "Performance reviews", starter: "—", growth: "4/employee/year", overage: "$2/additional" },
  { activity: "Document storage", starter: "5 GB", growth: "10 GB", overage: "$5/10 GB/mo" },
];

const aiPricing = [
  { feature: "Ask AI queries", starter: "—", growth: "100/mo included", enterprise: "Unlimited" },
  { feature: "Additional AI queries", starter: "$0.05/query", growth: "$0.03/query", enterprise: "—" },
  { feature: "AI Performance Insights", starter: "—", growth: "20/mo included", enterprise: "Unlimited" },
  { feature: "AI Writing Assist", starter: "—", growth: "50/mo included", enterprise: "Unlimited" },
  { feature: "AI Review Prep", starter: "—", growth: "$0.50/draft", enterprise: "Included" },
];

const faqs = [
  {
    question: "What does 'unlimited users' mean?",
    answer: "Unlike most HR software that charges per seat, GlobalyOS includes unlimited users on every plan. Whether you have 10 employees or 100, you pay the same flat rate. This makes budgeting predictable and removes friction from team growth.",
  },
  {
    question: "How does the free trial work?",
    answer: "Start with a 14-day free trial on any plan. No credit card required. You'll have full access to all features in your chosen plan. At the end of the trial, you can subscribe or export your data.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes! You can upgrade or downgrade at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at your next billing cycle.",
  },
  {
    question: "What happens if I exceed my AI query limit?",
    answer: "We'll notify you when you're approaching your limit. You can either upgrade to a higher plan or pay for additional queries at the overage rates shown above. We never cut off access without warning.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use enterprise-grade encryption, role-based access control, and complete data isolation between organizations. All data is stored in SOC 2 compliant data centers with automatic backups.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer: "Yes! Pay annually and save 20%. Starter becomes $119/mo ($1,428/year) and Growth becomes $239/mo ($2,868/year). Contact us for enterprise annual pricing.",
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Simple pricing.{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Unlimited users.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            One price for your whole team—whether you're 10 people or 100.
            No per-seat surprises.
          </p>
          <div className="inline-block bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium">
            💡 Most HR software charges $15-30/employee/month. A 50-person team = $750-1,500/mo. With GlobalyOS Growth? Just $299.
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, index) => (
              <PricingCard key={index} {...plan} />
            ))}
          </div>
        </div>
      </section>

      {/* Annual Discount */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Save 20% with annual billing
            </h3>
            <p className="text-muted-foreground text-sm">
              Starter: $149 → <strong>$119/mo</strong> ($1,428/year) • 
              Growth: $299 → <strong>$239/mo</strong> ($2,868/year)
            </p>
          </div>
        </div>
      </section>

      {/* Usage Add-ons */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Usage-Based Add-ons
            </h2>
            <p className="text-muted-foreground">
              Pay only for what you use beyond included limits
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-foreground">Activity</th>
                    <th className="text-center p-4 font-semibold text-foreground">Starter</th>
                    <th className="text-center p-4 font-semibold text-foreground">Growth</th>
                    <th className="text-center p-4 font-semibold text-foreground">Overage</th>
                  </tr>
                </thead>
                <tbody>
                  {usageAddons.map((addon, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="p-4 text-foreground">{addon.activity}</td>
                      <td className="p-4 text-center text-muted-foreground">{addon.starter}</td>
                      <td className="p-4 text-center text-foreground font-medium">{addon.growth}</td>
                      <td className="p-4 text-center text-muted-foreground">{addon.overage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* AI Pricing */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              AI Usage Pricing
            </h2>
            <p className="text-muted-foreground">
              Transparent & predictable AI costs
            </p>
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-semibold text-foreground">AI Feature</th>
                    <th className="text-center p-4 font-semibold text-foreground">Starter</th>
                    <th className="text-center p-4 font-semibold text-foreground">Growth</th>
                    <th className="text-center p-4 font-semibold text-foreground">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {aiPricing.map((item, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="p-4 text-foreground">{item.feature}</td>
                      <td className="p-4 text-center text-muted-foreground">{item.starter}</td>
                      <td className="p-4 text-center text-foreground font-medium">{item.growth}</td>
                      <td className="p-4 text-center text-primary font-medium">{item.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Frequently Asked Questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-6"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-primary to-accent">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Start your free trial today
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              No credit card required. Full access for 14 days.
              Cancel anytime.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}
