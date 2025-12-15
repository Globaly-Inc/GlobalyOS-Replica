import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, ChevronDown, X, Loader2, Building2, Users, FolderKanban, Crown, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { WikiAccessScope } from "./WikiShareDialog";

export interface MemberWithAccess {
  employee_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  permission: 'view' | 'edit';
  added_at: string;
  added_by_name: string | null;
}

export interface OwnerInfo {
  employee_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

interface Office {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  user_id: string;
  office_id?: string | null;
  department?: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
    email?: string;
  };
}

interface WikiMembersWithAccessProps {
  members: MemberWithAccess[];
  isLoading: boolean;
  onUpdatePermission: (employeeId: string, permission: 'view' | 'edit') => void;
  onRemoveMember: (employeeId: string) => void;
  isUpdating?: string | null;
  canEdit?: boolean;
  // Owner props
  owner?: OwnerInfo | null;
  canTransferOwnership?: boolean;
  onTransferOwnership?: () => void;
  // Group access props
  accessScope?: WikiAccessScope;
  permissionLevel?: 'view' | 'edit';
  offices?: Office[];
  departments?: string[];
  projects?: Project[];
  selectedOffices?: string[];
  selectedDepartments?: string[];
  selectedProjects?: string[];
  employees?: Employee[];
}

export const WikiMembersWithAccess = ({
  members,
  isLoading,
  onUpdatePermission,
  onRemoveMember,
  isUpdating,
  canEdit = true,
  owner,
  canTransferOwnership = false,
  onTransferOwnership,
  accessScope = 'members',
  permissionLevel = 'view',
  offices = [],
  departments = [],
  projects = [],
  selectedOffices = [],
  selectedDepartments = [],
  selectedProjects = [],
  employees = [],
}: WikiMembersWithAccessProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate member counts for groups
  const getMemberCountForOffice = (officeId: string) => 
    employees.filter(e => e.office_id === officeId).length;
  
  const getMemberCountForDepartment = (dept: string) => 
    employees.filter(e => e.department === dept).length;

  // Check if we have any group access or members to show
  const hasGroupAccess = accessScope === 'company' || 
    (accessScope === 'offices' && selectedOffices.length > 0) ||
    (accessScope === 'departments' && selectedDepartments.length > 0) ||
    (accessScope === 'projects' && selectedProjects.length > 0);

  // Always show individual members if they exist (regardless of access scope)
  const hasMembers = members.length > 0;

  if (!owner && !hasGroupAccess && !hasMembers) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No one has been added yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Owner Section */}
      {owner && (
        <div className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-9 w-9">
                <AvatarImage src={owner.avatar_url || undefined} />
                <AvatarFallback className="text-sm bg-amber-500/10 text-amber-600">
                  {owner.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center">
                <Crown className="h-2.5 w-2.5 text-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{owner.full_name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-700 border-amber-500/20">
                  Owner
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">{owner.email}</span>
            </div>
          </div>
          {canTransferOwnership && onTransferOwnership && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onTransferOwnership}
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span className="text-xs">Transfer</span>
            </Button>
          )}
        </div>
      )}

      {/* Company-wide access */}
      {accessScope === 'company' && (
        <div className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Everyone</span>
              <span className="text-xs text-muted-foreground">{employees.length} members</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm px-2">
            <Globe className="h-3.5 w-3.5" />
            <span>can {permissionLevel}</span>
          </div>
        </div>
      )}

      {/* Office-based access */}
      {accessScope === 'offices' && selectedOffices.length > 0 && (
        <>
          {offices.filter(o => selectedOffices.includes(o.id)).map(office => (
            <div
              key={office.id}
              className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{office.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getMemberCountForOffice(office.id)} members
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm px-2">
                <Globe className="h-3.5 w-3.5" />
                <span>can {permissionLevel}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Department-based access */}
      {accessScope === 'departments' && selectedDepartments.length > 0 && (
        <>
          {selectedDepartments.map(dept => (
            <div
              key={dept}
              className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{dept}</span>
                  <span className="text-xs text-muted-foreground">
                    {getMemberCountForDepartment(dept)} members
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm px-2">
                <Globe className="h-3.5 w-3.5" />
                <span>can {permissionLevel}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Project-based access */}
      {accessScope === 'projects' && selectedProjects.length > 0 && (
        <>
          {projects.filter(p => selectedProjects.includes(p.id)).map(project => (
            <div
              key={project.id}
              className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <FolderKanban className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{project.name}</span>
                  <span className="text-xs text-muted-foreground">Project</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm px-2">
                <Globe className="h-3.5 w-3.5" />
                <span>can {permissionLevel}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Individual members - always show if they exist */}
      {members.map((member) => (
        <div
          key={member.employee_id}
          className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="text-sm bg-primary/10 text-primary">
                {member.full_name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{member.full_name}</span>
              <span className="text-xs text-muted-foreground">{member.email}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {canEdit ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                      disabled={isUpdating === member.employee_id}
                    >
                      {isUpdating === member.employee_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Globe className="h-3.5 w-3.5" />
                      )}
                      <span className="text-sm">can {member.permission}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem
                      onClick={() => onUpdatePermission(member.employee_id, 'edit')}
                      className={cn(member.permission === 'edit' && 'bg-muted')}
                    >
                      can edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdatePermission(member.employee_id, 'view')}
                      className={cn(member.permission === 'view' && 'bg-muted')}
                    >
                      can view
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveMember(member.employee_id)}
                  disabled={isUpdating === member.employee_id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm px-2">
                <Globe className="h-3.5 w-3.5" />
                <span>can {member.permission}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
