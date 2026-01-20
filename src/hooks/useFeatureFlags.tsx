import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

// Known feature flags - these are Super Admin gated features
export type FeatureName = "chat" | "tasks" | "crm" | "workflows" | "payroll" | "ask-ai";

interface FeatureFlags {
  chat: boolean;
  tasks: boolean;
  crm: boolean;
  workflows: boolean;
  payroll: boolean;
  "ask-ai": boolean;
}

interface FeatureFlagsContextType {
  flags: FeatureFlags;
  loading: boolean;
  isEnabled: (feature: FeatureName) => boolean;
  refresh: () => Promise<void>;
}

const defaultFlags: FeatureFlags = {
  chat: false,
  tasks: false,
  crm: false,
  workflows: false,
  payroll: false,
  "ask-ai": false,
};

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export const FeatureFlagsProvider = ({ children }: { children: ReactNode }) => {
  const { currentOrg } = useOrganization();
  const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);
  const [loading, setLoading] = useState(true);

  const fetchFlags = async () => {
    if (!currentOrg?.id) {
      setFlags(defaultFlags);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("organization_features")
        .select("feature_name, is_enabled")
        .eq("organization_id", currentOrg.id);

      if (error) {
        console.error("Error fetching feature flags:", error);
        setFlags(defaultFlags);
      } else {
        const newFlags: FeatureFlags = { ...defaultFlags };
        data?.forEach((row) => {
          if (row.feature_name in newFlags) {
            newFlags[row.feature_name as FeatureName] = row.is_enabled;
          }
        });
        setFlags(newFlags);
      }
    } catch (err) {
      console.error("Error fetching feature flags:", err);
      setFlags(defaultFlags);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();

    // Set up real-time subscription for feature flag changes
    if (currentOrg?.id) {
      const channel = supabase
        .channel("feature-flags-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "organization_features",
            filter: `organization_id=eq.${currentOrg.id}`,
          },
          () => {
            fetchFlags();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentOrg?.id]);

  const isEnabled = (feature: FeatureName): boolean => {
    return flags[feature] ?? false;
  };

  return (
    <FeatureFlagsContext.Provider
      value={{
        flags,
        loading,
        isEnabled,
        refresh: fetchFlags,
      }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within a FeatureFlagsProvider");
  }
  return context;
};
