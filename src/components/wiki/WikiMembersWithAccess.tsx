import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, ChevronDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface WikiMembersWithAccessProps {
  members: MemberWithAccess[];
  isLoading: boolean;
  onUpdatePermission: (employeeId: string, permission: 'view' | 'edit') => void;
  onRemoveMember: (employeeId: string) => void;
  isUpdating?: string | null;
  canEdit?: boolean;
}

export const WikiMembersWithAccess = ({
  members,
  isLoading,
  onUpdatePermission,
  onRemoveMember,
  isUpdating,
  canEdit = true,
}: WikiMembersWithAccessProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        No members have been added yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
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
                      className={cn(member.permission === 'edit' && "bg-muted")}
                    >
                      can edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onUpdatePermission(member.employee_id, 'view')}
                      className={cn(member.permission === 'view' && "bg-muted")}
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
