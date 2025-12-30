import { useState } from "react";
import { Plus, Link2, Unlink, TrendingUp, Globe, Building, MapPin, FolderKanban, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircularProgress } from "@/components/ui/circular-progress";
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
import { useUnlinkKpi, useToggleAutoRollup } from "@/services/useKpi";
import type { KpiWithHierarchy } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import { LinkChildKpiDialog } from "./LinkChildKpiDialog";

const getInitials = (name: string | undefined): string => {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

interface LinkedKpisSectionProps {
  kpi: KpiWithHierarchy;
  canEdit: boolean;
}

const scopeIcons: Record<string, React.ElementType> = {
  organization: Globe,
  department: Building,
  office: MapPin,
  project: FolderKanban,
  individual: Target,
};

const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  at_risk: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  behind: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  achieved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export function LinkedKpisSection({ kpi, canEdit }: LinkedKpisSectionProps) {
  const unlinkKpi = useUnlinkKpi();
  const toggleAutoRollup = useToggleAutoRollup();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  
  const children = kpi.children || [];
  const hasChildren = children.length > 0;

  const handleUnlink = async (childId: string, childTitle?: string) => {
    await unlinkKpi.mutateAsync({ kpiId: childId, parentTitle: kpi.title });
  };

  const handleToggleAutoRollup = async (checked: boolean) => {
    await toggleAutoRollup.mutateAsync({ kpiId: kpi.id, autoRollup: checked });
  };

  if (!hasChildren && kpi.scope_type === 'individual') {
    return null; // Individual KPIs can't have children
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              Linked KPIs
              {hasChildren && (
                <Badge variant="secondary">{children.length}</Badge>
              )}
            </CardTitle>
            {canEdit && kpi.scope_type !== 'individual' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowLinkDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Link Child
              </Button>
            )}
          </div>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregated Progress */}
        {hasChildren && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Aggregated Progress
              </span>
              <span className="text-sm font-semibold">
                {kpi.aggregated_progress !== undefined ? `${kpi.aggregated_progress}%` : 'N/A'}
              </span>
            </div>
            <Progress 
              value={kpi.aggregated_progress || 0} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              Based on {children.length} linked KPI{children.length !== 1 ? 's' : ''} (weighted average)
            </p>
            
            {/* Auto-rollup toggle */}
            {canEdit && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-rollup" className="text-sm">Auto-update progress</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically calculate from linked KPIs
                  </p>
                </div>
                <Switch
                  id="auto-rollup"
                  checked={kpi.auto_rollup}
                  onCheckedChange={handleToggleAutoRollup}
                  disabled={toggleAutoRollup.isPending}
                />
              </div>
            )}
          </div>
        )}

        {/* Child KPIs List */}
        {hasChildren ? (
          <div className="space-y-2">
            {children.map((child) => {
              const Icon = scopeIcons[child.scope_type] || Target;
              const childProgress = child.target_value 
                ? Math.min(Math.round(((child.current_value || 0) / child.target_value) * 100), 100)
                : 0;
              const periodText = child.quarter ? `Q${child.quarter} ${child.year}` : `${child.year}`;

              return (
                <OrgLink 
                  key={child.id}
                  to={`/kpi/${child.id}`}
                  className="grid grid-cols-[32px_1fr_auto] gap-3 items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* Left: Avatar/Icon */}
                  {child.scope_type === 'individual' && child.employee ? (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={child.employee.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(child.employee.profiles?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                  )}

                  {/* Middle: Title + Metadata */}
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-sm truncate">
                      {child.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
                      <span className="truncate max-w-[100px]">
                        {child.scope_type === 'individual' 
                          ? child.employee?.profiles?.full_name 
                          : child.scope_department || 'Group'}
                      </span>
                      <span className="text-muted-foreground/50">•</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {periodText}
                      </Badge>
                      <span className="text-muted-foreground/50">•</span>
                      <Badge className={cn("text-[10px]", statusColors[child.status])}>
                        {child.status.replace('_', ' ')}
                      </Badge>
                      {child.updated_at && (
                        <>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="whitespace-nowrap">{formatRelativeTime(child.updated_at)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Progress, Target, Unlink */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <CircularProgress value={childProgress} size={16} strokeWidth={2} />
                      <span className="text-xs font-medium">{childProgress}%</span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                      {child.current_value || 0}/{child.target_value || 0} {child.unit || ''}
                    </span>
                    {canEdit && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unlink KPI</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to unlink "{child.title}" from this KPI? 
                              The KPI will continue to exist but won't contribute to this goal's progress.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={(e) => { e.stopPropagation(); handleUnlink(child.id); }}
                              disabled={unlinkKpi.isPending}
                            >
                              Unlink
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </OrgLink>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No linked KPIs yet</p>
            <p className="text-xs mt-1">
              Link department, office, project, or individual KPIs to track progress towards this goal
            </p>
          </div>
        )}
        </CardContent>
      </Card>

      <LinkChildKpiDialog
        open={showLinkDialog}
        onOpenChange={setShowLinkDialog}
        parentKpi={kpi}
      />
    </>
  );
}
