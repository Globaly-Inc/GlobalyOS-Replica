import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { EmployeeCard } from "@/components/EmployeeCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Building2, Settings, Upload, LayoutGrid, Users, ArrowUpRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { ManageOfficesDialog } from "@/components/dialogs/ManageOfficesDialog";
import { InviteTeamMemberDialog } from "@/components/dialogs/InviteTeamMemberDialog";
import { cn } from "@/lib/utils";

type StatusFilter = 'all' | 'active' | 'invited' | 'inactive';
type ViewMode = 'cards' | 'orgchart';

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

// Department color palette for org chart view
const DEPARTMENT_COLORS = [
  { bg: "hsl(221, 83%, 53%)", light: "hsl(221, 83%, 96%)", border: "hsl(221, 83%, 80%)" },
  { bg: "hsl(142, 71%, 45%)", light: "hsl(142, 71%, 96%)", border: "hsl(142, 71%, 80%)" },
  { bg: "hsl(262, 83%, 58%)", light: "hsl(262, 83%, 96%)", border: "hsl(262, 83%, 85%)" },
  { bg: "hsl(25, 95%, 53%)", light: "hsl(25, 95%, 96%)", border: "hsl(25, 95%, 80%)" },
  { bg: "hsl(340, 82%, 52%)", light: "hsl(340, 82%, 96%)", border: "hsl(340, 82%, 85%)" },
  { bg: "hsl(187, 85%, 43%)", light: "hsl(187, 85%, 96%)", border: "hsl(187, 85%, 80%)" },
  { bg: "hsl(47, 96%, 53%)", light: "hsl(47, 96%, 94%)", border: "hsl(47, 96%, 70%)" },
  { bg: "hsl(0, 84%, 60%)", light: "hsl(0, 84%, 96%)", border: "hsl(0, 84%, 85%)" },
];

interface TreeNode extends Employee {
  children: TreeNode[];
  isExternalManager?: boolean;
}

const Team = () => {
  // Team directory page component
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [officesDialogOpen, setOfficesDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
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
    
    // Use employee_directory view for secure, non-sensitive data access
    // This view only exposes non-sensitive fields and respects org membership
    const { data: employeeData } = await supabase
      .from("employee_directory")
      .select("*")
      .eq("organization_id", currentOrg.id)
      .order("created_at", { ascending: false });

    if (employeeData) {
      // Transform view data to match Employee interface
      const transformedEmployees = employeeData.map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        position: e.position,
        department: e.department,
        join_date: e.join_date,
        phone: null, // Not exposed in directory view for privacy
        city: e.city,
        country: e.country,
        manager_id: e.manager_id,
        status: e.status,
        office_id: e.office_id,
        profiles: {
          full_name: e.full_name,
          email: e.email,
          avatar_url: e.avatar_url,
        },
        offices: e.office_name ? { name: e.office_name } : null,
      }));
      
      setEmployees(transformedEmployees as Employee[]);
      
      // Fetch user roles for all employees
      const userIds = employeeData.map((e: any) => e.user_id);
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

  // Org chart helper functions
  const departmentColorMap = useMemo(() => {
    const uniqueDepts = [...new Set(filteredEmployees.map(e => e.department || "Unassigned"))].sort();
    const map = new Map<string, typeof DEPARTMENT_COLORS[0]>();
    uniqueDepts.forEach((dept, index) => {
      map.set(dept, DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]);
    });
    return map;
  }, [filteredEmployees]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    filteredEmployees.forEach(emp => map.set(emp.id, emp));
    return map;
  }, [filteredEmployees]);

  const groupByDepartment = (emps: Employee[]): Map<string, Employee[]> => {
    const departments = new Map<string, Employee[]>();
    emps.forEach((emp) => {
      const dept = emp.department || "Unassigned";
      if (!departments.has(dept)) departments.set(dept, []);
      departments.get(dept)!.push(emp);
    });
    return departments;
  };

  const buildDepartmentTree = (deptEmployees: Employee[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    const deptIds = new Set(deptEmployees.map(e => e.id));

    deptEmployees.forEach((emp) => {
      map.set(emp.id, { ...emp, children: [] });
    });

    deptEmployees.forEach((emp) => {
      if (emp.manager_id && !deptIds.has(emp.manager_id)) {
        const externalManager = employeeMap.get(emp.manager_id);
        if (externalManager && !map.has(emp.manager_id)) {
          map.set(emp.manager_id, { ...externalManager, children: [], isExternalManager: true });
        }
      }
    });

    deptEmployees.forEach((emp) => {
      const node = map.get(emp.id)!;
      if (emp.manager_id && map.has(emp.manager_id)) {
        map.get(emp.manager_id)!.children.push(node);
      } else if (!emp.manager_id) {
        roots.push(node);
      } else {
        const externalManager = map.get(emp.manager_id);
        if (externalManager) {
          externalManager.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });

    map.forEach((node) => {
      if (node.isExternalManager) roots.unshift(node);
    });

    return roots;
  };

  const getGridSpan = (count: number, index: number): string => {
    if (count > 8) return "md:col-span-2";
    if (index === 0 && count > 4) return "md:col-span-2 lg:col-span-1";
    return "";
  };

  const departments = groupByDepartment(filteredEmployees);
  const sortedDepartments = Array.from(departments.entries()).sort((a, b) => {
    if (a[0].toLowerCase() === 'management') return -1;
    if (b[0].toLowerCase() === 'management') return 1;
    return a[0].localeCompare(b[0]);
  });

  // Org chart sub-components
  const OrgEmployeeCard = ({ employee, departmentColor }: { employee: TreeNode; departmentColor: typeof DEPARTMENT_COLORS[0] }) => {
    const isExternal = employee.isExternalManager;
    const empDeptColor = departmentColorMap.get(employee.department || "Unassigned") || DEPARTMENT_COLORS[0];
    
    return (
      <Card
        onClick={() => navigate(`/team/${employee.id}`)}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] max-w-[200px] rounded-xl",
          isExternal && "border-dashed"
        )}
        style={{
          borderColor: isExternal ? empDeptColor.border : undefined,
          backgroundColor: isExternal ? empDeptColor.light : undefined,
        }}
      >
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 flex-shrink-0" style={{ borderWidth: 2, borderStyle: 'solid', borderColor: empDeptColor.bg }}>
              <AvatarImage src={employee.profiles.avatar_url || undefined} />
              <AvatarFallback style={{ background: empDeptColor.bg }} className="text-white text-[10px]">
                {employee.profiles.full_name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="text-xs font-medium text-foreground truncate">{employee.profiles.full_name}</h3>
                {isExternal && <ArrowUpRight className="h-3 w-3 flex-shrink-0" style={{ color: empDeptColor.bg }} />}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{employee.position}</p>
              {isExternal && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 mt-0.5" style={{ borderColor: empDeptColor.bg, color: empDeptColor.bg }}>
                  {employee.department}
                </Badge>
              )}
            </div>
            {employee.children.length > 0 && !isExternal && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                <Users className="h-3 w-3" /><span>{employee.children.length}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const OrgEmployeeTree = ({ employee, level = 0, departmentColor }: { employee: TreeNode; level?: number; departmentColor: typeof DEPARTMENT_COLORS[0] }) => {
    const hasChildren = employee.children.length > 0;
    return (
      <div className="relative">
        <OrgEmployeeCard employee={employee} departmentColor={departmentColor} />
        {hasChildren && (
          <div className="ml-3 mt-2 pl-5 space-y-2">
            {employee.children.map((child, index) => {
              const isLastChild = index === employee.children.length - 1;
              return (
                <div key={child.id} className="relative">
                  <div className="absolute w-0.5 rounded-full" style={{ backgroundColor: departmentColor.bg, left: '-20px', top: index === 0 ? '-8px' : '-12px', height: index === 0 ? '24px' : '28px' }} />
                  {!isLastChild && <div className="absolute w-0.5 rounded-full" style={{ backgroundColor: departmentColor.bg, left: '-20px', top: '16px', bottom: '-12px' }} />}
                  <div className="absolute top-4 h-0.5 rounded-full" style={{ backgroundColor: departmentColor.bg, width: '16px', left: '-16px' }} />
                  <div className="absolute w-2 h-2 rounded-full border-2" style={{ borderColor: departmentColor.bg, backgroundColor: 'white', left: '-22px', top: '12px' }} />
                  <OrgEmployeeTree employee={child} level={level + 1} departmentColor={departmentColor} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Team Directory" 
          subtitle={`Meet our amazing team of ${employees.length} members`}
        >
          {isHR && (
            <>
              <Button variant="outline" onClick={() => setOfficesDialogOpen(true)} className="gap-2">
                <Settings className="h-4 w-4" />
                Manage Offices
              </Button>
              <Button variant="outline" onClick={() => navigate('/team/bulk-import')} className="gap-2">
                <Upload className="h-4 w-4" />
                Bulk Import
              </Button>
              <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Team Member
              </Button>
            </>
          )}
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="gap-1.5 h-8"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'orgchart' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('orgchart')}
              className="gap-1.5 h-8"
            >
              <Building2 className="h-4 w-4" />
              Org Chart
            </Button>
          </div>

          {/* Status Filter - only in cards view */}
          {viewMode === 'cards' && (
            (isAdmin || isHR) ? (
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
            ) : (
              <Tabs value="active" className="w-full sm:w-auto">
                <TabsList className="sm:w-auto sm:inline-flex">
                  <TabsTrigger value="active" className="gap-1.5">
                    Active <span className="text-xs text-muted-foreground">({statusCounts.active})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )
          )}

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
          <div className="relative min-h-[200px]">
            {/* Cards View */}
            <div 
              className={cn(
                "transition-all duration-300 ease-in-out",
                viewMode === 'cards' 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 -translate-y-4 absolute inset-0 pointer-events-none"
              )}
            >
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
            </div>

            {/* Org Chart View */}
            <div 
              className={cn(
                "transition-all duration-300 ease-in-out",
                viewMode === 'orgchart' 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-4 absolute inset-0 pointer-events-none"
              )}
            >
              {filteredEmployees.length === 0 ? (
                <Card className="p-12 text-center rounded-2xl">
                  <p className="text-muted-foreground">
                    {searchQuery ? `No results found for "${searchQuery}"` : "No employees found."}
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-min">
                  {sortedDepartments.map(([department, deptEmployees], index) => {
                    const tree = buildDepartmentTree(deptEmployees);
                    const deptColor = departmentColorMap.get(department) || DEPARTMENT_COLORS[0];
                    const gridSpan = getGridSpan(deptEmployees.length, index);
                    
                    return (
                      <Card 
                        key={department} 
                        className={cn(
                          "overflow-hidden rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300",
                          gridSpan
                        )}
                        style={{ 
                          borderColor: deptColor.border,
                          background: `linear-gradient(135deg, ${deptColor.light} 0%, hsl(0, 0%, 100%) 100%)`
                        }}
                      >
                        <div 
                          className="px-4 py-3 border-b flex items-center gap-3 relative overflow-hidden"
                          style={{ backgroundColor: deptColor.light, borderBottomColor: deptColor.border }}
                        >
                          <div 
                            className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-30"
                            style={{ background: `radial-gradient(circle, ${deptColor.bg} 0%, transparent 70%)` }}
                          />
                          <div className="p-2 rounded-xl" style={{ backgroundColor: deptColor.bg }}>
                            <Building2 className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm" style={{ color: deptColor.bg }}>{department}</h3>
                            <p className="text-[10px] text-muted-foreground">{deptEmployees.length} team members</p>
                          </div>
                          <Badge 
                            className="text-xs px-2.5 py-1 text-white rounded-full font-medium"
                            style={{ backgroundColor: deptColor.bg }}
                          >
                            {deptEmployees.length}
                          </Badge>
                        </div>
                        
                        <div className="p-4 space-y-4">
                          {tree.map((root) => (
                            <OrgEmployeeTree key={root.id} employee={root} departmentColor={deptColor} />
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ManageOfficesDialog
        open={officesDialogOpen}
        onOpenChange={setOfficesDialogOpen}
        onOfficesChange={loadEmployees}
      />

      <InviteTeamMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={loadEmployees}
      />
    </Layout>
  );
};

export default Team;
