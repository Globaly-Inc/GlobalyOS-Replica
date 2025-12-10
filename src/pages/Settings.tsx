import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, CreditCard, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { PageHeader } from "@/components/PageHeader";

const Settings = () => {
  const { toast } = useToast();
  const { currentOrg, orgRole, refreshOrganizations } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [memberCount, setMemberCount] = useState(0);

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
            <CardContent className="space-y-4">
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
