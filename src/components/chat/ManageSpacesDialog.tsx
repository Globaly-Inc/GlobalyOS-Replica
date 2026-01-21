import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Hash,
  Archive,
  ArchiveRestore,
  Trash2,
  Users,
  Lock,
  Globe,
  Search,
  Eye,
  Loader2,
  Building,
  FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  useAllSpaces,
  useDeleteSpace,
  useArchiveSpace,
  useRestoreSpace,
  useJoinSpaceAsAdmin,
} from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import type { ActiveChat, ChatSpace } from "@/types/chat";

interface ManageSpacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChat: (chat: ActiveChat) => void;
}

type SpaceWithMeta = ChatSpace & {
  creator_name: string;
  creator_avatar: string | null;
  chat_space_members?: { id: string; employee_id: string; role: string }[];
};

const ManageSpacesDialog = ({
  open,
  onOpenChange,
  onSelectChat,
}: ManageSpacesDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SpaceWithMeta | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: allSpaces = [], isLoading } = useAllSpaces(showArchived);
  const { data: currentEmployee } = useCurrentEmployee();
  const deleteSpace = useDeleteSpace();
  const archiveSpace = useArchiveSpace();
  const restoreSpace = useRestoreSpace();
  const joinSpaceAsAdmin = useJoinSpaceAsAdmin();

  const filteredSpaces = allSpaces.filter((space) =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAccessIcon = (space: ChatSpace) => {
    if (space.access_type === "public") {
      return <Globe className="h-3 w-3" />;
    }
    if (space.access_scope === "offices") {
      return <Building className="h-3 w-3" />;
    }
    if (space.access_scope === "projects") {
      return <FolderKanban className="h-3 w-3" />;
    }
    return <Lock className="h-3 w-3" />;
  };

  const getAccessLabel = (space: ChatSpace) => {
    if (space.access_type === "public") return "Public";
    if (space.access_scope === "offices") return "Office";
    if (space.access_scope === "projects") return "Project";
    if (space.access_scope === "members") return "Private";
    return "Private";
  };

  const isMemberOfSpace = (space: SpaceWithMeta) => {
    return space.chat_space_members?.some(
      (m) => m.employee_id === currentEmployee?.id
    );
  };

  const handleViewSpace = async (space: SpaceWithMeta) => {
    setActionLoading(space.id);
    try {
      // If not a member, join as admin first
      if (!isMemberOfSpace(space)) {
        await joinSpaceAsAdmin.mutateAsync(space.id);
        toast.success("Joined space as admin");
      }

      onSelectChat({
        type: "space",
        id: space.id,
        name: space.name,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to join space");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (space: SpaceWithMeta) => {
    setActionLoading(space.id);
    try {
      await archiveSpace.mutateAsync(space.id);
      toast.success(`"${space.name}" has been archived`);
    } catch (error: any) {
      toast.error(error.message || "Failed to archive space");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (space: SpaceWithMeta) => {
    setActionLoading(space.id);
    try {
      await restoreSpace.mutateAsync(space.id);
      toast.success(`"${space.name}" has been restored`);
    } catch (error: any) {
      toast.error(error.message || "Failed to restore space");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoading(deleteConfirm.id);
    try {
      await deleteSpace.mutateAsync(deleteConfirm.id);
      toast.success(`"${deleteConfirm.name}" has been permanently deleted`);
      setDeleteConfirm(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete space");
    } finally {
      setActionLoading(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage All Spaces</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search & Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search spaces..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={(checked) => setShowArchived(!!checked)}
                />
                <label
                  htmlFor="show-archived"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Show archived
                </label>
              </div>
            </div>

            {/* Spaces List */}
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredSpaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Hash className="h-8 w-8 mb-2" />
                  <p className="text-sm">No spaces found</p>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredSpaces.map((space) => (
                    <div
                      key={space.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border bg-card",
                        space.archived_at && "opacity-60"
                      )}
                    >
                      {/* Space Icon */}
                      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Hash className="h-5 w-5 text-muted-foreground" />
                      </div>

                      {/* Space Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {space.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] gap-1"
                          >
                            {getAccessIcon(space)}
                            {getAccessLabel(space)}
                          </Badge>
                          {space.archived_at && (
                            <Badge variant="outline" className="text-[10px]">
                              Archived
                            </Badge>
                          )}
                          {!isMemberOfSpace(space) && (
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-600 border-amber-300"
                            >
                              Not a member
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {space.member_count} members
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={space.creator_avatar || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {getInitials(space.creator_name)}
                              </AvatarFallback>
                            </Avatar>
                            {space.creator_name}
                          </span>
                          <span>•</span>
                          <span>
                            Created{" "}
                            {format(new Date(space.created_at), "dd MMM yyyy")}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewSpace(space)}
                          disabled={actionLoading === space.id}
                        >
                          {actionLoading === space.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>

                        {space.archived_at ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleRestore(space)}
                            disabled={actionLoading === space.id}
                          >
                            <ArchiveRestore className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => handleArchive(space)}
                            disabled={actionLoading === space.id}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirm(space)}
                          disabled={actionLoading === space.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Space Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteConfirm?.name}" and all its
              messages, files, and history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === deleteConfirm?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading === deleteConfirm?.id}
            >
              {actionLoading === deleteConfirm?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ManageSpacesDialog;
