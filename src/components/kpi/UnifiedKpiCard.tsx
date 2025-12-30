import { MoreHorizontal, Pencil, Trash2, Eye, Link2, Building, MapPin, FolderKanban, Globe, Target, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CircularProgress } from "@/components/ui/circular-progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrgLink } from "@/components/OrgLink";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Kpi, KpiWithEmployee, GroupKpiWithScope } from "@/types";

interface KpiOwner {
  employee_id: string;
  is_primary: boolean;
  full_name?: string;
  avatar_url?: string | null;
}

interface UnifiedKpiCardProps {
  kpi: Kpi | KpiWithEmployee | GroupKpiWithScope;
  type: 'individual' | 'group';
  // Employee data for individual KPIs
  employee?: {
    id: string;
    name: string;
    position?: string;
    avatarUrl?: string;
  };
  // Project data for project-scoped group KPIs
  project?: {
    id: string;
    name: string;
    icon?: string | null;
    color?: string | null;
    logo_url?: string | null;
  };
  // Owners for group KPIs
  owners?: KpiOwner[];
  // Selection
  isSelected?: boolean;
  onSelect?: () => void;
  showCheckbox?: boolean;
  // Actions
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean; // Separate delete permission (Owner/Admin/Manager for subordinates only)
  // Display options
  compact?: boolean;
  updatesCount?: number;
  childCount?: number;
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

const getInitials = (name: string | undefined): string => {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

export function UnifiedKpiCard({
  kpi,
  type,
  employee,
  project,
  owners,
  isSelected,
  onSelect,
  showCheckbox,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  compact = false,
  updatesCount = 0,
  childCount = 0,
}: UnifiedKpiCardProps) {
  const progress = kpi.target_value
    ? Math.min(Math.round(((kpi.current_value || 0) / kpi.target_value) * 100), 100)
    : 0;

  // Get scope name for group KPIs
  const getScopeName = (): string => {
    if (type === 'individual' && employee) {
      return employee.name;
    }
    
    const groupKpi = kpi as GroupKpiWithScope;
    if (groupKpi.scope_type === 'department') {
      return groupKpi.scope_department || 'Department';
    }
    if (groupKpi.scope_type === 'office' && groupKpi.office) {
      return groupKpi.office.name;
    }
    if (groupKpi.scope_type === 'project' && (groupKpi.project || project)) {
      return groupKpi.project?.name || project?.name || 'Project';
    }
    return 'Group';
  };

  // Get scope icon
  const ScopeIcon = scopeIcons[kpi.scope_type || 'individual'] || Target;

  // Render avatar/icon
  const renderAvatar = () => {
    const size = compact ? "h-8 w-8" : "h-10 w-10";
    
    if (type === 'individual' && employee) {
      return (
        <Avatar className={size}>
          <AvatarImage src={employee.avatarUrl} />
          <AvatarFallback className="text-xs">
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>
      );
    }

    // For project-scoped KPIs, show project logo/icon
    const groupKpi = kpi as GroupKpiWithScope;
    const projectData = groupKpi.project || project;
    
    if (groupKpi.scope_type === 'project' && projectData) {
      if (projectData.logo_url) {
        return (
          <div className={cn(size, "rounded-full overflow-hidden bg-muted")}>
            <img 
              src={projectData.logo_url} 
              alt={projectData.name} 
              className="h-full w-full object-cover"
            />
          </div>
        );
      }
      // Use project icon with color
      const iconColor = projectData.color || 'hsl(var(--primary))';
      return (
        <div 
          className={cn(size, "rounded-full flex items-center justify-center")}
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <FolderKanban 
            className={compact ? "h-4 w-4" : "h-5 w-5"} 
            style={{ color: iconColor }}
          />
        </div>
      );
    }

    // Default scope icon
    return (
      <div className={cn(size, "rounded-full bg-primary/10 flex items-center justify-center")}>
        <ScopeIcon className={cn(compact ? "h-4 w-4" : "h-5 w-5", "text-primary")} />
      </div>
    );
  };

  // Format target display
  const formatTarget = () => {
    if (!kpi.target_value) return null;
    const unit = kpi.unit || '';
    return `${kpi.current_value || 0}/${kpi.target_value} ${unit}`.trim();
  };

  // Period badge text
  const periodText = kpi.quarter ? `Q${kpi.quarter} ${kpi.year}` : `${kpi.year}`;

  // Render mobile avatar (smaller)
  const renderMobileAvatar = () => {
    const size = "h-8 w-8";
    
    if (type === 'individual' && employee) {
      return (
        <Avatar className={size}>
          <AvatarImage src={employee.avatarUrl} />
          <AvatarFallback className="text-xs">
            {getInitials(employee.name)}
          </AvatarFallback>
        </Avatar>
      );
    }

    const groupKpi = kpi as GroupKpiWithScope;
    const projectData = groupKpi.project || project;
    
    if (groupKpi.scope_type === 'project' && projectData) {
      if (projectData.logo_url) {
        return (
          <div className={cn(size, "rounded-full overflow-hidden bg-muted")}>
            <img 
              src={projectData.logo_url} 
              alt={projectData.name} 
              className="h-full w-full object-cover"
            />
          </div>
        );
      }
      const iconColor = projectData.color || 'hsl(var(--primary))';
      return (
        <div 
          className={cn(size, "rounded-full flex items-center justify-center")}
          style={{ backgroundColor: `${iconColor}20` }}
        >
          <FolderKanban className="h-4 w-4" style={{ color: iconColor }} />
        </div>
      );
    }

    return (
      <div className={cn(size, "rounded-full bg-primary/10 flex items-center justify-center")}>
        <ScopeIcon className="h-4 w-4 text-primary" />
      </div>
    );
  };

  return (
    <div className={cn(
      "flex items-center gap-2",
      compact && "gap-1"
    )}>
      {/* Checkbox - hidden on mobile */}
      {showCheckbox && canEdit && (
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="shrink-0 hidden md:block"
        />
      )}
      
      <OrgLink
        to={`/kpi/${kpi.id}`}
        className={cn(
          "flex-1 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group",
          isSelected && "bg-primary/5 border-primary/30"
        )}
      >
        {/* Mobile Layout: Two-row design */}
        <div className="flex flex-col p-2.5 md:hidden">
          {/* Row 1: Avatar + Title + Progress */}
          <div className="flex items-center gap-2">
            <div className="shrink-0">
              {renderMobileAvatar()}
            </div>
            <p className="font-medium text-sm flex-1 line-clamp-2 leading-tight">
              {kpi.title}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <CircularProgress value={progress} size={18} strokeWidth={2.5} />
              <span className="text-sm font-medium w-8 text-right">{progress}%</span>
            </div>
          </div>
          
          {/* Row 2: Scope icon + Group/Employee name + Owners + Period */}
          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground ml-10">
            {/* For group KPIs: Show scope icon before group name */}
            {type === 'group' && (
              <>
                <ScopeIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate max-w-[100px]">{getScopeName()}</span>
                <span className="text-muted-foreground/50">•</span>
                {owners && owners.length > 0 ? (
                  <div className="flex items-center shrink-0">
                    <div className="flex -space-x-1">
                      {owners.slice(0, 2).map((owner) => (
                        <Avatar key={owner.employee_id} className="h-4 w-4 border border-background">
                          <AvatarImage src={owner.avatar_url || undefined} />
                          <AvatarFallback className="text-[6px]">{getInitials(owner.full_name)}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    {owners.length > 2 && <span className="text-[10px] ml-0.5">+{owners.length - 2}</span>}
                  </div>
                ) : (
                  <span className="text-[10px] italic">No Owner</span>
                )}
              </>
            )}
            
            {/* For individual KPIs: Show employee name */}
            {type === 'individual' && employee && (
              <span className="truncate max-w-[120px]">{employee.name}</span>
            )}
            
            {/* Period badge */}
            <span className="text-muted-foreground/50">•</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {periodText}
            </Badge>
          </div>
        </div>

        {/* Desktop Layout: Original grid design */}
        <div className={cn(
          "hidden md:grid items-center gap-3 p-3",
          compact ? "grid-cols-[32px_1fr_auto]" : "grid-cols-[40px_1fr_auto]"
        )}>
          {/* Left: Avatar/Icon */}
          <div className="shrink-0">
            {renderAvatar()}
          </div>

          {/* Middle: Title + Metadata */}
          <div className="min-w-0 space-y-0.5">
            <p className={cn(
              "font-medium truncate",
              compact ? "text-sm" : "text-sm"
            )}>
              {kpi.title}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
              {/* Owner/Scope name */}
              <span className="truncate max-w-[120px]">{getScopeName()}</span>
              
              {/* Position (individual KPIs only) */}
              {type === 'individual' && employee?.position && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="truncate max-w-[150px] lg:max-w-none">{employee.position}</span>
                </>
              )}
              
              {/* Owner avatars for group KPIs */}
              {type === 'group' && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  {owners && owners.length > 0 ? (
                    <div className="flex items-center">
                      <div className="flex -space-x-1.5">
                        {owners.slice(0, 3).map((owner) => (
                          <Avatar key={owner.employee_id} className="h-5 w-5 border-2 border-background">
                            <AvatarImage src={owner.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {getInitials(owner.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {owners.length > 3 && (
                        <span className="text-[10px] ml-1 text-muted-foreground">+{owners.length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/70 italic">No Owner</span>
                  )}
                </>
              )}
              
              {/* Period badge */}
              <span className="text-muted-foreground/50">•</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {periodText}
              </Badge>
              
              {/* Updates count */}
              {updatesCount > 0 && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {updatesCount}
                  </span>
                </>
              )}
              
              {/* Linked KPIs count */}
              {childCount > 0 && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                    <Link2 className="h-3 w-3" />
                    {childCount}
                  </Badge>
                </>
              )}
              
              {/* Last updated */}
              {kpi.updated_at && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span className="whitespace-nowrap">{formatRelativeTime(kpi.updated_at)}</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Targets, Status, Progress, Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Targets */}
            {formatTarget() && (
              <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                {formatTarget()}
              </span>
            )}

            {/* Status Badge */}
            <Badge className={cn("text-[10px] shrink-0", statusColors[kpi.status])}>
              {kpi.status.replace("_", " ")}
            </Badge>

            {/* Progress */}
            <div className="flex items-center gap-1.5">
              <CircularProgress value={progress} size={compact ? 16 : 20} strokeWidth={compact ? 2 : 2.5} />
              <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{progress}%</span>
            </div>

            {/* 3-dot menu - desktop only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="icon" className={cn("shrink-0", compact ? "h-7 w-7" : "h-8 w-8")}>
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
                {canEdit && (
                  <DropdownMenuItem onClick={(e) => { e.preventDefault(); onEdit?.(); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={(e) => { e.preventDefault(); onDelete?.(); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </OrgLink>
    </div>
  );
}
