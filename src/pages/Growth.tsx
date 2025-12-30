import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, BookOpen, Target, Award, BarChart3 } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { OrgLink } from "@/components/OrgLink";

const Growth = () => {
  const { isAdmin, isHR } = useUserRole();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <PageHeader 
          title="Growth & Development" 
          subtitle="Track your professional journey and achievements"
        />
        <OrgLink to="/kpi-dashboard">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            KPI Dashboard
          </Button>
        </OrgLink>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">8</p>
              <p className="text-sm text-muted-foreground">Active Goals</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
              <BookOpen className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-sm text-muted-foreground">Courses Completed</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-light">
              <Award className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">24</p>
              <p className="text-sm text-muted-foreground">Achievements</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Growth Plan
        </h2>
        
        <div className="space-y-6">
          {["Backlog", "Priority", "In Progress", "Achieved"].map((status) => (
            <div key={status}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">{status}</h3>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No items in {status.toLowerCase()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Growth;
