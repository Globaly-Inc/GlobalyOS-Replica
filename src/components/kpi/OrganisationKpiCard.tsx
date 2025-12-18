import { useState } from "react";
import { Globe, ChevronDown, ChevronRight, Target, Link2, TrendingUp, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrgLink } from "@/components/OrgLink";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import type { OrganizationKpi, Kpi } from "@/types";
import { cn } from "@/lib/utils";

interface OrganisationKpiCardProps {
  kpi: OrganizationKpi;
  showLinkedKpis?: boolean;
  children?: Kpi[];
  canEdit?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  at_risk: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  behind: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  achieved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const statusLabels: Record<string, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  behind: "Behind",
  achieved: "Achieved",
  completed: "Completed",
};

const scopeColors: Record<string, string> = {
  department: "text-purple-600",
  office: "text-orange-600",
  project: "text-blue-600",
  individual: "text-green-600",
};

export function OrganisationKpiCard({ 
  kpi, 
  showLinkedKpis = true,
  children = [],
  canEdit = false,
  onEdit,
  onDelete,
}: OrganisationKpiCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { orgCode } = useOrgNavigation();
  
  const progress = kpi.target_value 
    ? Math.min(Math.round(((kpi.current_value || 0) / kpi.target_value) * 100), 100)
    : 0;

  const displayProgress = kpi.auto_rollup && kpi.aggregated_progress !== undefined
    ? kpi.aggregated_progress
    : progress;

  const childCount = kpi.child_count || children.length;

  return (
    <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-5 w-5 text-indigo-600 shrink-0" />
            <OrgLink 
              to={`/kpi/${kpi.id}`}
              className="font-semibold text-foreground hover:text-primary transition-colors truncate"
            >
              {kpi.title}
            </OrgLink>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={cn("text-xs", statusColors[kpi.status] || statusColors.on_track)}>
              {statusLabels[kpi.status] || "On Track"}
            </Badge>
            {childCount > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Link2 className="h-3 w-3" />
                {childCount}
              </Badge>
            )}
            {canEdit && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <OrgLink to={`/kpi/${kpi.id}`} className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </OrgLink>
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {kpi.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {kpi.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                {kpi.auto_rollup && childCount > 0 && (
                  <TrendingUp className="h-3 w-3" />
                )}
                Progress
                {kpi.auto_rollup && childCount > 0 && (
                  <span className="text-xs">(auto)</span>
                )}
              </span>
              <span className="font-medium">
                {kpi.target_value ? (
                  <>
                    {kpi.current_value || 0} / {kpi.target_value} {kpi.unit || ""}
                    <span className="text-muted-foreground ml-1">({displayProgress}%)</span>
                  </>
                ) : (
                  `${displayProgress}%`
                )}
              </span>
            </div>
            <Progress value={displayProgress} className="h-2" />
          </div>

          {/* Linked KPIs Expansion */}
          {showLinkedKpis && childCount > 0 && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {childCount} linked KPI{childCount !== 1 ? "s" : ""}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  {children.map((child) => {
                    const childProgress = child.target_value 
                      ? Math.min(Math.round(((child.current_value || 0) / child.target_value) * 100), 100)
                      : 0;
                    
                    return (
                      <OrgLink
                        key={child.id}
                        to={`/kpi/${child.id}`}
                        className="block p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Target className={cn("h-4 w-4 shrink-0", scopeColors[child.scope_type] || "text-gray-600")} />
                            <span className="text-sm truncate">{child.title}</span>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {child.scope_type === 'individual' ? 'Individual' : 
                               child.scope_type === 'department' ? 'Dept' :
                               child.scope_type === 'office' ? 'Office' :
                               child.scope_type === 'project' ? 'Project' : child.scope_type}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {childProgress}%
                          </span>
                        </div>
                      </OrgLink>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
