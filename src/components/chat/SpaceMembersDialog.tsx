import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, MoreVertical, Shield, UserMinus, Crown, Loader2, RefreshCw, UserPlus } from "lucide-react";
import { useSpaceMembers, useUpdateSpaceMemberRole, useRemoveSpaceMember } from "@/services/chat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import type { ChatSpaceMember } from "@/types/chat";

interface SpaceMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
  onAddMembers: () => void;
  autoSyncEnabled?: boolean;
}

const SpaceMembersDialog = ({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  onAddMembers,
  autoSyncEnabled = false,
}: SpaceMembersDialogProps) => {
  const [search, setSearch] = useState("");
  const { data: members = [], isLoading } = useSpaceMembers(spaceId);
  const { data: currentEmployee } = useCurrentEmployee();
  const updateRole = useUpdateSpaceMemberRole();
  const removeMember = useRemoveSpaceMember();

  const currentMember = members.find(m => m.employee_id === currentEmployee?.id);
  const isCurrentAdmin = currentMember?.role === 'admin';

  const filteredMembers = members.filter(member => {
    const name = member.employee?.profiles?.full_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePromote = async (member: ChatSpaceMember) => {
    try {
      await updateRole.mutateAsync({
        spaceId,
        employeeId: member.employee_id,
        employeeName: member.employee?.profiles?.full_name,
        role: 'admin'
      });
      toast.success(`${member.employee?.profiles?.full_name} is now an admin`);
    } catch (error) {
      showErrorToast(error, "Failed to promote member", {
        componentName: "SpaceMembersDialog",
        actionAttempted: "Promote space member",
        errorType: "database",
      });
    }
  };

  const handleDemote = async (member: ChatSpaceMember) => {
    try {
      await updateRole.mutateAsync({
        spaceId,
        employeeId: member.employee_id,
        employeeName: member.employee?.profiles?.full_name,
        role: 'member'
      });
      toast.success(`${member.employee?.profiles?.full_name} is now a member`);
    } catch (error) {
      showErrorToast(error, "Failed to demote member", {
        componentName: "SpaceMembersDialog",
        actionAttempted: "Demote space member",
        errorType: "database",
      });
    }
  };

  const handleRemove = async (member: ChatSpaceMember) => {
    try {
      await removeMember.mutateAsync({
        spaceId,
        employeeId: member.employee_id,
        employeeName: member.employee?.profiles?.full_name
      });
      toast.success(`${member.employee?.profiles?.full_name} has been removed`);
    } catch (error) {
      showErrorToast(error, "Failed to remove member", {
        componentName: "SpaceMembersDialog",
        actionAttempted: "Remove space member",
        errorType: "database",
      });
    }
  };

  // Check if a member can be removed (only manually added members can be removed)
  const canRemoveMember = (member: ChatSpaceMember) => {
    // Access the source field - members added via auto-sync cannot be removed
    const memberSource = (member as any).source;
    return memberSource === 'manual';
  };

  // Check if member was manually invited
  const isManuallyInvited = (member: ChatSpaceMember) => {
    const memberSource = (member as any).source;
    return memberSource === 'manual';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Members of {spaceName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-sync banner */}
          {autoSyncEnabled && (
            <Alert className="bg-muted/50 border-border">
              <RefreshCw className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Auto-sync is enabled. Members are managed automatically.
                <span className="block text-xs text-muted-foreground mt-1">
                  Only invited members can be removed manually.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Search and Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {isCurrentAdmin && (
              <Button onClick={onAddMembers}>
                Add
              </Button>
            )}
          </div>

          {/* Members list */}
          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No members found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map((member) => {
                  const canRemove = canRemoveMember(member);
                  const isInvited = isManuallyInvited(member);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.employee?.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.employee?.profiles?.full_name || "U")}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {member.employee?.profiles?.full_name}
                          </span>
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {isInvited && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-sky-500/50 text-sky-600">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Invited
                            </Badge>
                          )}
                          {member.employee_id === currentEmployee?.id && (
                            <span className="text-xs text-muted-foreground">(you)</span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {member.employee?.position}
                        </span>
                      </div>

                      {/* Actions - only for admins, can't modify self */}
                      {isCurrentAdmin && member.employee_id !== currentEmployee?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
                            {member.role === 'member' ? (
                              <DropdownMenuItem onClick={() => handlePromote(member)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Make admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleDemote(member)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Remove admin
                              </DropdownMenuItem>
                            )}
                            {canRemove ? (
                              <DropdownMenuItem
                                onClick={() => handleRemove(member)}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="h-4 w-4 mr-2" />
                                Remove from space
                              </DropdownMenuItem>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative flex cursor-not-allowed select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none opacity-50">
                                    <UserMinus className="h-4 w-4 mr-2" />
                                    Remove from space
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p>Cannot remove - added via auto-sync</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpaceMembersDialog;
