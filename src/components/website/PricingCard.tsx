import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface PricingFeature {
  name: string;
  included: boolean;
  detail?: string;
}

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: PricingFeature[];
  popular?: boolean;
  ctaText?: string;
  ctaVariant?: "default" | "outline";
}

export const PricingCard = ({
  name,
  price,
  period = "/month",
  description,
  features,
  popular = false,
  ctaText = "Get Started",
  ctaVariant = "default",
}: PricingCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "relative flex flex-col p-8 rounded-2xl border transition-all duration-300",
        popular
          ? "bg-gradient-to-b from-primary/5 to-accent/5 border-primary shadow-lg scale-105"
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-sm font-medium rounded-full bg-gradient-to-r from-primary to-accent text-white">
          Most Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-bold text-foreground">{price}</span>
        {price !== "Custom" && (
          <span className="text-muted-foreground">{period}</span>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-muted-foreground/50 shrink-0 mt-0.5" />
            )}
            <span
              className={cn(
                "text-sm",
                feature.included
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              )}
            >
              {feature.name}
              {feature.detail && (
                <span className="text-muted-foreground"> ({feature.detail})</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Button
        variant={popular ? "default" : ctaVariant}
        className={cn(
          "w-full",
          popular && "bg-gradient-to-r from-primary to-accent hover:opacity-90"
        )}
        onClick={() => navigate("/signup")}
      >
        {ctaText}
      </Button>
    </div>
  );
};
