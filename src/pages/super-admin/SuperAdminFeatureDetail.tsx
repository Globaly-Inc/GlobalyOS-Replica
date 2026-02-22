import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Shield, Users, CreditCard, FileText, Save } from "lucide-react";
import { toast } from "sonner";
import { useFeatureRegistry, type FeatureEntry } from "@/hooks/useFeatureRegistry";

interface OrgAccess {
  id: string;
  name: string;
  enabled: boolean;
}

const SUBSCRIPTION_TIERS = ["Free", "Starter", "Professional", "Enterprise"];

const SuperAdminFeatureDetail = () => {
  const { featureName } = useParams<{ featureName: string }>();
  const navigate = useNavigate();
  const { features, loading: registryLoading, refetch } = useFeatureRegistry();
  const [orgs, setOrgs] = useState<OrgAccess[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState<"core" | "flagged">("flagged");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const feature = features.find((f) => f.name === featureName);

  // Sync local state when feature loads
  useEffect(() => {
    if (feature) {
      setSelectedTiers(feature.subscription_tiers);
      setNotes(feature.internal_notes);
      setCategory(feature.category);
      setDirty(false);
    }
  }, [feature?.id]);

  useEffect(() => {
    if (!featureName || registryLoading) return;

    const fetchOrgs = async () => {
      try {
        const [orgsRes, featuresRes] = await Promise.all([
          supabase.from("organizations").select("id, name").order("name"),
          supabase.from("organization_features").select("organization_id, is_enabled").eq("feature_name", featureName),
        ]);

        if (orgsRes.error) throw orgsRes.error;
        if (featuresRes.error) throw featuresRes.error;

        const enabledMap: Record<string, boolean> = {};
        (featuresRes.data || []).forEach((f) => {
          enabledMap[f.organization_id] = f.is_enabled;
        });

        setOrgs(
          (orgsRes.data || []).map((org) => ({
            id: org.id,
            name: org.name,
            enabled: enabledMap[org.id] ?? false,
          }))
        );
      } catch (err) {
        console.error("Error loading feature detail:", err);
        toast.error("Failed to load feature details");
      } finally {
        setDataLoading(false);
      }
    };

    fetchOrgs();
  }, [featureName, registryLoading]);

  const saveSettings = async () => {
    if (!feature) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("feature_registry")
        .update({
          category,
          subscription_tiers: selectedTiers,
          internal_notes: notes,
        })
        .eq("id", feature.id);

      if (error) throw error;

      // If changed to core, enable for all orgs automatically
      if (category === "core" && feature.category === "flagged") {
        const upserts = orgs.map((org) => ({
          organization_id: org.id,
          feature_name: featureName!,
          is_enabled: true,
          updated_at: new Date().toISOString(),
        }));
        await supabase
          .from("organization_features")
          .upsert(upserts, { onConflict: "organization_id,feature_name" });
        setOrgs((prev) => prev.map((o) => ({ ...o, enabled: true })));
      }

      await refetch();
      setDirty(false);
      toast.success("Feature settings saved");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

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
      setOrgs((prev) => prev.map((org) => (org.id === orgId ? { ...org, enabled } : org)));
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

  const loading = registryLoading || dataLoading;

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
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{feature.label}</h1>
                  <Badge variant={category === "core" ? "secondary" : "default"}>
                    {category === "core" ? "Core" : "Flagged"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
              </div>
            </div>
            {dirty && (
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
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
                      {category === "core"
                        ? "Core features are enabled for all organizations. Change to Flagged to control per-org."
                        : "Toggle feature access per organization"}
                    </CardDescription>
                  </div>
                  {category === "flagged" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={updating === "bulk"} onClick={() => bulkToggle(true)}>
                        Enable All
                      </Button>
                      <Button variant="outline" size="sm" disabled={updating === "bulk"} onClick={() => bulkToggle(false)}>
                        Disable All
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {orgs.map((org) => (
                    <div key={org.id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm font-medium">{org.name}</span>
                      {category === "core" ? (
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Feature Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feature Type</CardTitle>
                <CardDescription>
                  Core = always on for all orgs. Flagged = per-org control.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={category}
                  onValueChange={(val: "core" | "flagged") => {
                    setCategory(val);
                    setDirty(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core (Always On)</SelectItem>
                    <SelectItem value="flagged">Flagged (Per-Org Control)</SelectItem>
                  </SelectContent>
                </Select>
                {category !== feature.category && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    {category === "core"
                      ? "⚠ Changing to Core will enable this feature for all organizations."
                      : "⚠ Changing to Flagged will allow per-org control. Current org access will be preserved."}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Subscription Tiers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Subscription Tiers
                </CardTitle>
                <CardDescription>Assign which plans include this feature</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {SUBSCRIPTION_TIERS.map((tier) => (
                    <div key={tier} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm font-medium">{tier}</span>
                      <Switch
                        checked={selectedTiers.includes(tier)}
                        onCheckedChange={(checked) => {
                          setSelectedTiers((prev) =>
                            checked ? [...prev, tier] : prev.filter((t) => t !== tier)
                          );
                          setDirty(true);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Internal Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Internal Notes
                </CardTitle>
                <CardDescription>Notes about this feature (internal only)</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add internal notes, release changelog, or configuration details..."
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setDirty(true);
                  }}
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
