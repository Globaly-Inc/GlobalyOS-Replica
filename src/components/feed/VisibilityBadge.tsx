import { Globe, Building2, Briefcase, FolderKanban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface VisibilityBadgeProps {
  accessScope: string | null;
  offices?: Array<{ office: { name: string } }>;
  departments?: Array<{ department: string }>;
  projects?: Array<{ project: { name: string } }>;
  className?: string;
}

export const VisibilityBadge = ({
  accessScope,
  offices,
  departments,
  projects,
  className,
}: VisibilityBadgeProps) => {
  // Don't show badge for company-wide posts
  if (!accessScope || accessScope === 'company') return null;

  const getIcon = () => {
    switch (accessScope) {
      case 'offices':
        return <Building2 className="h-3 w-3" />;
      case 'departments':
        return <Briefcase className="h-3 w-3" />;
      case 'projects':
        return <FolderKanban className="h-3 w-3" />;
      default:
        return <Globe className="h-3 w-3" />;
    }
  };

  const getLabel = () => {
    switch (accessScope) {
      case 'offices':
        if (offices && offices.length > 0) {
          return offices.map(o => o.office?.name).filter(Boolean).join(", ");
        }
        return "Specific offices";
      case 'departments':
        if (departments && departments.length > 0) {
          return departments.map(d => d.department).filter(Boolean).join(", ");
        }
        return "Specific departments";
      case 'projects':
        if (projects && projects.length > 0) {
          return projects.map(p => p.project?.name).filter(Boolean).join(", ");
        }
        return "Specific projects";
      default:
        return "";
    }
  };

  const label = getLabel();
  const truncatedLabel = label.length > 30 ? label.substring(0, 27) + "..." : label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "gap-1 text-xs font-normal",
              accessScope === 'offices' && "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
              accessScope === 'departments' && "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
              accessScope === 'projects' && "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
              className
            )}
          >
            {getIcon()}
            {truncatedLabel}
          </Badge>
        </TooltipTrigger>
        {label.length > 30 && (
          <TooltipContent>
            <p>{label}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
