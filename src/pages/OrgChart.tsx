import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft } from "lucide-react";
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

  const buildTree = (employees: Employee[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    employees.forEach((emp) => {
      map.set(emp.id, { ...emp, children: [] });
    });

    employees.forEach((emp) => {
      const node = map.get(emp.id)!;
      if (emp.manager_id && map.has(emp.manager_id)) {
        map.get(emp.manager_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const EmployeeCard = ({ employee, isRoot = false }: { employee: TreeNode; isRoot?: boolean }) => (
    <Card
      onClick={() => navigate(`/team/${employee.id}`)}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 max-w-xs",
        isRoot && "border-primary/30"
      )}
    >
      <div className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 border border-primary/20">
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
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
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
        {/* Connector line from parent */}
        {level > 0 && (
          <div className="absolute -top-4 left-6 w-px h-4 bg-border" />
        )}
        
        <EmployeeCard employee={employee} isRoot={level === 0} />

        {hasChildren && (
          <div className="relative mt-1 ml-6 pl-4 border-l-2 border-border">
            <div className="space-y-3 py-3">
              {employee.children.map((child) => (
                <div key={child.id} className="relative">
                  {/* Horizontal connector */}
                  <div className="absolute -left-4 top-5 w-4 h-px bg-border" />
                  <EmployeeTree employee={child} level={level + 1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const tree = buildTree(employees);

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
          subtitle="Company hierarchy and reporting structure"
        />

        {loading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading organization chart...</p>
          </Card>
        ) : tree.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No employees found.</p>
          </Card>
        ) : (
          <div className="space-y-6 pb-8">
            {tree.map((root) => (
              <EmployeeTree key={root.id} employee={root} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrgChart;
