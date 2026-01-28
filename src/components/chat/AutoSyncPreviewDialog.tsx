import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserPlus, UserMinus, Info } from "lucide-react";

interface SyncMember {
  id: string;
  name: string;
  position?: string;
  avatar_url?: string | null;
}

interface AutoSyncPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membersToAdd: SyncMember[];
  membersToRemove: SyncMember[];
  onConfirm: () => Promise<void>;
  isPending: boolean;
}

const AutoSyncPreviewDialog = ({
  open,
  onOpenChange,
  membersToAdd,
  membersToRemove,
  onConfirm,
  isPending,
}: AutoSyncPreviewDialogProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const hasChanges = membersToAdd.length > 0 || membersToRemove.length > 0;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sync Members</DialogTitle>
          <DialogDescription>
            Enabling auto-sync will make the following changes:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasChanges ? (
            <div className="text-center py-6 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>All members are already in sync.</p>
              <p className="text-sm mt-1">No changes needed.</p>
            </div>
          ) : (
            <>
              {/* Members to Add */}
              {membersToAdd.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <UserPlus className="h-4 w-4" />
                    <span>{membersToAdd.length} member{membersToAdd.length !== 1 ? 's' : ''} to be added</span>
                  </div>
                  <ScrollArea className="max-h-[120px] rounded-lg border bg-muted/30 p-2">
                    <div className="space-y-1">
                      {membersToAdd.slice(0, 5).map((member) => (
                        <div key={member.id} className="flex items-center gap-2 p-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{member.name}</span>
                          {member.position && (
                            <span className="text-xs text-muted-foreground">({member.position})</span>
                          )}
                        </div>
                      ))}
                      {membersToAdd.length > 5 && (
                        <div className="text-xs text-muted-foreground pl-8">
                          +{membersToAdd.length - 5} more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Members to Remove */}
              {membersToRemove.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                    <UserMinus className="h-4 w-4" />
                    <span>{membersToRemove.length} member{membersToRemove.length !== 1 ? 's' : ''} to be removed</span>
                  </div>
                  <ScrollArea className="max-h-[120px] rounded-lg border bg-muted/30 p-2">
                    <div className="space-y-1">
                      {membersToRemove.slice(0, 5).map((member) => (
                        <div key={member.id} className="flex items-center gap-2 p-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(member.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{member.name}</span>
                          {member.position && (
                            <span className="text-xs text-muted-foreground">({member.position})</span>
                          )}
                        </div>
                      ))}
                      {membersToRemove.length > 5 && (
                        <div className="text-xs text-muted-foreground pl-8">
                          +{membersToRemove.length - 5} more
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {hasChanges ? 'Proceed with Sync' : 'Enable Auto-Sync'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AutoSyncPreviewDialog;
