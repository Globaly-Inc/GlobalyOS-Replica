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
import { Switch } from "@/components/ui/switch";
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
import { Loader2, Trash2, Users, Megaphone, Archive, RefreshCw, Shield, Info } from "lucide-react";
import { useSpace, useUpdateSpace, useDeleteSpace, useArchiveSpace, useSpaceMembers, useAddSpaceMembers, useRemoveSpaceMember } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { useExemptEmployeeIds, isExemptFromAutoSync } from "@/hooks/useExemptRoles";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import AutoSyncPreviewDialog from "./AutoSyncPreviewDialog";

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
  const queryClient = useQueryClient();
  const updateSpace = useUpdateSpace();
  const deleteSpace = useDeleteSpace();
  const archiveSpace = useArchiveSpace();
  const addMembers = useAddSpaceMembers();
  const removeMember = useRemoveSpaceMember();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [spaceType, setSpaceType] = useState<"collaboration" | "announcements">("collaboration");
  const [autoSyncMembers, setAutoSyncMembers] = useState(false);
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Get current member employee IDs for exempt role check
  const currentMemberIds = useMemo(() => spaceMembers.map(m => m.employee_id), [spaceMembers]);
  const { exemptIds, roleMap } = useExemptEmployeeIds(currentMemberIds, currentOrg?.id || null);

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
      // For 'company' scope, no additional filter (all employees)
      // For 'members' or 'projects' scope, auto-sync doesn't apply or needs different handling

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
      .filter(m => !expectedMemberSet.has(m.employee_id) && !exemptIds.has(m.employee_id))
      .map(m => ({
        id: m.employee_id,
        name: m.employee?.profiles?.full_name || 'Unknown',
        position: m.employee?.position,
        avatar_url: m.employee?.profiles?.avatar_url,
      }));

    const exemptMembersList = spaceMembers
      .filter(m => exemptIds.has(m.employee_id))
      .map(m => ({
        id: m.employee_id,
        name: m.employee?.profiles?.full_name || 'Unknown',
        position: m.employee?.position,
        avatar_url: m.employee?.profiles?.avatar_url,
        isExempt: true,
      }));

    return { membersToAdd, membersToRemove, exemptMembers: exemptMembersList };
  }, [currentMemberIds, scopedEmployees, spaceMembers, exemptIds]);

  useEffect(() => {
    if (space) {
      setName(space.name);
      setDescription(space.description || "");
      setSpaceType(space.space_type);
      setAutoSyncMembers(space.auto_sync_members || false);
    }
  }, [space]);

  // Handle auto-sync toggle
  const handleAutoSyncToggle = (enabled: boolean) => {
    if (enabled && !autoSyncMembers) {
      // Turning ON - show preview dialog
      setShowSyncPreview(true);
    } else if (!enabled) {
      // Turning OFF - just disable
      setAutoSyncMembers(false);
    }
  };

  const handleExecuteSync = async () => {
    setIsSyncing(true);
    try {
      // Add missing members
      if (syncPreview.membersToAdd.length > 0) {
        await addMembers.mutateAsync({
          spaceId,
          employeeIds: syncPreview.membersToAdd.map(m => m.id),
        });
      }

      // Remove out-of-scope members (non-exempt only)
      for (const member of syncPreview.membersToRemove) {
        await removeMember.mutateAsync({
          spaceId,
          employeeId: member.id,
        });
      }

      // Enable auto-sync
      await updateSpace.mutateAsync({
        spaceId,
        autoSyncMembers: true,
      });

      setAutoSyncMembers(true);
      queryClient.invalidateQueries({ queryKey: ['chat-space-members', spaceId] });
      toast.success("Auto-sync enabled and members synchronized");
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

    try {
      await updateSpace.mutateAsync({
        spaceId,
        name: name.trim(),
        description: description.trim() || null,
        spaceType,
        autoSyncMembers,
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
      setAutoSyncMembers(space.auto_sync_members || false);
    }
    onOpenChange(false);
  };

  // Check if auto-sync is applicable (only for office/company scopes)
  const isAutoSyncApplicable = space?.access_scope === 'company' || space?.access_scope === 'offices';

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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

            {/* Auto-sync members - only show for office/project/company scopes */}
            {isAutoSyncApplicable && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Auto-sync members
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically add/remove members based on {space?.access_scope === 'company' ? 'organization' : space?.access_scope}
                    </p>
                  </div>
                  <Switch
                    checked={autoSyncMembers}
                    onCheckedChange={handleAutoSyncToggle}
                  />
                </div>

                {autoSyncMembers && (
                  <Alert className="bg-muted/50 border-border">
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Owner, Admin, and HR members are exempt from auto-sync and can be manually managed.
                    </AlertDescription>
                  </Alert>
                )}

                {!autoSyncMembers && (
                  <Alert className="bg-muted/50 border-border">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Members are managed manually. Enable auto-sync to automatically keep membership in sync.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
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
        exemptMembers={syncPreview.exemptMembers}
        onConfirm={handleExecuteSync}
        isPending={isSyncing}
      />
    </>
  );
};

export default SpaceSettingsDialog;
