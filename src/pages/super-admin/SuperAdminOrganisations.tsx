import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, MoreHorizontal, Eye, Power, Trash2, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  logo_url: string | null;
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<OrganizationDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);

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

          let primaryAdmin = 'N/A';
          if (adminData) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', adminData.user_id)
              .maybeSingle();
            primaryAdmin = profile?.full_name || profile?.email || 'N/A';
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
      // Fetch wiki pages count
      const { count: wikiCount } = await supabase
        .from('wiki_pages')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      // Fetch calendar events count
      const { count: calendarCount } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      // Fetch employee count
      const { count: empCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      // Get last activity (most recent update in any table)
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

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && org.plan !== "inactive") ||
      (statusFilter === "inactive" && org.plan === "inactive");
    return matchesSearch && matchesStatus;
  });

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
        <div>
          <h2 className="text-2xl font-bold text-foreground">Organisations</h2>
          <p className="text-muted-foreground">
            Manage all tenant organisations
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Primary Admin</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.map((org) => (
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
                    <TableCell>
                      <Badge
                        variant={org.plan === "inactive" ? "secondary" : "default"}
                      >
                        {org.plan === "inactive" ? "Inactive" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{org.userCount}</TableCell>
                    <TableCell>{org.primaryAdmin}</TableCell>
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
                          <DropdownMenuItem onClick={() => fetchOrgDetails(org)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleOrgStatus(org)}>
                            <Power className="h-4 w-4 mr-2" />
                            {org.plan === "inactive" ? "Activate" : "Deactivate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setOrgToDelete(org);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No organisations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                    <Badge
                      variant={selectedOrg.plan === "inactive" ? "secondary" : "default"}
                    >
                      {selectedOrg.plan === "inactive" ? "Inactive" : "Active"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium capitalize">{selectedOrg.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">
                      {format(new Date(selectedOrg.created_at), "dd MMM yyyy")}
                    </p>
                  </div>
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
                <p>
                  User accounts will be preserved but removed from this organisation.
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
                  "Delete Organisation"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminOrganisations;
