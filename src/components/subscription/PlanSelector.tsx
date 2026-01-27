import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  monthly_price: number;
  annual_price: number;
  currency: string;
  trial_days: number;
  is_popular: boolean;
  feature_highlights: string[];
  stripe_monthly_price_id: string | null;
  stripe_annual_price_id: string | null;
}

interface PlanSelectorProps {
  currentPlan?: string;
  organizationId: string;
  onPlanSelect?: (plan: SubscriptionPlan, billingCycle: "monthly" | "annual") => void;
}

export function PlanSelector({ currentPlan, organizationId, onPlanSelect }: PlanSelectorProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .eq("is_public", true)
        .order("sort_order");

      if (error) throw error;
      return data as SubscriptionPlan[];
    },
  });

  const formatPrice = (amount: number, currency: string) => {
    if (amount === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getAnnualSavings = (plan: SubscriptionPlan) => {
    if (plan.monthly_price === 0 || plan.annual_price === 0) return 0;
    return Math.round((1 - plan.annual_price / (plan.monthly_price * 12)) * 100);
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.slug === currentPlan) return;

    const priceId = billingCycle === "annual" ? plan.stripe_annual_price_id : plan.stripe_monthly_price_id;

    if (!priceId && plan.monthly_price > 0) {
      toast.error("This plan is not available for online checkout. Please contact sales.");
      return;
    }

    if (onPlanSelect) {
      onPlanSelect(plan, billingCycle);
      return;
    }

    // If no callback, attempt Stripe checkout
    if (plan.monthly_price === 0) {
      toast.info("You're already on the free plan or switching to free requires contacting support.");
      return;
    }

    setIsCheckingOut(plan.id);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("Please sign in to upgrade your plan");
        return;
      }

      const response = await supabase.functions.invoke("create-checkout-session", {
        body: {
          priceId,
          organizationId,
          billingCycle,
        },
      });

      if (response.error) throw response.error;

      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setIsCheckingOut(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing-cycle" className={cn(billingCycle === "monthly" && "font-semibold")}>
          Monthly
        </Label>
        <Switch
          id="billing-cycle"
          checked={billingCycle === "annual"}
          onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
        />
        <Label htmlFor="billing-cycle" className={cn(billingCycle === "annual" && "font-semibold")}>
          Annual
          <Badge variant="secondary" className="ml-2 text-xs">
            Save up to 20%
          </Badge>
        </Label>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plans?.map((plan) => {
          const isCurrentPlan = plan.slug === currentPlan;
          const price = billingCycle === "annual" ? plan.annual_price : plan.monthly_price;
          const savings = getAnnualSavings(plan);

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.is_popular && "border-primary ring-1 ring-primary",
                isCurrentPlan && "bg-muted/50"
              )}
            >
              {plan.is_popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.tagline && (
                  <CardDescription className="text-sm">{plan.tagline}</CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 text-center">
                <div className="mb-4">
                  <span className="text-4xl font-bold">{formatPrice(price, plan.currency)}</span>
                  {price > 0 && (
                    <span className="text-muted-foreground">
                      /{billingCycle === "annual" ? "year" : "month"}
                    </span>
                  )}
                {billingCycle === "annual" && savings > 0 && (
                    <div className="text-sm text-primary mt-1">Save {savings}%</div>
                  )}
                </div>

                {plan.trial_days > 0 && !isCurrentPlan && price > 0 && (
                  <Badge variant="outline" className="mb-4">
                    {plan.trial_days}-day free trial
                  </Badge>
                )}

                <ul className="space-y-2 text-sm text-left">
                  {plan.feature_highlights?.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? "outline" : plan.is_popular ? "default" : "secondary"}
                  disabled={isCurrentPlan || isCheckingOut === plan.id}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isCheckingOut === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : price === 0 ? (
                    "Get Started"
                  ) : (
                    "Upgrade"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Contact Sales for Enterprise */}
      <div className="text-center text-sm text-muted-foreground">
        Need a custom plan?{" "}
        <a href="mailto:sales@globalyos.com" className="text-primary hover:underline">
          Contact our sales team
        </a>
      </div>
    </div>
  );
}
