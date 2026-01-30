import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Hash, Users, Lock, Globe } from "lucide-react";
import { usePublicSpaces, useJoinSpace } from "@/services/chat";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import type { ActiveChat, ChatSpace } from "@/types/chat";

interface BrowseSpacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpaceJoined?: (chat: ActiveChat) => void;
}

const BrowseSpacesDialog = ({ open, onOpenChange, onSpaceJoined }: BrowseSpacesDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: spaces = [], isLoading } = usePublicSpaces();
  const joinSpace = useJoinSpace();

  const filteredSpaces = spaces.filter(space =>
    space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (space.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleJoinSpace = async (space: ChatSpace) => {
    try {
      await joinSpace.mutateAsync(space.id);
      toast.success(`Joined ${space.name}`);
      onSpaceJoined?.({
        type: 'space',
        id: space.id,
        name: space.name,
      });
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, "Failed to join space", {
        componentName: "BrowseSpacesDialog",
        actionAttempted: "Join space",
        errorType: "database",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Browse Spaces</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Spaces list */}
          <ScrollArea className="h-[350px]">
            <div className="space-y-2 pr-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading spaces...
                </div>
              ) : filteredSpaces.length === 0 ? (
                <div className="text-center py-8">
                  <Hash className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No spaces found" : "No spaces available to join"}
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {searchQuery ? "Try a different search term" : "All public spaces have been joined"}
                  </p>
                </div>
              ) : (
                filteredSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{space.name}</h4>
                        {space.access_type === 'public' ? (
                          <Globe className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      {space.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {space.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Users className="h-3 w-3" />
                          {space.member_count} {space.member_count === 1 ? 'member' : 'members'}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {space.space_type}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleJoinSpace(space)}
                      disabled={joinSpace.isPending}
                    >
                      Join
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BrowseSpacesDialog;
