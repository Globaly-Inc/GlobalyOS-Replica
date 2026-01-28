import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, HelpCircle } from "lucide-react";
import { useCreateSpace } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { showErrorToast } from "@/lib/errorUtils";
import { toast } from "sonner";
import type { ActiveChat } from "@/types/chat";
import SpaceImagePicker from "./SpaceImagePicker";
import AccessScopeSelector, { type AccessScope } from "./AccessScopeSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpaceCreated: (chat: ActiveChat) => void;
}

const CreateSpaceDialog = ({ open, onOpenChange, onSpaceCreated }: CreateSpaceDialogProps) => {
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [accessScope, setAccessScope] = useState<AccessScope>("company");
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [addAllMembers, setAddAllMembers] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  
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

  // Reset addAllMembers and autoSync when switching to 'members' scope
  useEffect(() => {
    if (accessScope === 'members') {
      setAddAllMembers(false);
      setAutoSync(false);
    }
  }, [accessScope]);

  const handleCreate = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const space = await createSpace.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        iconUrl: iconUrl || undefined,
        accessScope,
        officeIds: accessScope === 'offices' ? selectedOfficeIds : undefined,
        projectIds: accessScope === 'projects' ? selectedProjectIds : undefined,
        memberIds: accessScope === 'members' ? selectedMemberIds : undefined,
        addAllMembers: accessScope !== 'members' ? addAllMembers : false,
        autoSync: accessScope !== 'members' ? autoSync : false,
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
      showErrorToast(error, "Failed to create space", {
        componentName: "CreateSpaceDialog",
        actionAttempted: "Create space",
        errorType: "database",
      });
    }
  };

  const resetForm = () => {
    setName("");
    setIconUrl(null);
    setDescription("");
    setAccessScope("company");
    setSelectedOfficeIds([]);
    setSelectedProjectIds([]);
    setSelectedMemberIds([]);
    setAddAllMembers(false);
    setAutoSync(false);
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What is this space about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/500
              </p>
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
        <div className="flex justify-between items-center gap-2 pt-4 border-t">
          {/* Left side: Options */}
          <div className="flex items-center gap-4">
            {accessScope !== 'members' && (
              <>
                {/* Add all members checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="addAll"
                    checked={addAllMembers}
                    onCheckedChange={(checked) => setAddAllMembers(!!checked)}
                  />
                  <Label htmlFor="addAll" className="text-sm font-normal cursor-pointer">
                    Add all members
                  </Label>
                </div>
                
                {/* Auto-sync toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="autoSync"
                    checked={autoSync}
                    onCheckedChange={setAutoSync}
                  />
                  <Label htmlFor="autoSync" className="text-sm font-normal cursor-pointer">
                    Auto-sync
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      Automatically add/remove members when team members join or leave
                    </TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}
          </div>

          {/* Right side: Actions */}
          <div className="flex gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSpaceDialog;
