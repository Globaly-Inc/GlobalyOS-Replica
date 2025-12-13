import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Users, Megaphone, Building2 } from "lucide-react";
import { useCreateSpace } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import type { ActiveChat } from "@/types/chat";

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpaceCreated: (chat: ActiveChat) => void;
}

const CreateSpaceDialog = ({ open, onOpenChange, onSpaceCreated }: CreateSpaceDialogProps) => {
  const [name, setName] = useState("");
  const [spaceType, setSpaceType] = useState<"collaboration" | "announcements">("collaboration");
  const [accessType, setAccessType] = useState<"public" | "private">("public");
  
  const { currentOrg } = useOrganization();
  const createSpace = useCreateSpace();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a space name");
      return;
    }

    try {
      const space = await createSpace.mutateAsync({
        name: name.trim(),
        spaceType,
        accessType,
      });

      onSpaceCreated({
        type: 'space',
        id: space.id,
        name: space.name,
      });

      setName("");
      setSpaceType("collaboration");
      setAccessType("public");
      onOpenChange(false);
      toast.success("Space created");
    } catch (error) {
      console.error("Error creating space:", error);
      toast.error("Failed to create space");
    }
  };

  const handleClose = () => {
    setName("");
    setSpaceType("collaboration");
    setAccessType("public");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a space</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Space name */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-muted text-muted-foreground">
                <Users className="h-6 w-6" />
              </div>
              <Input
                placeholder="Space name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1"
                maxLength={128}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {name.length}/128
            </p>
          </div>

          {/* Space type */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-semibold">What is this space for?</Label>
              <p className="text-sm text-muted-foreground">
                Optimize your space with helpful settings and app suggestions.
              </p>
            </div>

            <RadioGroup 
              value={spaceType} 
              onValueChange={(value) => setSpaceType(value as "collaboration" | "announcements")}
              className="space-y-3"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="collaboration" id="collaboration" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="collaboration" className="font-medium cursor-pointer">
                    Collaboration
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Collaborate on projects, plans, or topics. Easily share files, assign tasks, and organize your conversations by threads.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="announcements" id="announcements" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="announcements" className="font-medium cursor-pointer">
                    Announcements
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Broadcast and share updates with your group.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Access settings */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Access settings</Label>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-primary">{currentOrg?.name || "Organization"}</p>
                <p className="text-sm text-muted-foreground">
                  {accessType === 'public' 
                    ? "Anyone in this group can find, view, and join"
                    : "Only invited members can access"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={!name.trim() || createSpace.isPending}
          >
            {createSpace.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSpaceDialog;
