import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Flag, MessageSquare, CheckSquare, Briefcase, GitBranch, Wallet, Bot, UserPlus, MessageCircle, Phone, Inbox, FileText, Calculator, Users } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AVAILABLE_FEATURES = [
  { name: "chat", label: "Team Chat", description: "Real-time messaging", icon: MessageSquare },
  { name: "tasks", label: "Tasks", description: "Task management", icon: CheckSquare },
  { name: "crm", label: "CRM", description: "Customer relationship management", icon: Briefcase },
  { name: "workflows", label: "Workflows", description: "Onboarding & offboarding", icon: GitBranch },
  { name: "payroll", label: "Payroll", description: "Salary & payslips", icon: Wallet },
  { name: "ask-ai", label: "Ask AI", description: "AI-powered assistant", icon: Bot },
  { name: "hiring", label: "Hiring", description: "Recruitment & tracking", icon: UserPlus },
  { name: "whatsapp", label: "WhatsApp", description: "WhatsApp messaging", icon: MessageCircle },
  { name: "calls", label: "Calls", description: "Voice & video calls", icon: Phone },
  { name: "omnichannel_inbox", label: "Inbox", description: "Omni-channel inbox", icon: Inbox },
  { name: "ai_responder", label: "AI Responder", description: "AI auto-replies", icon: Bot },
  { name: "telephony", label: "Telephony", description: "SMS & calls via Twilio", icon: Phone },
  { name: "forms", label: "Forms", description: "Form builder", icon: FileText },
  { name: "accounting", label: "Accounting", description: "Ledgers & invoicing", icon: Calculator },
  { name: "client_portal", label: "Client Portal", description: "Client self-service", icon: Users },
];

interface OrgRow {
  id: string;
  name: string;
  features: Record<string, boolean>;
}

const SuperAdminFeatures = () => {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [orgsRes, featuresRes] = await Promise.all([
        supabase.from("organizations").select("id, name").order("name"),
        supabase.from("organization_features").select("organization_id, feature_name, is_enabled"),
      ]);

      if (orgsRes.error) throw orgsRes.error;
      if (featuresRes.error) throw featuresRes.error;

      const featureMap: Record<string, Record<string, boolean>> = {};
      featuresRes.data?.forEach((f) => {
        if (!featureMap[f.organization_id]) featureMap[f.organization_id] = {};
        featureMap[f.organization_id][f.feature_name] = f.is_enabled;
      });

      const rows: OrgRow[] = (orgsRes.data || []).map((org) => ({
        id: org.id,
        name: org.name,
        features: featureMap[org.id] || {},
      }));

      setOrgs(rows);
    } catch (err) {
      console.error("Error fetching features data:", err);
      toast.error("Failed to load features data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleFeature = async (orgId: string, featureName: string, enabled: boolean) => {
    const key = `${orgId}:${featureName}`;
    setUpdating(key);
    try {
      const { error } = await supabase
        .from("organization_features")
        .upsert(
          {
            organization_id: orgId,
            feature_name: featureName,
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,feature_name" }
        );

      if (error) throw error;

      setOrgs((prev) =>
        prev.map((org) =>
          org.id === orgId
            ? { ...org, features: { ...org.features, [featureName]: enabled } }
            : org
        )
      );
    } catch (error) {
      console.error("Error toggling feature:", error);
      toast.error("Failed to update feature");
    } finally {
      setUpdating(null);
    }
  };

  const bulkToggleFeature = async (featureName: string, enabled: boolean) => {
    setUpdating(`bulk:${featureName}`);
    try {
      const upserts = orgs.map((org) => ({
        organization_id: org.id,
        feature_name: featureName,
        is_enabled: enabled,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("organization_features")
        .upsert(upserts, { onConflict: "organization_id,feature_name" });

      if (error) throw error;

      setOrgs((prev) =>
        prev.map((org) => ({
          ...org,
          features: { ...org.features, [featureName]: enabled },
        }))
      );
      toast.success(`${featureName} ${enabled ? "enabled" : "disabled"} for all organizations`);
    } catch (error) {
      console.error("Error bulk toggling:", error);
      toast.error("Failed to bulk update feature");
    } finally {
      setUpdating(null);
    }
  };

  // Compute counts per feature
  const featureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    AVAILABLE_FEATURES.forEach((f) => {
      counts[f.name] = orgs.filter((org) => org.features[f.name]).length;
    });
    return counts;
  }, [orgs]);

  const filteredOrgs = useMemo(
    () => orgs.filter((org) => org.name.toLowerCase().includes(search.toLowerCase())),
    [orgs, search]
  );

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Features</h1>
          <p className="text-sm text-muted-foreground">
            Control feature access and visibility across all organizations
          </p>
        </div>

        {/* Feature Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3">
          {AVAILABLE_FEATURES.map((feature) => {
            const Icon = feature.icon;
            const count = featureCounts[feature.name];
            return (
              <Card key={feature.name} className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium truncate">{feature.label}</span>
                </div>
                <p className="text-lg font-bold text-foreground">
                  {count}
                  <span className="text-xs font-normal text-muted-foreground">/{orgs.length}</span>
                </p>
              </Card>
            );
          })}
        </div>

        {/* Organization Feature Matrix */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flag className="h-5 w-5" />
                Organization Feature Matrix
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px] sticky left-0 bg-card z-20">Organization</TableHead>
                    {AVAILABLE_FEATURES.map((f) => (
                      <TableHead key={f.name} className="text-center min-w-[90px]">
                        <div className="flex flex-col items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-[11px] leading-tight cursor-help">{f.label}</span>
                            </TooltipTrigger>
                            <TooltipContent>{f.description}</TooltipContent>
                          </Tooltip>
                          <div className="flex gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-[10px]"
                              disabled={updating === `bulk:${f.name}`}
                              onClick={() => bulkToggleFeature(f.name, true)}
                            >
                              All
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1 text-[10px]"
                              disabled={updating === `bulk:${f.name}`}
                              onClick={() => bulkToggleFeature(f.name, false)}
                            >
                              None
                            </Button>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium sticky left-0 bg-card">
                        {org.name}
                      </TableCell>
                      {AVAILABLE_FEATURES.map((f) => {
                        const key = `${org.id}:${f.name}`;
                        const isEnabled = org.features[f.name] ?? false;
                        return (
                          <TableCell key={f.name} className="text-center">
                            {updating === key ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(checked) => toggleFeature(org.id, f.name, checked)}
                                disabled={updating?.startsWith("bulk:")}
                                className="mx-auto"
                              />
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={AVAILABLE_FEATURES.length + 1} className="text-center py-8 text-muted-foreground">
                        No organizations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminFeatures;
