import { useState } from "react";
import * as icons from "lucide-react";
import { Plus, Link2, Unlink, Target, TrendingUp, Globe, Building, MapPin, FolderKanban, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { cn } from "@/lib/utils";
import { LinkChildKpiDialog } from "./LinkChildKpiDialog";

// Helper component for dynamic icons
const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  if (!name) return <icons.Folder className={className} style={style} />;
  const pascalCase = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
  const IconComponent = (icons as any)[pascalCase] || icons.Folder;
  return <IconComponent className={className} style={style} />;
};

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
  individual: Target, // Fallback, individual KPIs show avatar instead
};

const scopeColors: Record<string, string> = {
  organization: "text-indigo-600",
  department: "text-purple-600",
  office: "text-orange-600",
  project: "text-blue-600",
  individual: "text-green-600",
};

const statusColors: Record<string, string> = {
  on_track: "bg-green-100 text-green-800",
  at_risk: "bg-amber-100 text-amber-800",
  behind: "bg-red-100 text-red-800",
  achieved: "bg-blue-100 text-blue-800",
  completed: "bg-purple-100 text-purple-800",
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

              return (
                <div 
                  key={child.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {child.scope_type === 'individual' && child.employee ? (
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={child.employee.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(child.employee.profiles?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <Icon className={cn("h-5 w-5 shrink-0", scopeColors[child.scope_type])} />
                  )}
                  <div className="flex-1 min-w-0">
                    <OrgLink 
                      to={`/kpi/${child.id}`}
                      className="font-medium text-sm hover:text-primary truncate block"
                    >
                      {child.title}
                    </OrgLink>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{childProgress}%</span>
                    {/* Scope Badge */}
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      {child.scope_type === 'project' && child.project ? (
                        <>
                          {child.project.logo_url ? (
                            <img 
                              src={child.project.logo_url} 
                              alt={child.project.name}
                              className="h-3 w-3 rounded-sm object-cover"
                            />
                          ) : child.project.icon ? (
                            <DynamicIcon 
                              name={child.project.icon} 
                              className="h-3 w-3" 
                              style={{ color: child.project.color || undefined }}
                            />
                          ) : (
                            <FolderKanban className="h-3 w-3" />
                          )}
                          <span className="max-w-[80px] truncate">{child.project.name}</span>
                        </>
                      ) : child.scope_type === 'office' && child.office ? (
                        <>
                          <MapPin className="h-3 w-3" />
                          <span className="max-w-[80px] truncate">{child.office.name}</span>
                        </>
                      ) : child.scope_type === 'department' && child.scope_department ? (
                        <>
                          <Building className="h-3 w-3" />
                          <span className="max-w-[80px] truncate">{child.scope_department}</span>
                        </>
                      ) : child.scope_type === 'individual' && child.employee ? (
                        <>
                          <User className="h-3 w-3" />
                          <span className="max-w-[80px] truncate">{child.employee.profiles?.full_name}</span>
                        </>
                      ) : (
                        <span className="capitalize">{child.scope_type}</span>
                      )}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", statusColors[child.status])}
                    >
                      {child.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {canEdit && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
                            onClick={() => handleUnlink(child.id)}
                            disabled={unlinkKpi.isPending}
                          >
                            Unlink
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
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
