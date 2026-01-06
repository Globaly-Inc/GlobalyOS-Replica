import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Building2,
  Users,
  BarChart3,
  CreditCard,
  Settings,
  Calendar,
  FileText,
  MessageSquare,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { OrgBillingTab } from "@/components/super-admin/OrgBillingTab";
import { OrgMembersTab } from "@/components/super-admin/OrgMembersTab";
import { OrgUsageTab } from "@/components/super-admin/OrgUsageTab";
import { OrganizationFeaturesManager } from "@/components/super-admin/OrganizationFeaturesManager";

export default function SuperAdminOrganisationDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch organization details
  const { data: org, isLoading } = useQuery({
    queryKey: ["super-admin-org-detail", orgId],
    queryFn: async () => {
      if (!orgId) throw new Error("Organization ID is required");
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch subscription
  const { data: subscription } = useQuery({
    queryKey: ["org-subscription-overview", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("organization_id", orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch quick stats
  const { data: stats } = useQuery({
    queryKey: ["org-quick-stats", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      
      const [members, employees, wikiPages, chatSpaces, events] = await Promise.all([
        supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("wiki_pages").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("chat_spaces").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);

      return {
        members: members.count || 0,
        employees: employees.count || 0,
        wikiPages: wikiPages.count || 0,
        chatSpaces: chatSpaces.count || 0,
        events: events.count || 0,
      };
    },
    enabled: !!orgId,
  });

  const getStatusBadge = () => {
    const status = org?.approval_status || "approved";
    
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3" />
            Pending Approval
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case "approved":
        if (org?.plan === "inactive") {
          return (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Inactive
            </Badge>
          );
        }
        return (
          <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-600">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!org) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Organization not found</p>
          <Link to="/super-admin/organisations">
            <Button variant="link" className="mt-4">
              Back to Organizations
            </Button>
          </Link>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb + Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/super-admin/organisations" className="hover:text-foreground">
            Organisations
          </Link>
          <span>/</span>
          <span className="text-foreground">{org.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={org.logo_url || undefined} />
              <AvatarFallback className="text-xl bg-primary/10">
                {org.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{org.name}</h1>
                {getStatusBadge()}
              </div>
              <p className="text-muted-foreground">
                {org.slug} • Created {formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Link to="/super-admin/organisations">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats?.members || 0}</p>
                  <p className="text-xs text-muted-foreground">Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats?.employees || 0}</p>
                  <p className="text-xs text-muted-foreground">Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats?.wikiPages || 0}</p>
                  <p className="text-xs text-muted-foreground">Wiki Pages</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats?.chatSpaces || 0}</p>
                  <p className="text-xs text-muted-foreground">Chat Spaces</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Calendar className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats?.events || 0}</p>
                  <p className="text-xs text-muted-foreground">Events</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{org.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Slug</p>
                      <p className="font-medium font-mono">{org.slug}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Owner</p>
                      <p className="font-medium">{org.owner_name || org.owner_email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{org.industry || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Company Size</p>
                      <p className="font-medium">{org.company_size || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{format(new Date(org.created_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscription ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="font-medium capitalize">{subscription.plan}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                          {subscription.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Billing Cycle</p>
                        <p className="font-medium capitalize">{subscription.billing_cycle}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Period End</p>
                        <p className="font-medium">
                          {subscription.current_period_end
                            ? format(new Date(subscription.current_period_end), "MMM d, yyyy")
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No subscription found</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <OrgMembersTab organizationId={orgId!} />
          </TabsContent>

          <TabsContent value="usage" className="mt-6">
            <OrgUsageTab organizationId={orgId!} />
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <OrgBillingTab organizationId={orgId!} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
              </CardHeader>
              <CardContent>
                <OrganizationFeaturesManager organizationId={orgId!} organizationName={org.name} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
}
