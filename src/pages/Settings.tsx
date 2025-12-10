import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Users, CreditCard, Save, Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader } from "@/components/PageHeader";

const Settings = () => {
  const { toast } = useToast();
  const { currentOrg, orgRole, refreshOrganizations } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
      loadMemberCount();
    }
  }, [currentOrg]);

  const loadMemberCount = async () => {
    if (!currentOrg) return;
    const { count } = await supabase
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", currentOrg.id);
    setMemberCount(count || 0);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentOrg) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `org-logos/${currentOrg.id}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update organization with logo URL
      const { error: updateError } = await supabase
        .from("organizations")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", currentOrg.id);

      if (updateError) throw updateError;

      await refreshOrganizations();
      toast({
        title: "Logo uploaded",
        description: "Organization logo has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSaveOrg = async () => {
    if (!currentOrg || !orgName.trim()) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ name: orgName.trim() })
        .eq("id", currentOrg.id);

      if (error) throw error;

      await refreshOrganizations();
      toast({
        title: "Settings saved",
        description: "Organization name has been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPlanBadgeClass = (plan: string) => {
    switch (plan) {
      case "pro":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "enterprise":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
    }
  };

  const isOwner = orgRole === "owner";

  return (
    <Layout>
      <PageHeader
        title="Settings"
        subtitle="Manage your organization settings and preferences"
      />

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Manage your organization's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload Section */}
              <div className="space-y-3">
                <Label>Organization Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 rounded-lg">
                    <AvatarImage src={currentOrg?.logo_url || ""} alt={currentOrg?.name} className="object-cover" />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-lg font-semibold">
                      {currentOrg?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwner && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="gap-2"
                      >
                        {uploadingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {uploadingLogo ? "Uploading..." : "Upload Logo"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">
                        Square image recommended. Max 2MB.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={!isOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization ID</Label>
                  <Input value={currentOrg?.slug || ""} disabled className="font-mono text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {memberCount} team member{memberCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <Badge className={getPlanBadgeClass(currentOrg?.plan || "free")}>
                  {currentOrg?.plan?.toUpperCase() || "FREE"} Plan
                </Badge>
              </div>

              {isOwner && (
                <div className="pt-4">
                  <Button onClick={handleSaveOrg} disabled={loading} className="gap-2">
                    <Save className="h-4 w-4" />
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}

              {!isOwner && (
                <p className="text-sm text-muted-foreground pt-4">
                  Only organization owners can edit these settings.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Plan
              </CardTitle>
              <CardDescription>
                Manage your organization's subscription and billing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {currentOrg?.plan === "free" ? "Free" : currentOrg?.plan?.charAt(0).toUpperCase() + currentOrg?.plan?.slice(1)} Plan
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {currentOrg?.plan === "free" 
                        ? "Limited to 10 team members" 
                        : "Unlimited team members"}
                    </p>
                  </div>
                  <Badge className={getPlanBadgeClass(currentOrg?.plan || "free")}>
                    Current Plan
                  </Badge>
                </div>

                {currentOrg?.plan === "free" && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-4">
                      Upgrade to Pro for unlimited team members, advanced analytics, and more.
                    </p>
                    <Button variant="default">
                      Upgrade to Pro
                    </Button>
                  </div>
                )}

                {currentOrg?.plan !== "free" && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      To manage your subscription, contact your account administrator.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Settings;
