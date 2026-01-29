import { useState, useEffect, useMemo } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Loader2, Trash2, Megaphone, Archive, MessageSquare, Info } from "lucide-react";
import { useSpace, useUpdateSpace, useDeleteSpace, useArchiveSpace, useSpaceMembers, useAddSpaceMembers, useRemoveSpaceMember } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import AutoSyncPreviewDialog from "./AutoSyncPreviewDialog";
import AccessScopeSelector, { type AccessScope } from "./AccessScopeSelector";
import SpaceImagePicker from "./SpaceImagePicker";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SpaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  spaceId: string;
  onDeleted?: () => void;
  onArchived?: () => void;
}

interface EmployeeItem {
  id: string;
  position: string;
  office_id: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const SpaceSettingsDialog = ({
  open,
  onOpenChange,
  spaceId,
  onDeleted,
  onArchived,
}: SpaceSettingsDialogProps) => {
  const { data: space, isLoading } = useSpace(spaceId);
  const { data: spaceMembers = [] } = useSpaceMembers(spaceId);
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();
  const archiveSpace = useArchiveSpace();
  const addMembers = useAddSpaceMembers();
  const removeMember = useRemoveSpaceMember();

  // Basic settings
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spaceType, setSpaceType] = useState<"collaboration" | "announcements">("collaboration");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  
  // Access scope settings
  const [accessScope, setAccessScope] = useState<AccessScope>("company");
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [officesEnabled, setOfficesEnabled] = useState(false);
  const [departmentsEnabled, setDepartmentsEnabled] = useState(false);
  const [projectsEnabled, setProjectsEnabled] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [inviteAdditionalMembers, setInviteAdditionalMembers] = useState(false);
  
  // Auto-sync for preview dialog
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get current member employee IDs
  const currentMemberIds = useMemo(() => spaceMembers.map(m => m.employee_id), [spaceMembers]);

  // Fetch employees based on access scope for sync preview
  const { data: scopedEmployees = [] } = useQuery({
    queryKey: ['scoped-employees-for-sync', spaceId, space?.access_scope, space?.offices, currentOrg?.id],
    queryFn: async (): Promise<EmployeeItem[]> => {
      if (!currentOrg?.id || !space) return [];

      let query = supabase
        .from('employees')
        .select(`
          id,
          position,
          office_id,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'active');

      // Filter based on access scope
      if (space.access_scope === 'offices' && space.offices?.length > 0) {
        const officeIds = space.offices.map(o => o.id);
        query = query.in('office_id', officeIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as EmployeeItem[];
    },
    enabled: !!currentOrg?.id && !!space && (space.access_scope === 'company' || space.access_scope === 'offices') && open,
  });

  // Calculate sync diff
  const syncPreview = useMemo(() => {
    const currentMemberSet = new Set(currentMemberIds);
    const expectedMemberSet = new Set(scopedEmployees.map(e => e.id));

    const membersToAdd = scopedEmployees
      .filter(e => !currentMemberSet.has(e.id))
      .map(e => ({
        id: e.id,
        name: e.profiles?.full_name || 'Unknown',
        position: e.position,
        avatar_url: e.profiles?.avatar_url,
      }));

    const membersToRemove = spaceMembers
      .filter(m => {
        const memberSource = (m as any).source;
        return !expectedMemberSet.has(m.employee_id) && memberSource !== 'manual';
      })
      .map(m => ({
        id: m.employee_id,
        name: m.employee?.profiles?.full_name || 'Unknown',
        position: m.employee?.position,
        avatar_url: m.employee?.profiles?.avatar_url,
      }));

    return { membersToAdd, membersToRemove };
  }, [currentMemberIds, scopedEmployees, spaceMembers]);

  // Initialize state from space data
  useEffect(() => {
    if (space) {
      setName(space.name);
      setDescription(space.description || "");
      setSpaceType(space.space_type);
      setIconUrl(space.icon_url || null);
      
      // Initialize access scope - map legacy DB values to UI scope types
      const dbScope = space.access_scope;
      // Map legacy scopes to 'custom'
      if (dbScope === 'offices' || dbScope === 'projects') {
        setAccessScope('custom');
      } else if (dbScope === 'company' || dbScope === 'members' || dbScope === 'custom') {
        setAccessScope(dbScope as AccessScope);
      } else {
        setAccessScope('company');
      }
      
      // Initialize office selections
      if (space.offices?.length) {
        setOfficesEnabled(true);
        setSelectedOfficeIds(space.offices.map(o => o.id));
      } else {
        setOfficesEnabled(false);
        setSelectedOfficeIds([]);
      }
      
      // Initialize department selections
      if (space.departments?.length) {
        setDepartmentsEnabled(true);
        setSelectedDepartmentIds(space.departments.map(d => d.id));
      } else {
        setDepartmentsEnabled(false);
        setSelectedDepartmentIds([]);
      }
      
      // Initialize project selections
      if (space.projects?.length) {
        setProjectsEnabled(true);
        setSelectedProjectIds(space.projects.map(p => p.id));
      } else {
        setProjectsEnabled(false);
        setSelectedProjectIds([]);
      }
    }
  }, [space]);

  const handleExecuteSync = async () => {
    setIsSyncing(true);
    try {
      if (syncPreview.membersToAdd.length > 0) {
        await addMembers.mutateAsync({
          spaceId,
          employeeIds: syncPreview.membersToAdd.map(m => m.id),
        });
      }

      for (const member of syncPreview.membersToRemove) {
        await removeMember.mutateAsync({
          spaceId,
          employeeId: member.id,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['chat-space-members', spaceId] });
      toast.success("Members synchronized");
    } catch (error) {
      showErrorToast(error, "Failed to sync members", {
        componentName: "SpaceSettingsDialog",
        actionAttempted: "Execute auto-sync",
        errorType: "database",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a space name");
      return;
    }

    // Validate access scope settings
    if (accessScope === 'custom') {
      const hasAnyCriteria = 
        (officesEnabled && selectedOfficeIds.length > 0) ||
        (departmentsEnabled && selectedDepartmentIds.length > 0) ||
        (projectsEnabled && selectedProjectIds.length > 0);
      if (!hasAnyCriteria) {
        toast.error("Please select at least one criterion for group access");
        return;
      }
    }
    if (accessScope === 'members' && selectedMemberIds.length === 0) {
      toast.error("Please select at least one team member");
      return;
    }

    try {
      await updateSpace.mutateAsync({
        spaceId,
        name: name.trim(),
        description: description.trim() || null,
        spaceType,
        iconUrl,
        accessScope,
        officeIds: accessScope === 'custom' && officesEnabled ? selectedOfficeIds : undefined,
        departmentIds: accessScope === 'custom' && departmentsEnabled ? selectedDepartmentIds : undefined,
        projectIds: accessScope === 'custom' && projectsEnabled ? selectedProjectIds : undefined,
        memberIds: accessScope === 'members' 
          ? selectedMemberIds 
          : (accessScope === 'custom' && inviteAdditionalMembers ? selectedMemberIds : undefined),
        oldName: space?.name,
        oldIconUrl: space?.icon_url,
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

  const handleArchive = async () => {
    try {
      await archiveSpace.mutateAsync(spaceId);
      toast.success("Space archived");
      onOpenChange(false);
      onArchived?.();
    } catch (error) {
      showErrorToast(error, "Failed to archive space", {
        componentName: "SpaceSettingsDialog",
        actionAttempted: "Archive space",
        errorType: "database",
      });
    }
  };

  const handleClose = () => {
    if (space) {
      setName(space.name);
      setDescription(space.description || "");
      setSpaceType(space.space_type);
      setIconUrl(space.icon_url || null);
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
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Space Settings</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 pb-2">
              {/* Space name with icon picker */}
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

              {/* Space Type - Grid style matching CreateSpaceDialog */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Space type</Label>
                <RadioGroup
                  value={spaceType}
                  onValueChange={(v) => setSpaceType(v as 'collaboration' | 'announcements')}
                  className="grid grid-cols-2 gap-3"
                >
                  <div 
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      spaceType === 'collaboration' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    )}
                    onClick={() => setSpaceType('collaboration')}
                  >
                    <RadioGroupItem value="collaboration" id="settings-collaboration" />
                    <MessageSquare className={cn("h-4 w-4", spaceType === 'collaboration' ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="settings-collaboration" className="font-medium cursor-pointer text-sm">
                        Collaboration
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">Everyone can post</p>
                    </div>
                  </div>
                  
                  <div 
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      spaceType === 'announcements' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted/50'
                    )}
                    onClick={() => setSpaceType('announcements')}
                  >
                    <RadioGroupItem value="announcements" id="settings-announcements" />
                    <Megaphone className={cn("h-4 w-4", spaceType === 'announcements' ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="settings-announcements" className="font-medium cursor-pointer text-sm">
                        Announcement
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">Only admins can post</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Access Settings */}
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

              {/* Info about access changes */}
              {space && (
                <Alert className="bg-muted/50 border-border">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Changing access settings will update membership based on the new criteria. Members added manually will not be removed.
                  </AlertDescription>
                </Alert>
              )}

              {/* Danger zone */}
              <div className="pt-4 border-t space-y-4">
                <h4 className="text-sm font-medium text-destructive">Danger zone</h4>
                
                <div className="flex flex-wrap gap-3">
                  {/* Archive button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Archive className="h-4 w-4" />
                        Archive space
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive this space?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Archiving "{space?.name}" will hide it from the sidebar and make it read-only.
                          All messages will be preserved and the space can be restored later.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleArchive}>
                          {archiveSpace.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Archive
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Delete button */}
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
            </div>
          </ScrollArea>

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

      {/* Auto-sync preview dialog */}
      <AutoSyncPreviewDialog
        open={showSyncPreview}
        onOpenChange={setShowSyncPreview}
        membersToAdd={syncPreview.membersToAdd}
        membersToRemove={syncPreview.membersToRemove}
        isPending={isSyncing}
        onConfirm={handleExecuteSync}
      />
    </>
  );
};

export default SpaceSettingsDialog;
