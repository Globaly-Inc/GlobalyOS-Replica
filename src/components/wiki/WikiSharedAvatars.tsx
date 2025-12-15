import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Globe, Building2, Users, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SharedMember {
  employee_id: string;
  full_name: string;
  avatar_url: string | null;
  permission?: 'view' | 'edit';
}

export interface SharedGroup {
  type: 'company' | 'office' | 'department' | 'project';
  id?: string;
  name: string;
}

interface WikiSharedAvatarsProps {
  members: SharedMember[];
  groups: SharedGroup[];
  maxAvatars?: number;
  size?: 'sm' | 'md';
  onClick?: () => void;
  className?: string;
}

const groupIcons = {
  company: Globe,
  office: Building2,
  department: Users,
  project: FolderKanban,
};

const groupColors = {
  company: 'bg-emerald-500/10 text-emerald-600',
  office: 'bg-primary/10 text-primary',
  department: 'bg-purple-500/10 text-purple-600',
  project: 'bg-amber-500/10 text-amber-600',
};

export const WikiSharedAvatars = ({
  members,
  groups,
  maxAvatars = 3,
  size = 'sm',
  onClick,
  className,
}: WikiSharedAvatarsProps) => {
  const sizeClasses = size === 'sm' 
    ? { avatar: 'h-6 w-6', icon: 'h-3 w-3', text: 'text-xs', spacing: '-space-x-1.5' }
    : { avatar: 'h-8 w-8', icon: 'h-4 w-4', text: 'text-sm', spacing: '-space-x-2' };

  const totalItems = groups.length + members.length;
  const displayGroups = groups.slice(0, maxAvatars);
  const remainingSlots = maxAvatars - displayGroups.length;
  const displayMembers = members.slice(0, Math.max(0, remainingSlots));
  const remainingCount = totalItems - displayGroups.length - displayMembers.length;

  if (totalItems === 0) return null;

  const tooltipContent = (
    <div className="space-y-2 max-w-[200px]">
      {groups.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Groups</p>
          {groups.map((group, idx) => {
            const Icon = groupIcons[group.type];
            return (
              <div key={`${group.type}-${group.id || idx}`} className="flex items-center gap-1.5 text-xs">
                <Icon className="h-3 w-3" />
                <span>{group.name}</span>
              </div>
            );
          })}
        </div>
      )}
      {members.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Members</p>
          {members.map(member => (
            <div key={member.employee_id} className="flex items-center gap-1.5 text-xs">
              <Avatar className="h-4 w-4">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {member.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{member.full_name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex items-center",
              sizeClasses.spacing,
              onClick && "cursor-pointer hover:opacity-80 transition-opacity",
              className
            )}
          >
            {/* Group icons */}
            {displayGroups.map((group, idx) => {
              const Icon = groupIcons[group.type];
              return (
                <div
                  key={`${group.type}-${group.id || idx}`}
                  className={cn(
                    "rounded-full flex items-center justify-center ring-2 ring-background",
                    sizeClasses.avatar,
                    groupColors[group.type]
                  )}
                >
                  <Icon className={sizeClasses.icon} />
                </div>
              );
            })}
            
            {/* Member avatars */}
            {displayMembers.map(member => (
              <Avatar
                key={member.employee_id}
                className={cn(sizeClasses.avatar, "ring-2 ring-background")}
              >
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className={cn("bg-primary/10 text-primary", sizeClasses.text)}>
                  {member.full_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}

            {/* Remaining count */}
            {remainingCount > 0 && (
              <div
                className={cn(
                  "rounded-full bg-muted flex items-center justify-center ring-2 ring-background font-medium text-muted-foreground",
                  sizeClasses.avatar,
                  sizeClasses.text
                )}
              >
                +{remainingCount}
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
