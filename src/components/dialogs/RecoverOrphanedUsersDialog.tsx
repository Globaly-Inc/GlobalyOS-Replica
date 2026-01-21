import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import { Loader2, UserPlus, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface OrphanedUser {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface Office {
  id: string;
  name: string;
}

interface RecoverOrphanedUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RecoverOrphanedUsersDialog = ({ open, onOpenChange }: RecoverOrphanedUsersDialogProps) => {
  const { currentOrg } = useOrganization();
  const [orphanedUsers, setOrphanedUsers] = useState<OrphanedUser[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedUser, setSelectedUser] = useState<OrphanedUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<OrphanedUser | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  // Form state for recovery
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [joinDate, setJoinDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [officeId, setOfficeId] = useState("");
  const [role, setRole] = useState("member");

  useEffect(() => {
    if (open && currentOrg) {
      fetchOrphanedUsers();
      fetchOffices();
    }
  }, [open, currentOrg]);

  const fetchOrphanedUsers = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const response = await supabase.functions.invoke('list-orphaned-users', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (response.error) {
        showErrorToast(response.error, "Failed to fetch orphaned users", {
          componentName: "RecoverOrphanedUsersDialog",
          actionAttempted: "Fetch orphaned users",
          errorType: "network",
        });
        return;
      }

      setOrphanedUsers(response.data.users || []);
    } catch (error) {
      showErrorToast(error, "Failed to fetch orphaned users", {
        componentName: "RecoverOrphanedUsersDialog",
        actionAttempted: "Fetch orphaned users",
        errorType: "network",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOffices = async () => {
    if (!currentOrg) return;
    
    const { data } = await supabase
      .from('offices')
      .select('id, name')
      .eq('organization_id', currentOrg.id);
    
    setOffices(data || []);
  };

  const handleRecover = async () => {
    if (!selectedUser || !currentOrg) return;
    if (!position || !department || !joinDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setRecovering(selectedUser.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const response = await supabase.functions.invoke('recover-orphaned-user', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        },
        body: {
          userEmail: selectedUser.email,
          organizationId: currentOrg.id,
          position,
          department,
          joinDate,
          officeId: officeId || null,
          role
        }
      });

      if (response.error) {
        showErrorToast(response.error, "Failed to recover user", {
          componentName: "RecoverOrphanedUsersDialog",
          actionAttempted: "Recover orphaned user",
          errorType: "network",
        });
        return;
      }

      toast.success(`Successfully linked ${selectedUser.full_name} to the organization`);
      setSelectedUser(null);
      resetForm();
      fetchOrphanedUsers();
    } catch (error: any) {
      showErrorToast(error, "Failed to recover user", {
        componentName: "RecoverOrphanedUsersDialog",
        actionAttempted: "Recover orphaned user",
        errorType: "network",
      });
    } finally {
      setRecovering(null);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    setDeleting(userToDelete.id);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const response = await supabase.functions.invoke('delete-orphaned-user', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        },
        body: {
          userId: userToDelete.id
        }
      });

      if (response.error) {
        showErrorToast(response.error, "Failed to delete user", {
          componentName: "RecoverOrphanedUsersDialog",
          actionAttempted: "Delete orphaned user",
          errorType: "network",
        });
        return;
      }

      toast.success(`Successfully deleted ${userToDelete.full_name}`);
      setUserToDelete(null);
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
        resetForm();
      }
      fetchOrphanedUsers();
    } catch (error: any) {
      showErrorToast(error, "Failed to delete user", {
        componentName: "RecoverOrphanedUsersDialog",
        actionAttempted: "Delete orphaned user",
        errorType: "network",
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      let successCount = 0;
      let failCount = 0;

      for (const user of orphanedUsers) {
        const response = await supabase.functions.invoke('delete-orphaned-user', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`
          },
          body: {
            userId: user.id
          }
        });

        if (response.error) {
          failCount++;
        } else {
          successCount++;
        }
      }

      if (failCount === 0) {
        toast.success(`Successfully deleted ${successCount} orphaned user(s)`);
      } else {
        toast.warning(`Deleted ${successCount} user(s), ${failCount} failed`);
      }

      setShowDeleteAllConfirm(false);
      setSelectedUser(null);
      resetForm();
      fetchOrphanedUsers();
    } catch (error: any) {
      showErrorToast(error, "Failed to delete all users", {
        componentName: "RecoverOrphanedUsersDialog",
        actionAttempted: "Delete all orphaned users",
        errorType: "network",
      });
    } finally {
      setDeletingAll(false);
    }
  };

  const resetForm = () => {
    setPosition("");
    setDepartment("");
    setJoinDate(format(new Date(), "yyyy-MM-dd"));
    setOfficeId("");
    setRole("member");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Recover Orphaned Users
            </DialogTitle>
            <DialogDescription>
              These users have accounts but are not linked to any organization. You can recover or delete them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {orphanedUsers.length} orphaned user(s) found
              </span>
              <div className="flex gap-2">
                {orphanedUsers.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setShowDeleteAllConfirm(true)} 
                    disabled={loading || deletingAll}
                  >
                    {deletingAll && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={fetchOrphanedUsers} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : orphanedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No orphaned users found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orphanedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      selectedUser?.id === user.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Created: {format(new Date(user.created_at), "d MMM yyyy")}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserToDelete(user);
                        }}
                        disabled={deleting === user.id}
                      >
                        {deleting === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedUser && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium">Recovery Details for {selectedUser.full_name}</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g. Software Engineer"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Engineering"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="joinDate">Join Date *</Label>
                    <DatePicker
                      value={joinDate}
                      onChange={(value) => setJoinDate(value)}
                      placeholder="Select join date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="office">Office</Label>
                    <Select value={officeId} onValueChange={setOfficeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No office</SelectItem>
                        {offices.map((office) => (
                          <SelectItem key={office.id} value={office.id}>
                            {office.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">System Role</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setSelectedUser(null); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecover} disabled={recovering === selectedUser.id}>
                    {recovering === selectedUser.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Recover User
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orphaned User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email})? 
              This action cannot be undone and will remove the user account completely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Orphaned Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete all <strong>{orphanedUsers.length}</strong> orphaned users? 
              This action cannot be undone and will remove all user accounts completely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={deletingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingAll && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All Users
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
