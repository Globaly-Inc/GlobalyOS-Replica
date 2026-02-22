import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ArrowLeft, Shield, Users, CreditCard, FileText, Save, Upload, Download, Eye, File, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useFeatureRegistry, type FeatureEntry } from "@/hooks/useFeatureRegistry";
import { DocumentPreviewDialog } from "@/components/dialogs/DocumentPreviewDialog";
import { useRelativeTime } from "@/hooks/useRelativeTime";

interface PrdDocument {
  id: string;
  feature_name: string;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  generated_at: string;
  created_by: string | null;
  created_at: string;
}

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
  const [prdDocuments, setPrdDocuments] = useState<PrdDocument[]>([]);
  const [prdLoading, setPrdLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ file_name: string; file_path: string; file_type: string | null } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getShortRelativeTime } = useRelativeTime();

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

  // Fetch PRD documents
  useEffect(() => {
    if (!featureName) return;
    const fetchPrds = async () => {
      setPrdLoading(true);
      try {
        const { data, error } = await supabase
          .from("feature_prd_documents")
          .select("*")
          .eq("feature_name", featureName)
          .order("generated_at", { ascending: false });
        if (error) throw error;
        setPrdDocuments((data as PrdDocument[]) || []);
      } catch (err) {
        console.error("Error loading PRDs:", err);
      } finally {
        setPrdLoading(false);
      }
    };
    fetchPrds();
  }, [featureName]);

  const handleUploadPrd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !featureName) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are allowed");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileId = crypto.randomUUID();
      const filePath = `${featureName}/${fileId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("feature-prd-documents")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("feature_prd_documents")
        .insert({
          feature_name: featureName,
          title: file.name.replace(/\.pdf$/i, ""),
          file_path: filePath,
          file_name: file.name,
          generated_at: new Date().toISOString(),
          created_by: user?.id || null,
        });
      if (insertError) throw insertError;

      const { data } = await supabase
        .from("feature_prd_documents")
        .select("*")
        .eq("feature_name", featureName)
        .order("generated_at", { ascending: false });
      setPrdDocuments((data as PrdDocument[]) || []);
      toast.success("PRD uploaded successfully");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload PRD");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadPrd = async (prd: PrdDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from("feature-prd-documents")
        .download(prd.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = prd.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download PRD");
    }
  };

  const handleDeletePrd = async (prd: PrdDocument) => {
    try {
      await supabase.storage.from("feature-prd-documents").remove([prd.file_path]);
      const { error } = await supabase.from("feature_prd_documents").delete().eq("id", prd.id);
      if (error) throw error;
      setPrdDocuments((prev) => prev.filter((d) => d.id !== prd.id));
      toast.success("PRD deleted");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete PRD");
    }
  };

  const handlePreviewPrd = (prd: PrdDocument) => {
    setPreviewDoc({
      file_name: prd.file_name,
      file_path: prd.file_path,
      file_type: "application/pdf",
    });
    setPreviewOpen(true);
  };

  const handleGeneratePrd = async () => {
    if (!featureName || !feature) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-feature-prd", {
        body: {
          featureName: feature.name,
          featureLabel: feature.label,
          featureDescription: feature.description,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Refresh PRD list
      const { data: prds } = await supabase
        .from("feature_prd_documents")
        .select("*")
        .eq("feature_name", featureName)
        .order("generated_at", { ascending: false });
      setPrdDocuments((prds as PrdDocument[]) || []);
      toast.success("PRD generated successfully!");
    } catch (err: any) {
      console.error("PRD generation error:", err);
      toast.error(err.message || "Failed to generate PRD");
    } finally {
      setGenerating(false);
    }
  };

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
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">
                  <Shield className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="organizations">
                  <Users className="h-4 w-4" />
                  Organizations
                </TabsTrigger>
                <TabsTrigger value="prd">
                  <FileText className="h-4 w-4" />
                  PRD Documents
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
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
              </TabsContent>

              {/* Organizations Tab */}
              <TabsContent value="organizations">
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
              </TabsContent>

              {/* PRD Documents Tab */}
              <TabsContent value="prd">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <FileText className="h-4 w-4" />
                          PRD Documents
                        </CardTitle>
                        <CardDescription>AI-generated Product Requirements Documents</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={generating}
                          onClick={handleGeneratePrd}
                        >
                          {generating ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                          )}
                          {generating ? "Generating..." : "AI Generate PRD"}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleUploadPrd}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload PRD
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {prdLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : prdDocuments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <File className="h-10 w-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No PRD documents yet</p>
                        <p className="text-xs mt-1">Generate one with AI or upload a PDF</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto">
                        {prdDocuments.map((prd) => (
                          <div key={prd.id} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
                                <FileText className="h-4 w-4 text-destructive" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{prd.title}</p>
                                {prd.description && (
                                  <p className="text-xs text-muted-foreground truncate">{prd.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {getShortRelativeTime(prd.generated_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreviewPrd(prd)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPrd(prd)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePrd(prd)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
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

      <DocumentPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        bucket="feature-prd-documents"
      />
    </SuperAdminLayout>
  );
};

export default SuperAdminFeatureDetail;
