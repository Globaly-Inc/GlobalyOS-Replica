import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

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

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
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
      `);

    if (data) setEmployees(data as Employee[]);
    setLoading(false);
  };

  const buildTree = (employees: Employee[]): TreeNode[] => {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Initialize all nodes
    employees.forEach((emp) => {
      map.set(emp.id, { ...emp, children: [] });
    });

    // Build the tree
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

  const EmployeeNode = ({ employee, level = 0 }: { employee: TreeNode; level?: number }) => {
    const hasChildren = employee.children.length > 0;

    return (
      <div className="flex flex-col items-center">
        <Card
          onClick={() => navigate(`/team/${employee.id}`)}
          className="w-64 cursor-pointer transition-all hover:shadow-lg hover:scale-105 hover:border-primary/50"
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={employee.profiles.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
                  {employee.profiles.full_name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {employee.profiles.full_name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {employee.position}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {employee.department}
            </Badge>
            {hasChildren && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{employee.children.length} direct report{employee.children.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {hasChildren && (
          <div className="relative mt-8">
            {/* Vertical line from parent */}
            <div className="absolute left-1/2 -top-8 w-px h-8 bg-border" />
            
            <div className="flex gap-8">
              {employee.children.map((child, idx) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Horizontal connector line */}
                  {employee.children.length > 1 && (
                    <>
                      <div
                        className="absolute -top-8 h-px bg-border"
                        style={{
                          left: idx === 0 ? "50%" : idx === employee.children.length - 1 ? "auto" : "0",
                          right: idx === employee.children.length - 1 ? "50%" : idx === 0 ? "auto" : "0",
                          width: idx === 0 || idx === employee.children.length - 1 ? "calc(50% + 4rem)" : "100%",
                        }}
                      />
                      <div className="absolute left-1/2 -top-8 w-px h-8 bg-border" />
                    </>
                  )}
                  {employee.children.length === 1 && (
                    <div className="absolute left-1/2 -top-8 w-px h-8 bg-border" />
                  )}
                  <EmployeeNode employee={child} level={level + 1} />
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
      <div className="space-y-6">
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
          <div className="overflow-x-auto pb-8">
            <div className="inline-flex flex-col items-center gap-16 min-w-full p-8">
              {tree.map((root) => (
                <EmployeeNode key={root.id} employee={root} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default OrgChart;
