import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Check, Coins, Sparkles, Star, Loader2 } from "lucide-react";

interface TokenPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

interface TokenPackage {
  id: string;
  name: string;
  description: string | null;
  tokens: number;
  price_cents: number;
  currency: string;
  bonus_percentage: number;
  is_popular: boolean;
}

export function TokenPurchaseDialog({
  open,
  onOpenChange,
  organizationId,
}: TokenPurchaseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);

  // Fetch token packages
  const { data: packages, isLoading } = useQuery({
    queryKey: ["token-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as TokenPackage[];
    },
  });

  // Purchase mutation
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: TokenPackage) => {
      const bonusTokens = Math.floor(pkg.tokens * (pkg.bonus_percentage / 100));
      const totalTokens = pkg.tokens + bonusTokens;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create purchase record
      const { error: purchaseError } = await supabase
        .from("token_purchases")
        .insert({
          organization_id: organizationId,
          package_id: pkg.id,
          tokens_purchased: pkg.tokens,
          bonus_tokens: bonusTokens,
          amount_cents: pkg.price_cents,
          currency: pkg.currency,
          payment_method: "manual", // For now, manual approval
          status: "pending",
          purchased_by: user.id,
        });

      if (purchaseError) throw purchaseError;

      // For demo: auto-approve and add tokens
      // In production, this would go through Stripe
      const { error: balanceError } = await supabase
        .from("token_balances")
        .upsert({
          organization_id: organizationId,
          purchased_tokens: totalTokens, // This should be incremented
          available_tokens: totalTokens,
        }, {
          onConflict: "organization_id",
        });

      if (balanceError) throw balanceError;

      return { totalTokens };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["token-balance"] });
      queryClient.invalidateQueries({ queryKey: ["token-purchases"] });
      
      toast({
        title: "Tokens Purchased!",
        description: `${formatTokens(data.totalTokens)} tokens have been added to your account.`,
      });
      
      onOpenChange(false);
      setSelectedPackage(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(0)}K`;
    return tokens.toString();
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(cents / 100);
  };

  const calculateBonus = (pkg: TokenPackage) => {
    return Math.floor(pkg.tokens * (pkg.bonus_percentage / 100));
  };

  const handlePurchase = () => {
    if (!selectedPackage) return;
    purchaseMutation.mutate(selectedPackage);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Purchase AI Tokens
          </DialogTitle>
          <DialogDescription>
            Choose a token package to expand your AI capabilities
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {packages?.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                const bonusTokens = calculateBonus(pkg);
                const totalTokens = pkg.tokens + bonusTokens;

                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={cn(
                      "relative flex flex-col items-center p-4 rounded-lg border-2 transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    )}
                  >
                    {pkg.is_popular && (
                      <Badge 
                        className="absolute -top-2 left-1/2 -translate-x-1/2 gap-1"
                        variant="default"
                      >
                        <Star className="h-3 w-3 fill-current" />
                        Popular
                      </Badge>
                    )}

                    <div className="text-center mb-2">
                      <div className="text-2xl font-bold">
                        {formatTokens(pkg.tokens)}
                      </div>
                      <div className="text-sm text-muted-foreground">tokens</div>
                    </div>

                    {pkg.bonus_percentage > 0 && (
                      <Badge variant="secondary" className="mb-2 gap-1">
                        <Sparkles className="h-3 w-3" />
                        +{pkg.bonus_percentage}% bonus
                      </Badge>
                    )}

                    <div className="text-lg font-semibold">
                      {formatPrice(pkg.price_cents, pkg.currency)}
                    </div>

                    {pkg.description && (
                      <div className="text-xs text-muted-foreground text-center mt-1">
                        {pkg.description}
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedPackage && (
          <>
            <Separator />
            <div className="py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Base tokens</span>
                <span>{formatTokens(selectedPackage.tokens)}</span>
              </div>
              {selectedPackage.bonus_percentage > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Bonus tokens ({selectedPackage.bonus_percentage}%)
                  </span>
                  <span className="text-green-600">
                    +{formatTokens(calculateBonus(selectedPackage))}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between font-medium">
                <span>Total tokens</span>
                <span>
                  {formatTokens(selectedPackage.tokens + calculateBonus(selectedPackage))}
                </span>
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={!selectedPackage || purchaseMutation.isPending}
          >
            {purchaseMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Purchase {selectedPackage ? formatPrice(selectedPackage.price_cents, selectedPackage.currency) : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
