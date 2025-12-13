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
import { Loader2, Users, Megaphone } from "lucide-react";
import { useCreateSpace } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { toast } from "sonner";
import type { ActiveChat } from "@/types/chat";
import SpaceImagePicker from "./SpaceImagePicker";
import AccessScopeSelector, { type AccessScope } from "./AccessScopeSelector";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpaceCreated: (chat: ActiveChat) => void;
}

const CreateSpaceDialog = ({ open, onOpenChange, onSpaceCreated }: CreateSpaceDialogProps) => {
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [spaceType, setSpaceType] = useState<"collaboration" | "announcements">("collaboration");
  const [accessScope, setAccessScope] = useState<AccessScope>("company");
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  const createSpace = useCreateSpace();
  const { data: currentEmployee } = useCurrentEmployee();

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return "Please enter a space name";
    }
    if (accessScope === 'offices' && selectedOfficeIds.length === 0) {
      return "Please select at least one office";
    }
    if (accessScope === 'projects' && selectedProjectIds.length === 0) {
      return "Please select at least one project";
    }
    if (accessScope === 'members' && selectedMemberIds.length === 0) {
      return "Please select at least one team member";
    }
    return null;
  };

  const handleCreate = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const space = await createSpace.mutateAsync({
        name: name.trim(),
        iconUrl: iconUrl || undefined,
        spaceType,
        accessScope,
        officeIds: accessScope === 'offices' ? selectedOfficeIds : undefined,
        projectIds: accessScope === 'projects' ? selectedProjectIds : undefined,
        memberIds: accessScope === 'members' ? selectedMemberIds : undefined,
      });

      onSpaceCreated({
        type: 'space',
        id: space.id,
        name: space.name,
        iconUrl: space.icon_url,
      });

      resetForm();
      onOpenChange(false);
      toast.success("Space created");
    } catch (error) {
      console.error("Error creating space:", error);
      toast.error("Failed to create space");
    }
  };

  const resetForm = () => {
    setName("");
    setIconUrl(null);
    setSpaceType("collaboration");
    setAccessScope("company");
    setSelectedOfficeIds([]);
    setSelectedProjectIds([]);
    setSelectedMemberIds([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create a space</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 pb-2">
            {/* Space name with image picker */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <SpaceImagePicker value={iconUrl} onChange={setIconUrl} />
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
                  Optimize your space with helpful settings.
                </p>
              </div>

              <RadioGroup 
                value={spaceType} 
                onValueChange={(value) => setSpaceType(value as "collaboration" | "announcements")}
                className="space-y-2"
              >
                <div 
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    spaceType === 'collaboration' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSpaceType('collaboration')}
                >
                  <RadioGroupItem value="collaboration" id="collaboration" className="mt-1" />
                  <Users className={`h-5 w-5 mt-0.5 ${spaceType === 'collaboration' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <Label htmlFor="collaboration" className="font-medium cursor-pointer">
                      Collaboration
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Collaborate on projects, plans, or topics. Easily share files and organize conversations.
                    </p>
                  </div>
                </div>

                <div 
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    spaceType === 'announcements' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => setSpaceType('announcements')}
                >
                  <RadioGroupItem value="announcements" id="announcements" className="mt-1" />
                  <Megaphone className={`h-5 w-5 mt-0.5 ${spaceType === 'announcements' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="flex-1">
                    <Label htmlFor="announcements" className="font-medium cursor-pointer">
                      Announcements
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Broadcast and share updates. Only admins can post.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Access settings */}
            <AccessScopeSelector
              value={accessScope}
              onChange={setAccessScope}
              selectedOfficeIds={selectedOfficeIds}
              onOfficeIdsChange={setSelectedOfficeIds}
              selectedProjectIds={selectedProjectIds}
              onProjectIdsChange={setSelectedProjectIds}
              selectedMemberIds={selectedMemberIds}
              onMemberIdsChange={setSelectedMemberIds}
              currentEmployeeId={currentEmployee?.id}
            />
          </div>
        </ScrollArea>

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
