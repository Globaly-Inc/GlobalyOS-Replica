import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CRM = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Briefcase className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-muted-foreground text-sm">Customer relationship management</p>
        </div>
        <Badge variant="secondary" className="ml-auto">Coming Soon</Badge>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Feature in Development</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>CRM functionality will be available soon. Manage leads, contacts, and customer relationships.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRM;
