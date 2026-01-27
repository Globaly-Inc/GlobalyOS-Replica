import { ReactNode } from "react";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { UpgradePrompt } from "./UpgradePrompt";
import { LimitReachedDialog } from "./LimitReachedDialog";
import { useState } from "react";

interface FeatureGateProps {
  feature: string;
  featureName?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showDialog?: boolean;
  onBlocked?: () => void;
}

/**
 * FeatureGate wraps content that should be blocked when usage limits are exceeded.
 * It can show a dialog or fallback content when the feature is unavailable.
 */
export function FeatureGate({
  feature,
  featureName,
  children,
  fallback,
  showDialog = false,
  onBlocked,
}: FeatureGateProps) {
  const { canUse, getUsageForFeature, isLoading } = useUsageLimits();
  const [dialogOpen, setDialogOpen] = useState(false);

  // While loading, show children (optimistic rendering)
  if (isLoading) {
    return <>{children}</>;
  }

  const canUseFeature = canUse(feature);
  const usage = getUsageForFeature(feature);

  if (!canUseFeature) {
    if (onBlocked) {
      onBlocked();
    }

    if (showDialog) {
      return (
        <>
          <div
            onClick={() => setDialogOpen(true)}
            className="cursor-pointer opacity-50 hover:opacity-75 transition-opacity"
          >
            {children}
          </div>
          <LimitReachedDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            feature={feature}
            featureName={featureName}
            currentUsage={usage.current_usage}
            limit={usage.limit || 0}
            unit={usage.unit || undefined}
          />
        </>
      );
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <UpgradePrompt
        feature={featureName || feature}
        variant="card"
      />
    );
  }

  return <>{children}</>;
}

/**
 * Hook-based gate check for programmatic use
 */
export function useFeatureGate(feature: string) {
  const { canUse, getUsageForFeature, isLoading } = useUsageLimits();

  const checkAccess = (): { allowed: boolean; usage: ReturnType<typeof getUsageForFeature> } => {
    const usage = getUsageForFeature(feature);
    return {
      allowed: canUse(feature),
      usage,
    };
  };

  return {
    checkAccess,
    isLoading,
    canUse: () => canUse(feature),
    getUsage: () => getUsageForFeature(feature),
  };
}
