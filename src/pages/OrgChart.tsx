import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Building2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  position: string;
  department: string;
  manager_id: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface TreeNode extends Employee {
  children: TreeNode[];
  isExternalManager?: boolean;
}

// Department color palette using HSL values
const DEPARTMENT_COLORS = [
  { bg: "hsl(221, 83%, 53%)", light: "hsl(221, 83%, 96%)", border: "hsl(221, 83%, 80%)" }, // Blue
  { bg: "hsl(142, 71%, 45%)", light: "hsl(142, 71%, 96%)", border: "hsl(142, 71%, 80%)" }, // Green
  { bg: "hsl(262, 83%, 58%)", light: "hsl(262, 83%, 96%)", border: "hsl(262, 83%, 85%)" }, // Purple
  { bg: "hsl(25, 95%, 53%)", light: "hsl(25, 95%, 96%)", border: "hsl(25, 95%, 80%)" },   // Orange
  { bg: "hsl(340, 82%, 52%)", light: "hsl(340, 82%, 96%)", border: "hsl(340, 82%, 85%)" }, // Pink
  { bg: "hsl(187, 85%, 43%)", light: "hsl(187, 85%, 96%)", border: "hsl(187, 85%, 80%)" }, // Cyan
  { bg: "hsl(47, 96%, 53%)", light: "hsl(47, 96%, 94%)", border: "hsl(47, 96%, 70%)" },   // Yellow
  { bg: "hsl(0, 84%, 60%)", light: "hsl(0, 84%, 96%)", border: "hsl(0, 84%, 85%)" },      // Red
];

const OrgChart = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (currentOrg) {
      loadEmployees();
    }
  }, [currentOrg?.id]);

  const loadEmployees = async () => {
    if (!currentOrg) return;
    setLoading(true);
    const { data } = await supabase
      .from("employees")
      .select(`
        id,
        position,
        department,
        manager_id,
        profiles!inner(
          full_name,
          email,
          avatar_url
        )
      `)
      .eq("organization_id", currentOrg.id);

    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  };

  // Create a map of department to color
  const departmentColorMap = useMemo(() => {
    const uniqueDepts = [...new Set(employees.map(e => e.department || "Unassigned"))].sort();
    const map = new Map<string, typeof DEPARTMENT_COLORS[0]>();
    uniqueDepts.forEach((dept, index) => {
      map.set(dept, DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]);
    });
    return map;
  }, [employees]);

  // Create employee lookup map
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(emp => map.set(emp.id, emp));
    return map;
  }, [employees]);

  // Group employees by department
  const groupByDepartment = (employees: Employee[]): Map<string, Employee[]> => {
    const departments = new Map<string, Employee[]>();
    
    employees.forEach((emp) => {
      const dept = emp.department || "Unassigned";
      if (!departments.has(dept)) {
        departments.set(dept, []);
      }
      departments.get(dept)!.push(emp);
    });

    return departments;
  };

  // Build tree for a specific department, including external managers
  const buildDepartmentTree = (deptEmployees: Employee[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    const deptIds = new Set(deptEmployees.map(e => e.id));

    // First add all department employees
    deptEmployees.forEach((emp) => {
      map.set(emp.id, { ...emp, children: [] });
    });

    // Find external managers and add them
    deptEmployees.forEach((emp) => {
      if (emp.manager_id && !deptIds.has(emp.manager_id)) {
        const externalManager = employeeMap.get(emp.manager_id);
        if (externalManager && !map.has(emp.manager_id)) {
          map.set(emp.manager_id, { ...externalManager, children: [], isExternalManager: true });
        }
      }
    });

    // Build the tree
    deptEmployees.forEach((emp) => {
      const node = map.get(emp.id)!;
      if (emp.manager_id && map.has(emp.manager_id)) {
        map.get(emp.manager_id)!.children.push(node);
      } else if (!emp.manager_id) {
        roots.push(node);
      } else {
        // Manager exists but not in this department - already added as external
        const externalManager = map.get(emp.manager_id);
        if (externalManager) {
          externalManager.children.push(node);
        } else {
          roots.push(node);
        }
      }
    });

    // Add external managers to roots
    map.forEach((node) => {
      if (node.isExternalManager) {
        roots.unshift(node);
      }
    });

    return roots;
  };

  const EmployeeCard = ({ employee, departmentColor }: { employee: TreeNode; departmentColor: typeof DEPARTMENT_COLORS[0] }) => {
    const isExternal = employee.isExternalManager;
    const empDeptColor = departmentColorMap.get(employee.department || "Unassigned") || DEPARTMENT_COLORS[0];
    
    return (
      <Card
        onClick={() => navigate(`/team/${employee.id}`)}
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md max-w-[200px]",
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
                <h3 className="text-xs font-medium text-foreground truncate">
                  {employee.profiles.full_name}
                </h3>
                {isExternal && (
                  <ArrowUpRight className="h-3 w-3 flex-shrink-0" style={{ color: empDeptColor.bg }} />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{employee.position}</p>
              {isExternal && (
                <Badge 
                  variant="outline" 
                  className="text-[8px] px-1 py-0 mt-0.5"
                  style={{ borderColor: empDeptColor.bg, color: empDeptColor.bg }}
                >
                  {employee.department}
                </Badge>
              )}
            </div>
            {employee.children.length > 0 && !isExternal && (
              <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
                <Users className="h-3 w-3" />
                <span>{employee.children.length}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const EmployeeTree = ({ employee, level = 0, departmentColor }: { employee: TreeNode; level?: number; departmentColor: typeof DEPARTMENT_COLORS[0] }) => {
    const hasChildren = employee.children.length > 0;

    return (
      <div className="relative">
        <EmployeeCard employee={employee} departmentColor={departmentColor} />

        {hasChildren && (
          <div className="ml-3 mt-2 pl-5 space-y-2">
            {employee.children.map((child, index) => {
              const isLastChild = index === employee.children.length - 1;
              return (
                <div key={child.id} className="relative">
                  {/* Vertical line segment - connects to horizontal */}
                  <div 
                    className="absolute w-0.5"
                    style={{ 
                      backgroundColor: departmentColor.bg,
                      left: '-20px',
                      top: index === 0 ? '-8px' : '-12px',
                      height: index === 0 ? '24px' : '28px'
                    }} 
                  />
                  {/* Continue vertical line below if not last child */}
                  {!isLastChild && (
                    <div 
                      className="absolute w-0.5"
                      style={{ 
                        backgroundColor: departmentColor.bg,
                        left: '-20px',
                        top: '16px',
                        bottom: '-12px'
                      }} 
                    />
                  )}
                  {/* Horizontal branch line */}
                  <div 
                    className="absolute top-4 h-0.5"
                    style={{ 
                      backgroundColor: departmentColor.bg,
                      width: '16px',
                      left: '-16px'
                    }} 
                  />
                  {/* Connection dot at junction */}
                  <div 
                    className="absolute w-2 h-2 rounded-full border-2"
                    style={{ 
                      borderColor: departmentColor.bg,
                      backgroundColor: 'white',
                      left: '-22px',
                      top: '12px'
                    }} 
                  />
                  <EmployeeTree 
                    employee={child} 
                    level={level + 1} 
                    departmentColor={departmentColor}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const departments = groupByDepartment(employees);
  const sortedDepartments = Array.from(departments.entries()).sort((a, b) => {
    // Always put Management first
    if (a[0].toLowerCase() === 'management') return -1;
    if (b[0].toLowerCase() === 'management') return 1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <Layout>
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate("/team")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Team
        </Button>
        
        <PageHeader 
          title="Organization Chart" 
          subtitle="Company hierarchy by department"
        />

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading organization chart...</p>
          </Card>
        ) : employees.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No employees found.</p>
          </Card>
        ) : (
          <div className="grid gap-x-4 md:grid-cols-2 lg:grid-cols-3 items-start">
            {sortedDepartments.map(([department, deptEmployees]) => {
              const tree = buildDepartmentTree(deptEmployees);
              const deptColor = departmentColorMap.get(department) || DEPARTMENT_COLORS[0];
              return (
                <Card key={department} className="overflow-hidden" style={{ borderColor: deptColor.border }}>
                  <div 
                    className="px-3 py-2 border-b flex items-center gap-2"
                    style={{ backgroundColor: deptColor.light, borderBottomColor: deptColor.border }}
                  >
                    <Building2 className="h-4 w-4" style={{ color: deptColor.bg }} />
                    <h3 className="font-medium text-sm" style={{ color: deptColor.bg }}>{department}</h3>
                    <Badge 
                      className="ml-auto text-[10px] px-1.5 py-0 text-white"
                      style={{ backgroundColor: deptColor.bg }}
                    >
                      {deptEmployees.length}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-4">
                    {tree.map((root) => (
                      <EmployeeTree key={root.id} employee={root} departmentColor={deptColor} />
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrgChart;
