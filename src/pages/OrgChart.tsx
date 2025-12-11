import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, ChevronDown, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
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
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentOrg) {
      loadEmployees();
    }
  }, [currentOrg?.id]);

  // Auto-expand root nodes on initial load
  useEffect(() => {
    if (employees.length > 0) {
      const tree = buildTree(employees);
      const rootIds = new Set(tree.map(node => node.id));
      setExpandedNodes(rootIds);
    }
  }, [employees]);

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

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(employees.map(emp => emp.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    const tree = buildTree(employees);
    const rootIds = new Set(tree.map(node => node.id));
    setExpandedNodes(rootIds);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const EmployeeNode = ({ employee, level = 0 }: { employee: TreeNode; level?: number }) => {
    const hasChildren = employee.children.length > 0;
    const isExpanded = expandedNodes.has(employee.id);

    return (
      <div className="flex flex-col items-center">
        <Card
          className={cn(
            "w-56 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50 relative",
            level === 0 && "border-primary/30 shadow-md"
          )}
        >
          <div 
            className="p-3"
            onClick={() => navigate(`/team/${employee.id}`)}
          >
            <div className="flex items-center gap-3 mb-2">
              <Avatar className={cn(
                "border-2 border-primary/20",
                level === 0 ? "h-12 w-12" : "h-10 w-10"
              )}>
                <AvatarImage src={employee.profiles.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                  {employee.profiles.full_name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-semibold text-foreground truncate",
                  level === 0 ? "text-sm" : "text-xs"
                )}>
                  {employee.profiles.full_name}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {employee.position}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {employee.department}
            </Badge>
          </div>
          
          {hasChildren && (
            <button
              onClick={(e) => toggleExpand(employee.id, e)}
              className={cn(
                "absolute -bottom-3 left-1/2 -translate-x-1/2 z-10",
                "w-6 h-6 rounded-full bg-card border-2 border-border",
                "flex items-center justify-center",
                "hover:bg-accent hover:border-primary/50 transition-colors",
                "shadow-sm"
              )}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
          
          {hasChildren && !isExpanded && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full pt-4">
              <Badge variant="outline" className="text-xs bg-card whitespace-nowrap">
                <Users className="h-3 w-3 mr-1" />
                {employee.children.length} report{employee.children.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </Card>

        {hasChildren && isExpanded && (
          <div className="relative mt-10">
            {/* Vertical line from parent */}
            <div className="absolute left-1/2 -top-10 w-px h-10 bg-border" />
            
            <div className="flex gap-6">
              {employee.children.map((child, idx) => (
                <div key={child.id} className="relative flex flex-col items-center">
                  {/* Horizontal connector line */}
                  {employee.children.length > 1 && (
                    <>
                      <div
                        className="absolute -top-6 h-px bg-border"
                        style={{
                          left: idx === 0 ? "50%" : idx === employee.children.length - 1 ? "auto" : "0",
                          right: idx === employee.children.length - 1 ? "50%" : idx === 0 ? "auto" : "0",
                          width: idx === 0 || idx === employee.children.length - 1 ? "calc(50% + 3rem)" : "100%",
                        }}
                      />
                      <div className="absolute left-1/2 -top-6 w-px h-6 bg-border" />
                    </>
                  )}
                  {employee.children.length === 1 && (
                    <div className="absolute left-1/2 -top-6 w-px h-6 bg-border" />
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
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/team")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Team
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
            <div className="flex items-center gap-1 ml-2 border rounded-md">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetZoom}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
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
          <div 
            ref={containerRef}
            className="overflow-auto pb-8 border rounded-lg bg-muted/30"
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          >
            <div 
              className="inline-flex flex-col items-center gap-12 min-w-full p-8 transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
            >
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
