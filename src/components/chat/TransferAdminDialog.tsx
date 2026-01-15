import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Crown, LogOut } from "lucide-react";
import { useUpdateSpaceMemberRole, useLeaveSpace } from "@/services/useChat";
import { toast } from "@/hooks/use-toast";
import type { ChatSpaceMember } from "@/types/chat";

interface TransferAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  spaceName: string;
  members: ChatSpaceMember[];
  onTransferComplete: () => void;
}

const TransferAdminDialog = ({
  open,
  onOpenChange,
  spaceId,
  spaceName,
  members,
  onTransferComplete,
}: TransferAdminDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const updateRole = useUpdateSpaceMemberRole();
  const leaveSpace = useLeaveSpace();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredMembers = members.filter((member) => {
    const name = member.employee?.profiles?.full_name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTransferAndLeave = async () => {
    if (!selectedMemberId) return;

    const selectedMember = members.find((m) => m.id === selectedMemberId);
    if (!selectedMember?.employee_id) return;

    setIsTransferring(true);
    try {
      // First, promote the selected member to admin
      await updateRole.mutateAsync({
        spaceId,
        employeeId: selectedMember.employee_id,
        role: "admin",
      });

      // Then leave the space
      await leaveSpace.mutateAsync(spaceId);

      toast({
        title: "Admin transferred",
        description: `${selectedMember?.employee?.profiles?.full_name || "Member"} is now the admin of ${spaceName}`,
      });

      onTransferComplete();
    } catch (error) {
      toast({
        title: "Failed to transfer admin",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Transfer Admin Rights
          </DialogTitle>
          <DialogDescription>
            You are the only admin of <strong>{spaceName}</strong>. Select a
            member to become the new admin before leaving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Member list */}
          <ScrollArea className="h-[240px] rounded-md border">
            <div className="p-2 space-y-1">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No members found
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const name = member.employee?.profiles?.full_name || "Unknown";
                  const avatarUrl = member.employee?.profiles?.avatar_url;
                  const position = member.employee?.position || "";
                  const isSelected = member.id === selectedMemberId;

                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isSelected
                          ? "bg-primary/10 border-2 border-primary"
                          : "hover:bg-muted border-2 border-transparent"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={avatarUrl || undefined} alt={name} />
                        <AvatarFallback>{getInitials(name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{name}</p>
                        {position && (
                          <p className="text-sm text-muted-foreground truncate">
                            {position}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Selected member preview */}
          {selectedMember && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              <Crown className="h-4 w-4 text-amber-500" />
              <span>
                <strong>
                  {selectedMember.employee?.profiles?.full_name || "Selected member"}
                </strong>{" "}
                will become the new admin
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleTransferAndLeave}
            disabled={!selectedMemberId || isTransferring}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isTransferring ? "Transferring..." : "Transfer & Leave"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TransferAdminDialog;
