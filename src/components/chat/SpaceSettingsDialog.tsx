import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, Users, Megaphone } from "lucide-react";
import { useSpace, useUpdateSpace, useDeleteSpace } from "@/services/useChat";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";

interface SpaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onDeleted?: () => void;
}

const SpaceSettingsDialog = ({
  open,
  onOpenChange,
  spaceId,
  onDeleted,
}: SpaceSettingsDialogProps) => {
  const { data: space, isLoading } = useSpace(spaceId);
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spaceType, setSpaceType] = useState<"collaboration" | "announcements">("collaboration");

  useEffect(() => {
    if (space) {
      setName(space.name);
      setDescription(space.description || "");
      setSpaceType(space.space_type);
    }
  }, [space]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a space name");
      return;
    }

    try {
      await updateSpace.mutateAsync({
        spaceId,
        name: name.trim(),
        description: description.trim() || null,
        spaceType,
      });
      toast.success("Space settings updated");
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error, "Failed to update space settings", {
        componentName: "SpaceSettingsDialog",
        actionAttempted: "Update space settings",
        errorType: "database",
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSpace.mutateAsync(spaceId);
      toast.success("Space deleted");
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      showErrorToast(error, "Failed to delete space", {
        componentName: "SpaceSettingsDialog",
        actionAttempted: "Delete space",
        errorType: "database",
      });
    }
  };

  const handleClose = () => {
    if (space) {
      setName(space.name);
      setDescription(space.description || "");
      setSpaceType(space.space_type);
    }
    onOpenChange(false);
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Space Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Space name */}
          <div className="space-y-2">
            <Label>Space name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
            />
            <p className="text-xs text-muted-foreground text-right">
              {name.length}/128
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this space about?"
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* Space type */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Space type</Label>

            <RadioGroup
              value={spaceType}
              onValueChange={(value) => setSpaceType(value as "collaboration" | "announcements")}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="collaboration" id="settings-collaboration" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="settings-collaboration" className="font-medium cursor-pointer">
                      Collaboration
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Everyone can post and reply
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="announcements" id="settings-announcements" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="settings-announcements" className="font-medium cursor-pointer">
                      Announcements
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Only admins can post, everyone can reply
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete space
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this space?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{space?.name}" and all messages in it.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteSpace.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || updateSpace.isPending}>
            {updateSpace.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpaceSettingsDialog;
