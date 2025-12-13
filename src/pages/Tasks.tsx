import { CheckSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Tasks = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <CheckSquare className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-muted-foreground text-sm">Task and project management</p>
        </div>
        <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Feature in Development</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>Task management functionality will be available soon. Manage projects, assign tasks, and track progress.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tasks;
