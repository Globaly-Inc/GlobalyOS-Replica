import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, CheckSquare, Briefcase, Flag } from "lucide-react";
import { toast } from "sonner";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface FeatureFlag {
  feature_name: string;
  is_enabled: boolean;
}

interface OrganizationFeaturesManagerProps {
  organizationId: string;
  organizationName: string;
}

const AVAILABLE_FEATURES = [
  { 
    name: "chat", 
    label: "Chat", 
    description: "Team messaging and communication",
    icon: MessageSquare 
  },
  { 
    name: "tasks", 
    label: "Tasks", 
    description: "Task management and assignments",
    icon: CheckSquare 
  },
  { 
    name: "crm", 
    label: "CRM", 
    description: "Customer relationship management",
    icon: Briefcase 
  },
];

export const OrganizationFeaturesManager = ({ 
  organizationId, 
  organizationName 
}: OrganizationFeaturesManagerProps) => {
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { logActivity } = useAdminActivityLog();

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from("organization_features")
        .select("feature_name, is_enabled")
        .eq("organization_id", organizationId);

      if (error) throw error;

      const featureMap: Record<string, boolean> = {};
      data?.forEach((f) => {
        featureMap[f.feature_name] = f.is_enabled;
      });

      // Initialize all features with false if not set
      AVAILABLE_FEATURES.forEach((f) => {
        if (!(f.name in featureMap)) {
          featureMap[f.name] = false;
        }
      });

      setFeatures(featureMap);
    } catch (error) {
      console.error("Error fetching features:", error);
      toast.error("Failed to load feature flags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [organizationId]);

  const toggleFeature = async (featureName: string, enabled: boolean) => {
    setUpdating(featureName);
    try {
      const { error } = await supabase
        .from("organization_features")
        .upsert(
          {
            organization_id: organizationId,
            feature_name: featureName,
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,feature_name" }
        );

      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: enabled ? 'feature_enabled' : 'feature_disabled',
        entityType: 'feature',
        metadata: { featureName, enabled }
      });

      setFeatures((prev) => ({
        ...prev,
        [featureName]: enabled,
      }));

      toast.success(`${featureName} ${enabled ? "enabled" : "disabled"} for ${organizationName}`);
    } catch (error) {
      console.error("Error updating feature:", error);
      toast.error("Failed to update feature flag");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flag className="h-5 w-5" />
          Feature Flags
        </CardTitle>
        <CardDescription>
          Enable or disable features for this organization
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px] px-6 py-4">
          <div className="space-y-4">
            {AVAILABLE_FEATURES.map((feature) => {
              const Icon = feature.icon;
              const isEnabled = features[feature.name] ?? false;
              const isUpdating = updating === feature.name;

              return (
                <div
                  key={feature.name}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor={feature.name} className="text-sm font-medium">
                        {feature.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpdating && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    <Switch
                      id={feature.name}
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleFeature(feature.name, checked)}
                      disabled={isUpdating}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
