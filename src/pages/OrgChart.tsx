import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Building2 } from "lucide-react";
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
}

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

  // Build tree for a specific department
  const buildDepartmentTree = (deptEmployees: Employee[], allEmployees: Employee[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];
    const deptIds = new Set(deptEmployees.map(e => e.id));

    deptEmployees.forEach((emp) => {
      map.set(emp.id, { ...emp, children: [] });
    });

    deptEmployees.forEach((emp) => {
      const node = map.get(emp.id)!;
      // Only link to manager if manager is in same department
      if (emp.manager_id && map.has(emp.manager_id)) {
        map.get(emp.manager_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const EmployeeCard = ({ employee, showDept = false }: { employee: TreeNode; showDept?: boolean }) => (
    <Card
      onClick={() => navigate(`/team/${employee.id}`)}
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 max-w-[200px]"
    >
      <div className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border border-primary/20 flex-shrink-0">
            <AvatarImage src={employee.profiles.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-[10px]">
              {employee.profiles.full_name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-foreground truncate">
              {employee.profiles.full_name}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate">{employee.position}</p>
          </div>
          {employee.children.length > 0 && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground flex-shrink-0">
              <Users className="h-3 w-3" />
              <span>{employee.children.length}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const EmployeeTree = ({ employee, level = 0 }: { employee: TreeNode; level?: number }) => {
    const hasChildren = employee.children.length > 0;

    return (
      <div className="relative">
        {level > 0 && (
          <div className="absolute -top-3 left-5 w-px h-3 bg-border" />
        )}
        
        <EmployeeCard employee={employee} />

        {hasChildren && (
          <div className="relative mt-1 ml-5 pl-3 border-l border-border">
            <div className="space-y-2 py-2">
              {employee.children.map((child) => (
                <div key={child.id} className="relative">
                  <div className="absolute -left-3 top-4 w-3 h-px bg-border" />
                  <EmployeeTree employee={child} level={level + 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const departments = groupByDepartment(employees);
  const sortedDepartments = Array.from(departments.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  );

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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedDepartments.map(([department, deptEmployees]) => {
              const tree = buildDepartmentTree(deptEmployees, employees);
              return (
                <Card key={department} className="overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium text-sm">{department}</h3>
                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                      {deptEmployees.length}
                    </Badge>
                  </div>
                  <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                    {tree.map((root) => (
                      <EmployeeTree key={root.id} employee={root} />
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
