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

export interface TaskMemberWithAccess {
  employee_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  permission: 'view' | 'edit' | 'admin';
  added_at: string;
}

export interface TaskOwnerInfo {
  employee_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
}

interface Office { id: string; name: string; }
interface Project { id: string; name: string; }
interface Employee {
  id: string;
  user_id: string;
  office_id?: string | null;
  department?: string | null;
  profiles: { full_name: string; avatar_url: string | null; email?: string; };
}

type TaskAccessScope = 'company' | 'offices' | 'departments' | 'projects' | 'members';
type TaskPermLevel = 'view' | 'edit' | 'admin';

interface TaskMembersWithAccessProps {
  members: TaskMemberWithAccess[];
  isLoading: boolean;
  onUpdatePermission: (employeeId: string, permission: TaskPermLevel) => void;
  onRemoveMember: (employeeId: string) => void;
  isUpdating?: string | null;
  canEdit?: boolean;
  owner?: TaskOwnerInfo | null;
  canTransferOwnership?: boolean;
  onTransferOwnership?: () => void;
  accessScope?: TaskAccessScope;
  permissionLevel?: TaskPermLevel;
  offices?: Office[];
  departments?: string[];
  projects?: Project[];
  selectedOffices?: string[];
  selectedDepartments?: string[];
  selectedProjects?: string[];
  employees?: Employee[];
  onRemoveOffice?: (officeId: string) => void;
  onRemoveDepartment?: (department: string) => void;
  onRemoveProject?: (projectId: string) => void;
  onClearCompanyAccess?: () => void;
  onChangeGroupPermission?: (permission: TaskPermLevel) => void;
  isChangingPermission?: boolean;
}

export const TaskMembersWithAccess = ({
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
  permissionLevel = 'edit',
  offices = [],
  departments = [],
  projects = [],
  selectedOffices = [],
  selectedDepartments = [],
  selectedProjects = [],
  employees = [],
  onRemoveOffice,
  onRemoveDepartment,
  onRemoveProject,
  onClearCompanyAccess,
  onChangeGroupPermission,
  isChangingPermission = false,
}: TaskMembersWithAccessProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getMemberCountForOffice = (officeId: string) =>
    employees.filter(e => e.office_id === officeId).length;

  const getMemberCountForDepartment = (dept: string) =>
    employees.filter(e => e.department === dept).length;

  const PermDropdown = ({ current, onChange, disabled }: { current: TaskPermLevel; onChange: (p: TaskPermLevel) => void; disabled?: boolean }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" disabled={disabled}>
          {disabled ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
          <span className="text-sm">can {current}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        {(['view', 'edit', 'admin'] as TaskPermLevel[]).map(p => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)} className={cn(current === p && 'bg-muted')}>
            can {p}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const hasGroupAccess = accessScope === 'company' ||
    (accessScope === 'offices' && selectedOffices.length > 0) ||
    (accessScope === 'departments' && selectedDepartments.length > 0) ||
    (accessScope === 'projects' && selectedProjects.length > 0);

  if (!owner && !hasGroupAccess && members.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No one has been added yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Owner */}
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
            <Button variant="ghost" size="sm" onClick={onTransferOwnership} className="h-8 gap-1.5 text-muted-foreground/60 hover:text-foreground hover:bg-muted">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span className="text-xs">Transfer</span>
            </Button>
          )}
        </div>
      )}

      {/* Company-wide */}
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
          <div className="flex items-center gap-1">
            {canEdit && onChangeGroupPermission ? (
              <PermDropdown current={permissionLevel} onChange={onChangeGroupPermission} disabled={isChangingPermission} />
            ) : (
              <span className="text-sm text-muted-foreground px-2">can {permissionLevel}</span>
            )}
            {canEdit && onClearCompanyAccess && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10" onClick={onClearCompanyAccess}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Office rows */}
      {accessScope === 'offices' && selectedOffices.length > 0 && offices.filter(o => selectedOffices.includes(o.id)).map(office => (
        <div key={office.id} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{office.name}</span>
              <span className="text-xs text-muted-foreground">{getMemberCountForOffice(office.id)} members</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && onChangeGroupPermission ? (
              <PermDropdown current={permissionLevel} onChange={onChangeGroupPermission} disabled={isChangingPermission} />
            ) : (
              <span className="text-sm text-muted-foreground px-2">can {permissionLevel}</span>
            )}
            {canEdit && onRemoveOffice && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10" onClick={() => onRemoveOffice(office.id)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Department rows */}
      {accessScope === 'departments' && selectedDepartments.length > 0 && selectedDepartments.map(dept => (
        <div key={dept} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{dept}</span>
              <span className="text-xs text-muted-foreground">{getMemberCountForDepartment(dept)} members</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && onChangeGroupPermission ? (
              <PermDropdown current={permissionLevel} onChange={onChangeGroupPermission} disabled={isChangingPermission} />
            ) : (
              <span className="text-sm text-muted-foreground px-2">can {permissionLevel}</span>
            )}
            {canEdit && onRemoveDepartment && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10" onClick={() => onRemoveDepartment(dept)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Project rows */}
      {accessScope === 'projects' && selectedProjects.length > 0 && projects.filter(p => selectedProjects.includes(p.id)).map(project => (
        <div key={project.id} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-amber-500/10 flex items-center justify-center">
              <FolderKanban className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{project.name}</span>
              <span className="text-xs text-muted-foreground">Project</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && onChangeGroupPermission ? (
              <PermDropdown current={permissionLevel} onChange={onChangeGroupPermission} disabled={isChangingPermission} />
            ) : (
              <span className="text-sm text-muted-foreground px-2">can {permissionLevel}</span>
            )}
            {canEdit && onRemoveProject && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10" onClick={() => onRemoveProject(project.id)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Individual members */}
      {members.map((member) => (
        <div key={member.employee_id} className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-muted/50 group">
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
                <PermDropdown
                  current={member.permission}
                  onChange={(p) => onUpdatePermission(member.employee_id, p)}
                  disabled={isUpdating === member.employee_id}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveMember(member.employee_id)}
                  disabled={isUpdating === member.employee_id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground px-2">can {member.permission}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
