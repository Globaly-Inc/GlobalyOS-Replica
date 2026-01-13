import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, MoreHorizontal, Eye, Power, Trash2, Loader2, Building2, 
  CheckCircle, XCircle, Clock, Users, Calendar as CalendarIcon,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  logo_url: string | null;
  approval_status: string | null;
  owner_email: string | null;
  owner_name: string | null;
  company_size: string | null;
  industry: string | null;
  billing_cycle: string | null;
  trial_ends_at: string | null;
  userCount?: number;
  primaryAdmin?: string;
  subscriptionPlan?: string; // from subscriptions table
  subscriptionStatus?: string;
}

interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
}

const SuperAdminOrganisations = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [validPlans, setValidPlans] = useState<Map<string, string>>(new Map());
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [orgToReview, setOrgToReview] = useState<Organization | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      // Fetch subscription plans for validation
      const { data: plans } = await supabase
        .from('subscription_plans')
        .select('id, slug, name');
      
      const planMap = new Map<string, string>(
        (plans || []).map((p: SubscriptionPlan) => [p.slug, p.name])
      );
      setValidPlans(planMap);

      // Fetch all subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('organization_id, plan, status');
      
      const subMap = new Map(
        (subscriptions || []).map((s: { organization_id: string; plan: string; status: string }) => 
          [s.organization_id, { plan: s.plan, status: s.status }]
        )
      );

      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Get user counts for each org
      const orgsWithCounts = await Promise.all(
        (orgs || []).map(async (org) => {
          const { count } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          // Get primary admin (owner)
          const { data: adminData } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', org.id)
            .eq('role', 'owner')
            .limit(1)
            .maybeSingle();

          let primaryAdmin = org.owner_name || org.owner_email || 'N/A';
          if (adminData) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', adminData.user_id)
              .maybeSingle();
            primaryAdmin = profile?.full_name || profile?.email || primaryAdmin;
          }

          // Get subscription data
          const subscription = subMap.get(org.id);

          return {
            ...org,
            userCount: count || 0,
            primaryAdmin,
            subscriptionPlan: subscription?.plan,
            subscriptionStatus: subscription?.status,
          };
        })
      );

      setOrganizations(orgsWithCounts);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (org: Organization) => {
    navigate(`/super-admin/organisations/${org.id}`);
  };

  const toggleOrgStatus = async (org: Organization) => {
    const newPlan = org.plan === 'inactive' ? 'free' : 'inactive';
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ plan: newPlan })
        .eq('id', org.id);

      if (error) throw error;

      toast.success(`Organization ${newPlan === 'inactive' ? 'deactivated' : 'activated'}`);
      fetchOrganizations();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization status');
    }
  };

  const handleDeleteOrg = async () => {
    if (!orgToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-organization', {
        body: { organizationId: orgToDelete.id },
      });

      if (error) throw error;

      toast.success('Organization deleted successfully');
      setDeleteDialogOpen(false);
      setOrgToDelete(null);
      fetchOrganizations();
    } catch (error) {
      console.error('Error deleting organization:', error);
      toast.error('Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async () => {
    if (!orgToReview) return;

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('approve-organization', {
        body: { organizationId: orgToReview.id },
      });

      if (error) throw error;

      toast.success('Organization approved successfully');
      setReviewDialogOpen(false);
      setOrgToReview(null);
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error approving organization:', error);
      toast.error(error.message || 'Failed to approve organization');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!orgToReview || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('reject-organization', {
        body: { 
          organizationId: orgToReview.id,
          reason: rejectionReason.trim(),
        },
      });

      if (error) throw error;

      toast.success('Organization rejected');
      setReviewDialogOpen(false);
      setOrgToReview(null);
      setRejectionReason("");
      fetchOrganizations();
    } catch (error: any) {
      console.error('Error rejecting organization:', error);
      toast.error(error.message || 'Failed to reject organization');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (org: Organization) => {
    const status = org.approval_status || 'approved';
    
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'approved':
        if (org.plan === 'inactive') {
          return <Badge variant="secondary">Inactive</Badge>;
        }
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filterOrganizations = (orgs: Organization[], tab: string) => {
    let filtered = orgs.filter((org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.owner_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    switch (tab) {
      case 'pending':
        return filtered.filter(org => org.approval_status === 'pending');
      case 'active':
        return filtered.filter(org => org.approval_status === 'approved' && org.plan !== 'inactive');
      case 'inactive':
        return filtered.filter(org => org.plan === 'inactive' || org.approval_status === 'rejected');
      default:
        return filtered;
    }
  };

  const pendingCount = organizations.filter(org => org.approval_status === 'pending').length;
  const activeCount = organizations.filter(org => org.approval_status === 'approved' && org.plan !== 'inactive').length;
  const inactiveCount = organizations.filter(org => org.plan === 'inactive' || org.approval_status === 'rejected').length;

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <SuperAdminPageHeader 
          title="Organisations" 
          description="Manage all tenant organisations" 
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{organizations.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inactiveCount}</p>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending" className="relative">
                      Pending
                      {pendingCount > 0 && (
                        <span className="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                          {pendingCount}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="active">Active</TabsTrigger>
                    <TabsTrigger value="inactive">Inactive</TabsTrigger>
                  </TabsList>
                  <div className="relative w-full sm:w-auto sm:min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, code, or owner..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <TabsContent value="all" className="mt-4">
                  <OrganizationsTable 
                    organizations={filterOrganizations(organizations, 'all')}
                    onViewDetails={handleViewDetails}
                    onToggleStatus={toggleOrgStatus}
                    onDelete={(org) => { setOrgToDelete(org); setDeleteDialogOpen(true); }}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    getStatusBadge={getStatusBadge}
                    validPlans={validPlans}
                  />
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                  <PendingOrganizationsTable 
                    organizations={filterOrganizations(organizations, 'pending')}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    onViewDetails={handleViewDetails}
                    validPlans={validPlans}
                  />
                </TabsContent>
                <TabsContent value="active" className="mt-4">
                  <OrganizationsTable 
                    organizations={filterOrganizations(organizations, 'active')}
                    onViewDetails={handleViewDetails}
                    onToggleStatus={toggleOrgStatus}
                    onDelete={(org) => { setOrgToDelete(org); setDeleteDialogOpen(true); }}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    getStatusBadge={getStatusBadge}
                    validPlans={validPlans}
                  />
                </TabsContent>
                <TabsContent value="inactive" className="mt-4">
                  <OrganizationsTable 
                    organizations={filterOrganizations(organizations, 'inactive')}
                    onViewDetails={handleViewDetails}
                    onToggleStatus={toggleOrgStatus}
                    onDelete={(org) => { setOrgToDelete(org); setDeleteDialogOpen(true); }}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    getStatusBadge={getStatusBadge}
                    validPlans={validPlans}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </CardHeader>
        </Card>

        {/* Review Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={(open) => {
          setReviewDialogOpen(open);
          if (!open) {
            setRejectionReason("");
            setOrgToReview(null);
          }
        }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Organisation Application</DialogTitle>
              <DialogDescription>
                Review the application details and approve or reject this organisation.
              </DialogDescription>
            </DialogHeader>
            
            {orgToReview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Organisation</p>
                    <p className="font-medium">{orgToReview.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">{orgToReview.owner_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{orgToReview.owner_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium capitalize">{orgToReview.plan} ({orgToReview.billing_cycle || 'monthly'})</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company Size</p>
                    <p className="font-medium">{orgToReview.company_size || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{orgToReview.industry || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason (required for rejection)</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Explain why this application is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Organisation</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to delete <strong>{orgToDelete?.name}</strong>?
                </p>
                <p className="text-destructive font-medium">
                  This action cannot be undone. All organisation data (employees, 
                  wiki pages, calendar events, attendance records, etc.) will be 
                  permanently deleted.
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
};

// Helper to get plan display info
const getPlanDisplay = (org: Organization, validPlans: Map<string, string>) => {
  // Prefer subscription plan over organization plan
  const planSlug = org.subscriptionPlan || org.plan;
  const planName = validPlans.get(planSlug);
  const isSynced = !org.subscriptionPlan || org.plan === org.subscriptionPlan;
  
  return {
    displayName: planName || planSlug,
    isValid: !!planName,
    isSynced,
    slug: planSlug,
  };
};

// Standard organizations table
interface OrganizationsTableProps {
  organizations: Organization[];
  onViewDetails: (org: Organization) => void;
  onToggleStatus: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  onReview: (org: Organization) => void;
  getStatusBadge: (org: Organization) => JSX.Element;
  validPlans: Map<string, string>;
}

const OrganizationsTable = ({ 
  organizations, 
  onViewDetails, 
  onToggleStatus, 
  onDelete,
  onReview,
  getStatusBadge,
  validPlans,
}: OrganizationsTableProps) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Organisation</TableHead>
        <TableHead>Code</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Plan</TableHead>
        <TableHead>Users</TableHead>
        <TableHead>Owner</TableHead>
        <TableHead>Created</TableHead>
        <TableHead className="w-12"></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {organizations.map((org) => {
        const planInfo = getPlanDisplay(org, validPlans);
        return (
          <TableRow 
            key={org.id} 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onViewDetails(org)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                )}
                <span className="font-medium">{org.name}</span>
              </div>
            </TableCell>
            <TableCell>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {org.slug}
              </code>
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>{getStatusBadge(org)}</TableCell>
            <TableCell>
              <span className={!planInfo.isValid ? 'text-amber-600' : ''}>
                {planInfo.displayName}
                {!planInfo.isValid && <span className="text-xs ml-1">(invalid)</span>}
                {planInfo.isValid && !planInfo.isSynced && <span className="text-xs text-amber-500 ml-1">(out of sync)</span>}
              </span>
            </TableCell>
          <TableCell>{org.userCount}</TableCell>
          <TableCell className="max-w-[150px] truncate">{org.primaryAdmin}</TableCell>
          <TableCell>
            {format(new Date(org.created_at), "dd MMM yyyy")}
          </TableCell>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onViewDetails(org)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {org.approval_status === 'pending' && (
                  <DropdownMenuItem onClick={() => onReview(org)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Review
                  </DropdownMenuItem>
                )}
                {org.approval_status !== 'pending' && (
                  <DropdownMenuItem onClick={() => onToggleStatus(org)}>
                    <Power className="h-4 w-4 mr-2" />
                    {org.plan === "inactive" ? "Activate" : "Deactivate"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(org)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
        );
      })}
      {organizations.length === 0 && (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
            No organisations found
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

// Pending organizations table with different columns
interface PendingOrganizationsTableProps {
  organizations: Organization[];
  onReview: (org: Organization) => void;
  onViewDetails: (org: Organization) => void;
  validPlans: Map<string, string>;
}

const PendingOrganizationsTable = ({ organizations, onReview, onViewDetails, validPlans }: PendingOrganizationsTableProps) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Organisation</TableHead>
        <TableHead>Owner</TableHead>
        <TableHead>Email</TableHead>
        <TableHead>Plan</TableHead>
        <TableHead>Size</TableHead>
        <TableHead>Industry</TableHead>
        <TableHead>Requested</TableHead>
        <TableHead className="w-24">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {organizations.map((org) => {
        const planInfo = getPlanDisplay(org, validPlans);
        return (
          <TableRow 
            key={org.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onViewDetails(org)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded bg-amber-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <span className="font-medium">{org.name}</span>
                  <p className="text-xs text-muted-foreground">{org.slug}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>{org.owner_name || 'N/A'}</TableCell>
            <TableCell className="max-w-[180px] truncate">{org.owner_email || 'N/A'}</TableCell>
            <TableCell>
              <Badge variant="outline" className={!planInfo.isValid ? 'border-amber-300 bg-amber-50' : ''}>
                {planInfo.displayName} ({org.billing_cycle || 'monthly'})
                {!planInfo.isValid && <span className="text-xs ml-1">(invalid)</span>}
              </Badge>
            </TableCell>
          <TableCell>{org.company_size || 'N/A'}</TableCell>
          <TableCell>{org.industry || 'N/A'}</TableCell>
          <TableCell>{formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}</TableCell>
          <TableCell onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => onReview(org)}>
                Review
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onViewDetails(org)}>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        );
      })}
      {organizations.length === 0 && (
        <TableRow>
          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
              <p>No pending applications</p>
            </div>
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

export default SuperAdminOrganisations;
