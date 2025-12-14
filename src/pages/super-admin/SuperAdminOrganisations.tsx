import { useEffect, useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Search, MoreHorizontal, Eye, Power, Trash2, Loader2, Building2, 
  CheckCircle, XCircle, Clock, Users, Calendar as CalendarIcon 
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
}

interface OrganizationDetails extends Organization {
  wikiPageCount: number;
  calendarEventCount: number;
  employeeCount: number;
  lastActivityDate: string | null;
}

const SuperAdminOrganisations = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);
  
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

          return {
            ...org,
            userCount: count || 0,
            primaryAdmin,
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

  const fetchOrgDetails = async (org: Organization) => {
    try {
      const { count: wikiCount } = await supabase
        .from('wiki_pages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      const { count: calendarCount } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      const { data: lastUpdate } = await supabase
        .from('updates')
        .select('created_at')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSelectedOrg({
        ...org,
        wikiPageCount: wikiCount || 0,
        calendarEventCount: calendarCount || 0,
        employeeCount: empCount || 0,
        lastActivityDate: lastUpdate?.created_at || null,
      });
      setDetailsOpen(true);
    } catch (error) {
      console.error('Error fetching org details:', error);
      toast.error('Failed to load organization details');
    }
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
                    onViewDetails={fetchOrgDetails}
                    onToggleStatus={toggleOrgStatus}
                    onDelete={(org) => { setOrgToDelete(org); setDeleteDialogOpen(true); }}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    getStatusBadge={getStatusBadge}
                  />
                </TabsContent>
                <TabsContent value="pending" className="mt-4">
                  <PendingOrganizationsTable 
                    organizations={filterOrganizations(organizations, 'pending')}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    onViewDetails={fetchOrgDetails}
                  />
                </TabsContent>
                <TabsContent value="active" className="mt-4">
                  <OrganizationsTable 
                    organizations={filterOrganizations(organizations, 'active')}
                    onViewDetails={fetchOrgDetails}
                    onToggleStatus={toggleOrgStatus}
                    onDelete={(org) => { setOrgToDelete(org); setDeleteDialogOpen(true); }}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    getStatusBadge={getStatusBadge}
                  />
                </TabsContent>
                <TabsContent value="inactive" className="mt-4">
                  <OrganizationsTable 
                    organizations={filterOrganizations(organizations, 'inactive')}
                    onViewDetails={fetchOrgDetails}
                    onToggleStatus={toggleOrgStatus}
                    onDelete={(org) => { setOrgToDelete(org); setDeleteDialogOpen(true); }}
                    onReview={(org) => { setOrgToReview(org); setReviewDialogOpen(true); }}
                    getStatusBadge={getStatusBadge}
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
                Review the details below and approve or reject this organisation.
              </DialogDescription>
            </DialogHeader>
            
            {orgToReview && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Organisation</p>
                    <p className="font-medium">{orgToReview.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <code className="text-sm bg-muted px-2 py-0.5 rounded">{orgToReview.slug}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">{orgToReview.owner_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{orgToReview.owner_email || 'N/A'}</p>
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
                  <div>
                    <p className="text-sm text-muted-foreground">Requested</p>
                    <p className="font-medium">{formatDistanceToNow(new Date(orgToReview.created_at), { addSuffix: true })}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason (required for rejection)</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setReviewDialogOpen(false)}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Sheet */}
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {selectedOrg?.logo_url ? (
                  <img
                    src={selectedOrg.logo_url}
                    alt={selectedOrg.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                )}
                {selectedOrg?.name}
              </SheetTitle>
            </SheetHeader>
            {selectedOrg && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {selectedOrg.slug}
                    </code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedOrg)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium capitalize">{selectedOrg.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Billing</p>
                    <p className="font-medium capitalize">{selectedOrg.billing_cycle || 'monthly'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p className="font-medium">{selectedOrg.owner_name || selectedOrg.primaryAdmin}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-sm">{selectedOrg.owner_email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company Size</p>
                    <p className="font-medium">{selectedOrg.company_size || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{selectedOrg.industry || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {format(new Date(selectedOrg.created_at), "dd MMM yyyy")}
                    </p>
                  </div>
                  {selectedOrg.trial_ends_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Trial Ends</p>
                      <p className="font-medium">
                        {format(new Date(selectedOrg.trial_ends_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Usage Statistics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold">{selectedOrg.userCount}</p>
                        <p className="text-sm text-muted-foreground">Users</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold">{selectedOrg.employeeCount}</p>
                        <p className="text-sm text-muted-foreground">Employees</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold">{selectedOrg.wikiPageCount}</p>
                        <p className="text-sm text-muted-foreground">Wiki Pages</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <p className="text-2xl font-bold">{selectedOrg.calendarEventCount}</p>
                        <p className="text-sm text-muted-foreground">Calendar Events</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {selectedOrg.lastActivityDate && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground">Last Activity</p>
                    <p className="font-medium">
                      {format(new Date(selectedOrg.lastActivityDate), "dd MMM yyyy 'at' HH:mm")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>

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

// Standard organizations table
interface OrganizationsTableProps {
  organizations: Organization[];
  onViewDetails: (org: Organization) => void;
  onToggleStatus: (org: Organization) => void;
  onDelete: (org: Organization) => void;
  onReview: (org: Organization) => void;
  getStatusBadge: (org: Organization) => JSX.Element;
}

const OrganizationsTable = ({ 
  organizations, 
  onViewDetails, 
  onToggleStatus, 
  onDelete,
  onReview,
  getStatusBadge 
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
      {organizations.map((org) => (
        <TableRow key={org.id}>
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
          <TableCell>{getStatusBadge(org)}</TableCell>
          <TableCell className="capitalize">{org.plan}</TableCell>
          <TableCell>{org.userCount}</TableCell>
          <TableCell className="max-w-[150px] truncate">{org.primaryAdmin}</TableCell>
          <TableCell>
            {format(new Date(org.created_at), "dd MMM yyyy")}
          </TableCell>
          <TableCell>
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
      ))}
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
}

const PendingOrganizationsTable = ({ organizations, onReview, onViewDetails }: PendingOrganizationsTableProps) => (
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
      {organizations.map((org) => (
        <TableRow key={org.id}>
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
            <Badge variant="outline" className="capitalize">
              {org.plan} ({org.billing_cycle || 'monthly'})
            </Badge>
          </TableCell>
          <TableCell>{org.company_size || 'N/A'}</TableCell>
          <TableCell>{org.industry || 'N/A'}</TableCell>
          <TableCell>{formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}</TableCell>
          <TableCell>
            <div className="flex gap-1">
              <Button size="sm" onClick={() => onReview(org)}>
                Review
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onViewDetails(org)}>
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
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
