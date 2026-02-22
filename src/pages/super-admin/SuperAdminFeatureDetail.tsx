import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ArrowLeft, Shield, Users, CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";
import { MASTER_FEATURE_REGISTRY } from "@/constants/features";

interface OrgAccess {
  id: string;
  name: string;
  enabled: boolean;
}

const SUBSCRIPTION_TIERS = ["Free", "Starter", "Professional", "Enterprise"];

const SuperAdminFeatureDetail = () => {
  const { featureName } = useParams<{ featureName: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<OrgAccess[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const feature = MASTER_FEATURE_REGISTRY.find((f) => f.name === featureName);

  useEffect(() => {
    if (!feature) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [orgsRes, featuresRes] = await Promise.all([
          supabase.from("organizations").select("id, name").order("name"),
          feature.category === "flagged"
            ? supabase.from("organization_features").select("organization_id, is_enabled").eq("feature_name", featureName!)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (orgsRes.error) throw orgsRes.error;
        if (featuresRes.error) throw featuresRes.error;

        const enabledMap: Record<string, boolean> = {};
        (featuresRes.data || []).forEach((f: any) => {
          enabledMap[f.organization_id] = f.is_enabled;
        });

        setOrgs(
          (orgsRes.data || []).map((org) => ({
            id: org.id,
            name: org.name,
            enabled: feature.category === "core" ? true : (enabledMap[org.id] ?? false),
          }))
        );
      } catch (err) {
        console.error("Error loading feature detail:", err);
        toast.error("Failed to load feature details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [featureName, feature]);

  const toggleOrg = async (orgId: string, enabled: boolean) => {
    setUpdating(orgId);
    try {
      const { error } = await supabase
        .from("organization_features")
        .upsert(
          {
            organization_id: orgId,
            feature_name: featureName!,
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,feature_name" }
        );

      if (error) throw error;

      setOrgs((prev) =>
        prev.map((org) => (org.id === orgId ? { ...org, enabled } : org))
      );
    } catch (error) {
      console.error("Error toggling:", error);
      toast.error("Failed to update");
    } finally {
      setUpdating(null);
    }
  };

  const bulkToggle = async (enabled: boolean) => {
    setUpdating("bulk");
    try {
      const upserts = orgs.map((org) => ({
        organization_id: org.id,
        feature_name: featureName!,
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("organization_features")
        .upsert(upserts, { onConflict: "organization_id,feature_name" });

      if (error) throw error;

      setOrgs((prev) => prev.map((org) => ({ ...org, enabled })));
      toast.success(`${enabled ? "Enabled" : "Disabled"} for all organizations`);
    } catch (error) {
      console.error("Error bulk toggling:", error);
      toast.error("Failed to bulk update");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!feature) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Feature not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/super-admin/features")}>
            Back to Features
          </Button>
        </div>
      </SuperAdminLayout>
    );
  }

  const Icon = feature.icon;
  const isCore = feature.category === "core";
  const enabledCount = orgs.filter((o) => o.enabled).length;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Back + Header */}
        <div>
          <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate("/super-admin/features")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Features
          </Button>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{feature.label}</h1>
                <Badge variant={isCore ? "secondary" : "default"}>
                  {isCore ? "Core" : "Flagged"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Overview + Org Access */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{enabledCount}</p>
                    <p className="text-xs text-muted-foreground">Orgs Enabled</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{orgs.length}</p>
                    <p className="text-xs text-muted-foreground">Total Orgs</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">
                      {orgs.length > 0 ? Math.round((enabledCount / orgs.length) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">Adoption</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Organization Access */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" />
                      Organization Access
                    </CardTitle>
                    <CardDescription>
                      {isCore
                        ? "Core features are always enabled for all organizations"
                        : "Toggle feature access per organization"}
                    </CardDescription>
                  </div>
                  {!isCore && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updating === "bulk"}
                        onClick={() => bulkToggle(true)}
                      >
                        Enable All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updating === "bulk"}
                        onClick={() => bulkToggle(false)}
                      >
                        Disable All
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {orgs.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">{org.name}</span>
                      {isCore ? (
                        <Badge variant="secondary" className="text-[10px]">Always On</Badge>
                      ) : updating === org.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <Switch
                          checked={org.enabled}
                          onCheckedChange={(checked) => toggleOrg(org.id, checked)}
                          disabled={updating === "bulk"}
                        />
                      )}
                    </div>
                  ))}
                  {orgs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No organizations found</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Subscription + Notes */}
          <div className="space-y-6">
            {/* Subscription Tiers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Subscription Tiers
                </CardTitle>
                <CardDescription>
                  Assign which plans include this feature
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SUBSCRIPTION_TIERS.map((tier) => (
                    <div
                      key={tier}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">{tier}</span>
                      <Switch
                        checked={isCore || selectedTiers.includes(tier)}
                        disabled={isCore}
                        onCheckedChange={(checked) => {
                          setSelectedTiers((prev) =>
                            checked ? [...prev, tier] : prev.filter((t) => t !== tier)
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
                {isCore && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Core features are included in all plans.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Release Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Internal Notes
                </CardTitle>
                <CardDescription>
                  Notes about this feature (internal only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add internal notes, release changelog, or configuration details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminFeatureDetail;
