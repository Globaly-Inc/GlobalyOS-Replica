import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  MapPin,
  Mail,
  Phone,
  Briefcase,
  Power,
  Trash2,
  Edit,
  ExternalLink,
  Activity,
  FolderKanban,
  CalendarOff,
  ClipboardCheck,
} from "lucide-react";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import { OrgBillingTab } from "@/components/super-admin/OrgBillingTab";
import { OrgMembersTab } from "@/components/super-admin/OrgMembersTab";
import { OrgUsageTab } from "@/components/super-admin/OrgUsageTab";
import { OrgOfficesTab } from "@/components/super-admin/OrgOfficesTab";
import { OrgActivityTab } from "@/components/super-admin/OrgActivityTab";
import { OrganizationFeaturesManager } from "@/components/super-admin/OrganizationFeaturesManager";
import { EditOrganizationDialog } from "@/components/super-admin/EditOrganizationDialog";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function SuperAdminOrganisationDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const { logActivity } = useAdminActivityLog();

  // Fetch organization details
  const { data: org, isLoading, refetch } = useQuery({
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

      const [employees, wikiPages, chatSpaces, events, offices, projects, leaveRequests, attendanceRecords] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("wiki_pages").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("chat_spaces").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("calendar_events").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("offices").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
        supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      ]);

      return {
        users: employees.count || 0,
        wikiPages: wikiPages.count || 0,
        chatSpaces: chatSpaces.count || 0,
        events: events.count || 0,
        offices: offices.count || 0,
        projects: projects.count || 0,
        leaveRequests: leaveRequests.count || 0,
        attendanceRecords: attendanceRecords.count || 0,
      };
    },
    enabled: !!orgId,
  });

  const toggleOrgStatus = async () => {
    if (!org) return;
    const newPlan = org.plan === "inactive" ? "free" : "inactive";
    const actionType = newPlan === "inactive" ? "org_deactivated" : "org_activated";
    setToggling(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ plan: newPlan })
        .eq("id", org.id);

      if (error) throw error;

      await logActivity({
        organizationId: org.id,
        actionType: actionType as 'org_activated' | 'org_deactivated',
        entityType: 'organization',
        entityId: org.id,
        changes: { plan: { from: org.plan, to: newPlan } }
      });

      toast.success(`Organization ${newPlan === "inactive" ? "deactivated" : "activated"}`);
      refetch();
    } catch (error) {
      console.error("Error updating organization:", error);
      toast.error("Failed to update organization status");
    } finally {
      setToggling(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!org) return;

    setDeleting(true);
    try {
      await logActivity({
        organizationId: org.id,
        actionType: 'org_deleted',
        entityType: 'organization',
        entityId: org.id,
        metadata: { organizationName: org.name, organizationSlug: org.slug }
      });

      const { error } = await supabase.functions.invoke("delete-organization", {
        body: { organizationId: org.id },
      });

      if (error) throw error;

      toast.success("Organization deleted successfully");
      navigate("/super-admin/organisations");
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error("Failed to delete organization");
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusBadge = () => {
    const status = org?.approval_status || "approved";

    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1.5 bg-amber-50 text-amber-700 border-amber-200 px-3 py-1">
            <Clock className="h-3.5 w-3.5" />
            Pending Approval
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1.5 px-3 py-1">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </Badge>
        );
      case "approved":
        if (org?.plan === "inactive") {
          return (
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <XCircle className="h-3.5 w-3.5" />
              Inactive
            </Badge>
          );
        }
        return (
          <Badge className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 px-3 py-1">
            <CheckCircle className="h-3.5 w-3.5" />
            Active
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = () => {
    if (!subscription) return null;
    const statusColors: Record<string, string> = {
      active: "bg-emerald-100 text-emerald-700 border-emerald-200",
      trialing: "bg-blue-100 text-blue-700 border-blue-200",
      past_due: "bg-amber-100 text-amber-700 border-amber-200",
      canceled: "bg-red-100 text-red-700 border-red-200",
      incomplete: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return (
      <Badge variant="outline" className={statusColors[subscription.status] || ""}>
        {subscription.status}
      </Badge>
    );
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
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">Organization not found</p>
          <Link to="/super-admin/organisations">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Organizations
            </Button>
          </Link>
        </div>
      </SuperAdminLayout>
    );
  }

  const statsConfig = [
    { key: "users", label: "Users", icon: Users, color: "bg-primary/10 text-primary" },
    { key: "offices", label: "Offices", icon: MapPin, color: "bg-orange-100 text-orange-600" },
    { key: "wikiPages", label: "Wiki Pages", icon: FileText, color: "bg-emerald-100 text-emerald-600" },
    { key: "chatSpaces", label: "Chat Spaces", icon: MessageSquare, color: "bg-purple-100 text-purple-600" },
    { key: "events", label: "Events", icon: Calendar, color: "bg-amber-100 text-amber-600" },
    { key: "projects", label: "Projects", icon: FolderKanban, color: "bg-cyan-100 text-cyan-600" },
    { key: "leaveRequests", label: "Leave Requests", icon: CalendarOff, color: "bg-rose-100 text-rose-600" },
    { key: "attendanceRecords", label: "Attendance", icon: ClipboardCheck, color: "bg-indigo-100 text-indigo-600" },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/super-admin">Super Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/super-admin/organisations">Organisations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{org.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Logo + Info */}
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 rounded-xl border-2 border-border">
                  <AvatarImage src={org.logo_url || undefined} className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10 rounded-xl">
                    {org.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold">{org.name}</h1>
                    {getStatusBadge()}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">{org.slug}</code>
                    </div>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Created {formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}</span>
                    {org.trial_ends_at && new Date(org.trial_ends_at) > new Date() && (
                      <>
                        <Separator orientation="vertical" className="h-4" />
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Trial ends {format(new Date(org.trial_ends_at), "dd MMM yyyy")}
                        </Badge>
                      </>
                    )}
                  </div>
                  {org.owner_email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{org.owner_name || org.owner_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditDialogOpen(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleOrgStatus}
                  disabled={toggling}
                  className="gap-2"
                >
                  {toggling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  {org.plan === "inactive" ? "Activate" : "Deactivate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                {org.approval_status === "pending" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate("/super-admin/organisations?tab=pending")}
                    className="gap-2"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Review
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {statsConfig.map((stat) => {
            const Icon = stat.icon;
            const value = stats?.[stat.key as keyof typeof stats] || 0;
            return (
              <Card
                key={stat.key}
                className="cursor-pointer hover:shadow-md transition-all hover:border-primary/20"
                onClick={() => {
                  if (stat.key === "users") setActiveTab("users");
                  else if (stat.key === "offices") setActiveTab("offices");
                  else setActiveTab("plan-usage");
                }}
              >
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-0">
                <TabsTrigger
                  value="overview"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Building2 className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="users"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger
                  value="offices"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <MapPin className="h-4 w-4" />
                  Offices
                </TabsTrigger>
                <TabsTrigger
                  value="plan-usage"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <BarChart3 className="h-4 w-4" />
                  Plan & Usage
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <CreditCard className="h-4 w-4" />
                  Billing
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                >
                  <Activity className="h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              <TabsContent value="overview" className="mt-0">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Organization Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Organization Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm text-muted-foreground">Name</dt>
                          <dd className="font-medium">{org.name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Slug</dt>
                          <dd className="font-medium font-mono text-sm">{org.slug}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Owner</dt>
                          <dd className="font-medium">{org.owner_name || org.owner_email || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Industry</dt>
                          <dd className="font-medium">{org.industry || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Company Size</dt>
                          <dd className="font-medium">{org.company_size || "-"}</dd>
                        </div>
                        <div>
                          <dt className="text-sm text-muted-foreground">Created</dt>
                          <dd className="font-medium">{format(new Date(org.created_at), "dd MMM yyyy")}</dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Subscription Summary */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Subscription</CardTitle>
                        {getSubscriptionBadge()}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {subscription ? (
                        <dl className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm text-muted-foreground">Plan</dt>
                            <dd className="font-medium capitalize">{subscription.plan}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Billing Cycle</dt>
                            <dd className="font-medium capitalize">{subscription.billing_cycle}</dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Period Start</dt>
                            <dd className="font-medium">
                              {subscription.current_period_start
                                ? format(new Date(subscription.current_period_start), "dd MMM yyyy")
                                : "-"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm text-muted-foreground">Period End</dt>
                            <dd className="font-medium">
                              {subscription.current_period_end
                                ? format(new Date(subscription.current_period_end), "dd MMM yyyy")
                                : "-"}
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <div className="text-center py-6">
                          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground">No subscription found</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Contact Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                <dl className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Owner Name</dt>
                      <dd className="font-medium">{org.owner_name || "-"}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Owner Email</dt>
                      <dd className="font-medium">{org.owner_email || "-"}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Owner Phone</dt>
                      <dd className="font-medium">{org.owner_phone || "-"}</dd>
                    </div>
                  </div>
                </dl>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => setActiveTab("billing")}
                      >
                        <CreditCard className="h-4 w-4" />
                        View Billing History
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => setActiveTab("plan-usage")}
                      >
                        <BarChart3 className="h-4 w-4" />
                        View Usage Statistics
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => setActiveTab("settings")}
                      >
                        <Settings className="h-4 w-4" />
                        Manage Feature Flags
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="mt-0">
                <OrgMembersTab organizationId={orgId!} />
              </TabsContent>

              <TabsContent value="offices" className="mt-0">
                <OrgOfficesTab organizationId={orgId!} />
              </TabsContent>

              <TabsContent value="plan-usage" className="mt-0">
                <OrgUsageTab organizationId={orgId!} />
              </TabsContent>

              <TabsContent value="billing" className="mt-0">
                <OrgBillingTab organizationId={orgId!} organizationCode={org?.name?.substring(0, 4)} />
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Feature Flags</CardTitle>
                      <CardDescription>
                        Enable or disable specific features for this organization
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <OrganizationFeaturesManager organizationId={orgId!} organizationName={org.name} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0">
                <OrgActivityTab organizationId={orgId!} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Edit Organization Dialog */}
        <EditOrganizationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          organization={org}
          onSave={() => refetch()}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Organisation</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to delete <strong>{org.name}</strong>?
                </p>
                <p className="text-destructive font-medium">
                  This action cannot be undone. All organisation data (employees, wiki pages, calendar events, attendance
                  records, etc.) will be permanently deleted.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteOrg}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SuperAdminLayout>
  );
}
