import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Search, Crown, LogOut, AlertTriangle, UserSearch, MapPin } from "lucide-react";
import { useUpdateSpaceMemberRole, useLeaveSpace } from "@/services/useChat";
import { showErrorToast } from "@/lib/errorUtils";
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
  const [showConfirmation, setShowConfirmation] = useState(false);

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

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const handleTransferAndLeave = async () => {
    if (!selectedMemberId || !selectedMember?.employee_id) return;

    setIsTransferring(true);
    try {
      // First, promote the selected member to admin
      await updateRole.mutateAsync({
        spaceId,
        employeeId: selectedMember.employee_id,
        role: "admin",
      });
    } catch (error) {
      showErrorToast(error, "Failed to promote new admin", {
        componentName: "TransferAdminDialog",
        actionAttempted: "Promote new admin",
      });
      setIsTransferring(false);
      setShowConfirmation(false);
      return;
    }

    try {
      // Then leave the space
      await leaveSpace.mutateAsync(spaceId);

      toast({
        title: "Admin transferred successfully",
        description: `${selectedMember?.employee?.profiles?.full_name || "Member"} is now the admin of ${spaceName}`,
      });

      setShowConfirmation(false);
      onTransferComplete();
    } catch (error) {
      showErrorToast(error, "Admin promoted but failed to leave space", {
        componentName: "TransferAdminDialog",
        actionAttempted: "Leave space after admin transfer",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleTransferClick = () => {
    if (!selectedMemberId) return;
    setShowConfirmation(true);
  };

  return (
    <>
      <Dialog open={open && !showConfirmation} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Transfer Admin Rights
            </DialogTitle>
            <DialogDescription>
              Select a member to become the new admin of{" "}
              <strong>{spaceName}</strong> before leaving.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Admin warning banner */}
            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-amber-800 dark:text-amber-200">
                You are the only admin of this space
              </span>
            </div>

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
                  <div className="text-center py-8 text-muted-foreground">
                    <UserSearch className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No members found</p>
                    {searchQuery && (
                      <p className="text-xs mt-1">Try a different search term</p>
                    )}
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const name = member.employee?.profiles?.full_name || "Unknown";
                    const avatarUrl = member.employee?.profiles?.avatar_url;
                    const position = member.employee?.position || "";
                    const officeName = (member.employee as any)?.office?.name;
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
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {position && <span className="truncate">{position}</span>}
                            {officeName && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {officeName}
                              </span>
                            )}
                          </div>
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
              <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg text-sm border border-primary/20">
                <Crown className="h-4 w-4 text-amber-500 shrink-0" />
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
              onClick={handleTransferClick}
              disabled={!selectedMemberId}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Transfer & Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Admin Transfer</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>You are about to:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    Make{" "}
                    <strong>
                      {selectedMember?.employee?.profiles?.full_name || "the selected member"}
                    </strong>{" "}
                    the new admin
                  </li>
                  <li>
                    Leave <strong>{spaceName}</strong> permanently
                  </li>
                </ul>
                <p className="text-sm pt-2">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferAndLeave}
              disabled={isTransferring}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isTransferring ? "Transferring..." : "Confirm Transfer & Leave"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransferAdminDialog;
