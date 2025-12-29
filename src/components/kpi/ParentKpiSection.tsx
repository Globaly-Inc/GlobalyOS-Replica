import { Globe, Building, MapPin, FolderKanban, ArrowUp, Unlink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { OrgLink } from "@/components/OrgLink";
import { useUnlinkKpi } from "@/services/useKpi";
import type { Kpi } from "@/types";
import { cn } from "@/lib/utils";

interface ParentKpiSectionProps {
  parent: Kpi;
  childKpiId: string;
  contributionWeight: number;
  canEdit: boolean;
}

const scopeIcons: Record<string, React.ElementType> = {
  organization: Globe,
  department: Building,
  office: MapPin,
  project: FolderKanban,
};

const scopeColors: Record<string, string> = {
  organization: "border-l-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20",
  department: "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20",
  office: "border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
  project: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
};

const scopeLabels: Record<string, string> = {
  organization: "Organisation Goal",
  department: "Department Goal",
  office: "Office Goal",
  project: "Project Goal",
};

export function ParentKpiSection({ 
  parent, 
  childKpiId,
  contributionWeight,
  canEdit 
}: ParentKpiSectionProps) {
  const unlinkKpi = useUnlinkKpi();
  const Icon = scopeIcons[parent.scope_type] || Globe;
  
  const parentProgress = parent.target_value 
    ? Math.min(Math.round(((parent.current_value || 0) / parent.target_value) * 100), 100)
    : 0;

  const handleUnlink = async () => {
    await unlinkKpi.mutateAsync({ kpiId: childKpiId, parentTitle: parent.title });
  };

  return (
    <Card className={cn("border-l-4", scopeColors[parent.scope_type] || "border-l-gray-500")}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
            Part of {scopeLabels[parent.scope_type] || "Parent Goal"}
          </CardTitle>
          {canEdit && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                  <Unlink className="h-4 w-4 mr-1" />
                  Unlink
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Unlink from Parent</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to unlink this KPI from "{parent.title}"? 
                    This KPI will become standalone and no longer contribute to the parent's progress.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleUnlink}
                    disabled={unlinkKpi.isPending}
                  >
                    Unlink
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <OrgLink 
          to={`/kpi/${parent.id}`}
          className="block p-3 rounded-lg hover:bg-background/80 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              parent.scope_type === 'organization' ? "bg-indigo-100 dark:bg-indigo-900" :
              parent.scope_type === 'department' ? "bg-purple-100 dark:bg-purple-900" :
              parent.scope_type === 'office' ? "bg-orange-100 dark:bg-orange-900" :
              "bg-blue-100 dark:bg-blue-900"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                parent.scope_type === 'organization' ? "text-indigo-600" :
                parent.scope_type === 'department' ? "text-purple-600" :
                parent.scope_type === 'office' ? "text-orange-600" :
                "text-blue-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{parent.title}</p>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={parentProgress} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground">{parentProgress}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Contributing {Math.round(contributionWeight * 100)}% weight to this goal
              </p>
            </div>
          </div>
        </OrgLink>
      </CardContent>
    </Card>
  );
}
