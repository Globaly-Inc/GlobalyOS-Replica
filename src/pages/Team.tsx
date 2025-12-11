import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { EmployeeCard } from "@/components/EmployeeCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Building2, Settings, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { ManageOfficesDialog } from "@/components/dialogs/ManageOfficesDialog";
import { BulkImportDialog } from "@/components/dialogs/BulkImportDialog";

type StatusFilter = 'all' | 'active' | 'invited' | 'inactive';

interface Employee {
  id: string;
  user_id: string;
  position: string;
  department: string;
  join_date: string;
  phone: string | null;
  city: string | null;
  country: string | null;
  manager_id: string | null;
  status: 'invited' | 'active' | 'inactive';
  office_id: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  offices: {
    name: string;
  } | null;
}

interface UserRole {
  user_id: string;
  role: string;
}

const Team = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [officesDialogOpen, setOfficesDialogOpen] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const { isAdmin, isHR } = useUserRole();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentOrg) {
      loadEmployees();
    }
  }, [currentOrg?.id]);

  const loadEmployees = async () => {
    if (!currentOrg) return;
    setLoading(true);
    
    // Fetch employees with office data
    const { data: employeeData } = await supabase
      .from("employees")
      .select(`
        id,
        user_id,
        position,
        department,
        join_date,
        phone,
        city,
        country,
        manager_id,
        status,
        office_id,
        profiles!inner(
          full_name,
          email,
          avatar_url
        ),
        offices(
          name
        )
      `)
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false });

    if (employeeData) {
      setEmployees(employeeData as Employee[]);
      
      // Fetch user roles for all employees
      const userIds = employeeData.map(e => e.user_id);
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("organization_id", currentOrg.id)
        .in("user_id", userIds);
      
      if (rolesData) {
        const rolesMap: Record<string, string> = {};
        rolesData.forEach((r: UserRole) => {
          rolesMap[r.user_id] = r.role;
        });
        setUserRoles(rolesMap);
      }
    }
    
    setLoading(false);
  };

  // Compute office employee counts (only active employees)
  const officeEmployeeCounts = employees
    .filter(e => e.status === 'active' && e.office_id)
    .reduce((acc, e) => {
      if (e.office_id) {
        acc[e.office_id] = (acc[e.office_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

  const getStatusCounts = () => {
    return {
      all: employees.length,
      active: employees.filter(e => e.status === 'active').length,
      invited: employees.filter(e => e.status === 'invited').length,
      inactive: employees.filter(e => e.status === 'inactive').length,
    };
  };

  const statusCounts = getStatusCounts();

  const filteredEmployees = employees
    .filter((employee) => statusFilter === 'all' || employee.status === statusFilter)
    .filter((employee) =>
      employee.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.offices?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Team Directory" 
          subtitle={`Meet our amazing team of ${employees.length} members`}
        >
          <Button variant="outline" onClick={() => navigate('/org-chart')} className="gap-2">
            <Building2 className="h-4 w-4" />
            Org Chart
          </Button>
          {isHR && (
            <>
              <Button variant="outline" onClick={() => setOfficesDialogOpen(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Manage Offices
              </Button>
              <Button variant="outline" onClick={() => setBulkImportDialogOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" />
                Bulk Import
              </Button>
              <Button onClick={() => navigate('/team/invite')} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite Team Member
              </Button>
            </>
          )}
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
              <TabsTrigger value="all" className="gap-1.5">
                All <span className="text-xs text-muted-foreground">({statusCounts.all})</span>
              </TabsTrigger>
              <TabsTrigger value="active" className="gap-1.5">
                Active <span className="text-xs text-muted-foreground">({statusCounts.active})</span>
              </TabsTrigger>
              <TabsTrigger value="invited" className="gap-1.5">
                Invited <span className="text-xs text-muted-foreground">({statusCounts.invited})</span>
              </TabsTrigger>
              <TabsTrigger value="inactive" className="gap-1.5">
                Inactive <span className="text-xs text-muted-foreground">({statusCounts.inactive})</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, position, department, or office..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading team members...</p>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredEmployees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={{
                    id: employee.id,
                    name: employee.profiles.full_name,
                    email: employee.profiles.email,
                    position: employee.position,
                    department: employee.department,
                    joinDate: employee.join_date,
                    phone: employee.phone || undefined,
                    city: employee.city || undefined,
                    country: employee.country || undefined,
                    avatar: employee.profiles.avatar_url || undefined,
                    status: employee.status,
                    officeName: employee.offices?.name,
                    officeEmployeeCount: employee.office_id ? officeEmployeeCounts[employee.office_id] : undefined,
                  }}
                  showResendInvite={isHR}
                  role={userRoles[employee.user_id]}
                />
              ))}
            </div>

            {filteredEmployees.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
                <p className="text-muted-foreground">No employees found matching your search.</p>
              </div>
            )}
          </>
        )}
      </div>

      <ManageOfficesDialog
        open={officesDialogOpen}
        onOpenChange={setOfficesDialogOpen}
        onOfficesChange={loadEmployees}
      />

      <BulkImportDialog
        open={bulkImportDialogOpen}
        onOpenChange={setBulkImportDialogOpen}
        onSuccess={loadEmployees}
      />
    </Layout>
  );
};

export default Team;
