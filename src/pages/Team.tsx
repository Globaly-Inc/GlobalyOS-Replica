import { PageHeader } from '@/components/PageHeader';
import { EmployeeCard } from "@/components/EmployeeCard";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Building2, Settings, Upload, LayoutGrid, Users, ArrowUpRight, UserCog, Wifi, WifiOff, X, Filter } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { useTeamFilters } from "@/hooks/useTeamFilters";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { InviteTeamMemberDialog } from "@/components/dialogs/InviteTeamMemberDialog";
import { QuickInviteDialog } from "@/components/dialogs/QuickInviteDialog";
import { RecoverOrphanedUsersDialog } from "@/components/dialogs/RecoverOrphanedUsersDialog";
import { cn } from "@/lib/utils";

type StatusFilter = 'all' | 'active' | 'invited' | 'inactive';
type OnlineFilter = 'all' | 'online' | 'offline';
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
  work_location?: 'office' | 'hybrid' | 'remote' | null;
  is_new_hire?: boolean;
  employee_onboarding_completed?: boolean;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  offices: {
    name: string;
  } | null;
}

interface Office {
  id: string;
  name: string;
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
  const {
    statusFilter, setStatusFilter,
    onlineFilter, setOnlineFilter,
    officeFilter, setOfficeFilter,
    viewMode, setViewMode,
    clearFilters: clearAllFilters,
  } = useTeamFilters();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [quickInviteDialogOpen, setQuickInviteDialogOpen] = useState(false);
  const [recoverDialogOpen, setRecoverDialogOpen] = useState(false);
  const { isOwner, isAdmin, isHR } = useUserRole();
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();

  useEffect(() => {
    if (currentOrg) {
      loadEmployees();
    }
  }, [currentOrg?.id]);

  // Fetch online statuses for employees
  const fetchOnlineStatuses = async (employeeIds: string[]) => {
    if (!employeeIds.length) return;
    
    const { data: presences } = await supabase
      .from('chat_presence')
      .select('employee_id, is_online, last_seen_at')
      .in('employee_id', employeeIds);
    
    if (presences) {
      const now = new Date();
      const statusMap: Record<string, boolean> = {};
      presences.forEach((p: any) => {
        if (p.is_online && p.last_seen_at) {
          const lastSeen = new Date(p.last_seen_at);
          const isStale = (now.getTime() - lastSeen.getTime()) > 60000; // 60 seconds
          statusMap[p.employee_id] = !isStale;
        }
      });
      setOnlineStatuses(statusMap);
    }
  };

  // Subscribe to real-time presence updates
  useEffect(() => {
    if (!currentOrg?.id) return;
    
    const channel = supabase
      .channel('team-presence')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_presence',
        filter: `organization_id=eq.${currentOrg.id}`
      }, (payload: any) => {
        if (payload.new?.employee_id) {
          const lastSeen = payload.new.last_seen_at ? new Date(payload.new.last_seen_at) : null;
          const isStale = lastSeen ? (new Date().getTime() - lastSeen.getTime()) > 60000 : true;
          setOnlineStatuses(prev => ({
            ...prev,
            [payload.new.employee_id]: payload.new.is_online && !isStale
          }));
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [currentOrg?.id]);

  const loadEmployees = async () => {
    if (!currentOrg) return;
    setLoading(true);
    
    // Fetch employees and offices in parallel
    const [employeeResult, officesResult] = await Promise.all([
      supabase
        .from("employee_directory")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("offices")
        .select("id, name")
        .eq("organization_id", currentOrg.id)
        .order("name")
    ]);

    // Set offices
    if (officesResult.data) setOffices(officesResult.data as Office[]);

    if (employeeResult.data) {
      // Transform view data to match Employee interface
      const transformedEmployees = employeeResult.data.map((e: any) => ({
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
        work_location: e.work_location,
        is_new_hire: e.is_new_hire,
        employee_onboarding_completed: e.employee_onboarding_completed,
        profiles: {
          full_name: e.full_name,
          email: e.email,
          avatar_url: e.avatar_url,
        },
        offices: e.office_name ? { name: e.office_name } : null,
      }));
      
      setEmployees(transformedEmployees as Employee[]);
      
      // Fetch user roles for all employees
      const userIds = employeeResult.data.map((e: any) => e.user_id);
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
      
      // Fetch online statuses after employees are loaded
      const employeeIds = employeeResult.data.map((e: any) => e.id);
      fetchOnlineStatuses(employeeIds);
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

  // Calculate online/offline counts
  const onlineCounts = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    const online = activeEmployees.filter(e => onlineStatuses[e.id]).length;
    return { online, offline: activeEmployees.length - online };
  }, [employees, onlineStatuses]);

  // Count employees with no office
  const noOfficeCount = useMemo(() => {
    return employees.filter(e => !e.office_id).length;
  }, [employees]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'active') count++; // 'active' is default
    if (onlineFilter !== 'all') count++;
    if (officeFilter !== 'all') count++;
    return count;
  }, [statusFilter, onlineFilter, officeFilter]);

  const filteredEmployees = useMemo(() => {
    return employees
      .filter((employee) => statusFilter === 'all' || employee.status === statusFilter)
      .filter((employee) => {
        if (onlineFilter === 'all') return true;
        const isOnline = onlineStatuses[employee.id] ?? false;
        return onlineFilter === 'online' ? isOnline : !isOnline;
      })
      .filter((employee) => {
        if (officeFilter === 'all') return true;
        if (officeFilter === 'none') {
          return !employee.office_id;
        }
        return employee.office_id === officeFilter;
      })
      .filter((employee) =>
        employee.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (employee.offices?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [employees, statusFilter, onlineFilter, onlineStatuses, officeFilter, searchQuery]);

  // Pagination for cards view
  const pagination = usePagination({ pageKey: 'team-directory' });

  // Update total count when filtered employees change
  useEffect(() => {
    pagination.setTotalCount(filteredEmployees.length);
  }, [filteredEmployees.length]);

  // Reset to page 1 when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [statusFilter, onlineFilter, officeFilter, searchQuery]);

  // Paginated employees for cards view only
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice(pagination.from, pagination.from + pagination.pageSize);
  }, [filteredEmployees, pagination.from, pagination.pageSize]);

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
        onClick={() => navigateOrg(`/team/${employee.id}`)}
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
    <>
      <div className="space-y-6">
        <PageHeader 
          title="Team Directory" 
          subtitle={`Meet our amazing team of ${employees.length} members`}
        >
          {isAdmin && (
            <Button variant="outline" onClick={() => setRecoverDialogOpen(true)} className="hidden sm:inline-flex gap-2">
              <UserCog className="h-4 w-4" />
              Recover Users
            </Button>
          )}
          {isHR && (
            <>
              <Button variant="outline" onClick={() => navigateOrg('/team/offices')} className="hidden sm:inline-flex gap-2">
                <Building2 className="h-4 w-4" />
                Manage Offices
              </Button>
              <Button variant="outline" onClick={() => navigateOrg('/team/bulk-import')} className="hidden sm:inline-flex gap-2">
                <Upload className="h-4 w-4" />
                Bulk Import
              </Button>
              <Button onClick={() => setQuickInviteDialogOpen(true)} className="gap-2 tour-add-team-member">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Invite Team Member</span>
                <span className="sm:hidden">Invite</span>
              </Button>
            </>
          )}
        </PageHeader>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/30 w-full sm:w-auto">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="gap-1.5 h-8 flex-1 sm:flex-none"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              variant={viewMode === 'orgchart' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('orgchart')}
              className="gap-1.5 h-8 flex-1 sm:flex-none"
            >
              <Building2 className="h-4 w-4" />
              Org Chart
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Status Filter */}
            {(isAdmin || isHR) ? (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className={cn(
                  "w-[130px] h-9",
                  statusFilter !== 'active' && "border-primary bg-primary/5"
                )}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                  <SelectItem value="active">Active ({statusCounts.active})</SelectItem>
                  <SelectItem value="invited">Invited ({statusCounts.invited})</SelectItem>
                  <SelectItem value="inactive">Inactive ({statusCounts.inactive})</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2 px-3 h-9 border rounded-md bg-muted/50 text-sm">
                <span className="text-muted-foreground">Active</span>
                <Badge variant="secondary" className="h-5 px-1.5">{statusCounts.active}</Badge>
              </div>
            )}

            {/* Online Status Filter */}
            <Select value={onlineFilter} onValueChange={(v) => setOnlineFilter(v as OnlineFilter)}>
              <SelectTrigger className={cn(
                "w-[130px] h-9",
                onlineFilter !== 'all' && "border-primary bg-primary/5"
              )}>
                <SelectValue placeholder="Online Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <span>All Status</span>
                  </div>
                </SelectItem>
                <SelectItem value="online">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Online ({onlineCounts.online})</span>
                  </div>
                </SelectItem>
                <SelectItem value="offline">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                    <span>Offline ({onlineCounts.offline})</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Office Filter */}
            {offices.length > 0 && (
              <Select value={officeFilter} onValueChange={setOfficeFilter}>
                <SelectTrigger className={cn(
                  "w-[150px] h-9",
                  officeFilter !== 'all' && "border-primary bg-primary/5"
                )}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Office" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full border border-dashed border-muted-foreground/50" />
                      <span>No Office</span>
                      <span className="text-muted-foreground">({noOfficeCount})</span>
                    </div>
                  </SelectItem>
                  {offices.map((office) => {
                    const memberCount = officeEmployeeCounts[office.id] || 0;
                    return (
                      <SelectItem key={office.id} value={office.id}>
                        <div className="flex items-center gap-2">
                          <span>{office.name}</span>
                          <span className="text-muted-foreground">({memberCount})</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}

            {/* Clear All Filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-9 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
                Clear ({activeFilterCount})
              </Button>
            )}

            {/* Search - expands to fill available space */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, position, department, office..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-full"
              />
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredEmployees.length} of {employees.length} team members
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
                {paginatedEmployees.map((employee) => {
                  // Determine displayed status: employees who haven't completed onboarding show as "invited"
                  const displayStatus = !employee.employee_onboarding_completed
                    ? 'invited'
                    : employee.status;
                  
                  // Show resend button for Owner/Admin/HR when employee hasn't completed onboarding
                  const canResendInvite = (isOwner || isAdmin || isHR) && 
                    !employee.employee_onboarding_completed;

                  return (
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
                        status: displayStatus,
                        officeName: employee.offices?.name,
                        officeEmployeeCount: employee.office_id ? officeEmployeeCounts[employee.office_id] : undefined,
                        workLocation: employee.work_location || undefined,
                      }}
                      showResendInvite={canResendInvite}
                      role={userRoles[employee.user_id]}
                      isOnline={onlineStatuses[employee.id]}
                    />
                  );
                })}
              </div>

              {filteredEmployees.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-border p-12 text-center">
                  <p className="text-muted-foreground">No employees found matching your search.</p>
                </div>
              ) : (
                <PaginationControls
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  totalCount={pagination.totalCount}
                  totalPages={pagination.totalPages}
                  hasNextPage={pagination.hasNextPage}
                  hasPrevPage={pagination.hasPrevPage}
                  onPageChange={pagination.setPage}
                  onPageSizeChange={pagination.setPageSize}
                  isLoading={loading}
                />
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


      <QuickInviteDialog
        open={quickInviteDialogOpen}
        onOpenChange={setQuickInviteDialogOpen}
        onSuccess={loadEmployees}
      />

      <InviteTeamMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={loadEmployees}
      />

      <RecoverOrphanedUsersDialog
        open={recoverDialogOpen}
        onOpenChange={setRecoverDialogOpen}
      />
    </>
  );
};

export default Team;
