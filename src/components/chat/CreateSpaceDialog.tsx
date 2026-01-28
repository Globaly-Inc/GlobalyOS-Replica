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
import { Loader2, MessageSquare, Megaphone } from "lucide-react";
import { useCreateSpace } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { showErrorToast } from "@/lib/errorUtils";
import { toast } from "sonner";
import type { ActiveChat } from "@/types/chat";
import SpaceImagePicker from "./SpaceImagePicker";
import AccessScopeSelector, { type AccessScope } from "./AccessScopeSelector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface CreateSpaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSpaceCreated: (chat: ActiveChat) => void;
}

const CreateSpaceDialog = ({ open, onOpenChange, onSpaceCreated }: CreateSpaceDialogProps) => {
  const [name, setName] = useState("");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [spaceType, setSpaceType] = useState<'collaboration' | 'announcements'>('collaboration');
  const [accessScope, setAccessScope] = useState<AccessScope>("company");
  
  // Multi-criteria selections for 'custom' scope
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [officesEnabled, setOfficesEnabled] = useState(false);
  const [departmentsEnabled, setDepartmentsEnabled] = useState(false);
  const [projectsEnabled, setProjectsEnabled] = useState(false);
  
  // Member selection for 'members' scope and additional invites
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  
  // Enable manual member invites alongside Group Access
  const [inviteAdditionalMembers, setInviteAdditionalMembers] = useState(false);
  
  // Membership option - add all matching members now
  const [addAllMembers, setAddAllMembers] = useState(false);
  
  const createSpace = useCreateSpace();
  const { data: currentEmployee } = useCurrentEmployee();

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return "Please enter a space name";
    }
    if (accessScope === 'custom') {
      const hasAnyCriteria = 
        (officesEnabled && selectedOfficeIds.length > 0) ||
        (departmentsEnabled && selectedDepartmentIds.length > 0) ||
        (projectsEnabled && selectedProjectIds.length > 0);
      if (!hasAnyCriteria) {
        return "Please select at least one criterion for group access";
      }
    }
    if (accessScope === 'members' && selectedMemberIds.length === 0) {
      return "Please select at least one team member";
    }
    return null;
  };

  // Clear related state when switching scopes
  useEffect(() => {
    if (accessScope === 'members') {
      setAddAllMembers(false);
      setInviteAdditionalMembers(false);
    }
    if (accessScope !== 'custom') {
      setInviteAdditionalMembers(false);
      // Clear additional members when not in custom scope (but keep for members scope)
      if (accessScope !== 'members') {
        setSelectedMemberIds([]);
      }
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
        spaceType,
        accessScope,
        officeIds: accessScope === 'custom' && officesEnabled ? selectedOfficeIds : undefined,
        departmentIds: accessScope === 'custom' && departmentsEnabled ? selectedDepartmentIds : undefined,
        projectIds: accessScope === 'custom' && projectsEnabled ? selectedProjectIds : undefined,
        // For 'members' scope: pass selected members
        // For 'custom' scope with inviteAdditionalMembers: also pass selected members
        memberIds: accessScope === 'members' 
          ? selectedMemberIds 
          : (accessScope === 'custom' && inviteAdditionalMembers ? selectedMemberIds : undefined),
        addAllMembers: (accessScope === 'company' || accessScope === 'custom') ? addAllMembers : false,
        autoSync: accessScope !== 'members', // Always true for company/group
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
    setSpaceType("collaboration");
    setAccessScope("company");
    setSelectedOfficeIds([]);
    setSelectedDepartmentIds([]);
    setSelectedProjectIds([]);
    setOfficesEnabled(false);
    setDepartmentsEnabled(false);
    setProjectsEnabled(false);
    setSelectedMemberIds([]);
    setAddAllMembers(false);
    setInviteAdditionalMembers(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Show membership options for company-wide and group access scopes
  const showMembershipOptions = accessScope === 'company' || accessScope === 'custom';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
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

            {/* Space Type */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Space type</Label>
              <RadioGroup
                value={spaceType}
                onValueChange={(v) => setSpaceType(v as 'collaboration' | 'announcements')}
                className="space-y-2"
              >
                <div 
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    spaceType === 'collaboration' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  )}
                  onClick={() => setSpaceType('collaboration')}
                >
                  <RadioGroupItem value="collaboration" id="collaboration" className="mt-1" />
                  <MessageSquare className={cn("h-5 w-5 mt-0.5", spaceType === 'collaboration' ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="flex-1">
                    <Label htmlFor="collaboration" className="font-medium cursor-pointer">
                      Collaboration
                    </Label>
                    <p className="text-sm text-muted-foreground">Everyone can post messages</p>
                  </div>
                </div>
                
                <div 
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    spaceType === 'announcements' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  )}
                  onClick={() => setSpaceType('announcements')}
                >
                  <RadioGroupItem value="announcements" id="announcements" className="mt-1" />
                  <Megaphone className={cn("h-5 w-5 mt-0.5", spaceType === 'announcements' ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="flex-1">
                    <Label htmlFor="announcements" className="font-medium cursor-pointer">
                      Announcement
                    </Label>
                    <p className="text-sm text-muted-foreground">Only admins can post, members can view</p>
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
              selectedDepartmentIds={selectedDepartmentIds}
              onDepartmentIdsChange={setSelectedDepartmentIds}
              selectedProjectIds={selectedProjectIds}
              onProjectIdsChange={setSelectedProjectIds}
              officesEnabled={officesEnabled}
              onOfficesEnabledChange={setOfficesEnabled}
              departmentsEnabled={departmentsEnabled}
              onDepartmentsEnabledChange={setDepartmentsEnabled}
              projectsEnabled={projectsEnabled}
              onProjectsEnabledChange={setProjectsEnabled}
              selectedMemberIds={selectedMemberIds}
              onMemberIdsChange={setSelectedMemberIds}
              currentEmployeeId={currentEmployee?.id}
              inviteAdditionalMembers={inviteAdditionalMembers}
              onInviteAdditionalMembersChange={setInviteAdditionalMembers}
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
