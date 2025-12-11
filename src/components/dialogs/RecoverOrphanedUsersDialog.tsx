import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { Loader2, UserPlus, AlertCircle, RefreshCw } from "lucide-react";
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
  const [selectedUser, setSelectedUser] = useState<OrphanedUser | null>(null);
  
  // Form state for recovery
  const [position, setPosition] = useState("");
  const [department, setDepartment] = useState("");
  const [joinDate, setJoinDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [officeId, setOfficeId] = useState("");
  const [role, setRole] = useState("user");

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
        console.error('Error fetching orphaned users:', response.error);
        toast.error("Failed to fetch orphaned users");
        return;
      }

      setOrphanedUsers(response.data.users || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to fetch orphaned users");
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
        console.error('Recovery error:', response.error);
        toast.error(response.error.message || "Failed to recover user");
        return;
      }

      toast.success(`Successfully linked ${selectedUser.full_name} to the organization`);
      setSelectedUser(null);
      resetForm();
      fetchOrphanedUsers();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || "Failed to recover user");
    } finally {
      setRecovering(null);
    }
  };

  const resetForm = () => {
    setPosition("");
    setDepartment("");
    setJoinDate(format(new Date(), "yyyy-MM-dd"));
    setOfficeId("");
    setRole("user");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Recover Orphaned Users
          </DialogTitle>
          <DialogDescription>
            These users have accounts but are not linked to any organization. You can recover them by assigning employee details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {orphanedUsers.length} orphaned user(s) found
            </span>
            <Button variant="outline" size="sm" onClick={fetchOrphanedUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
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
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="font-medium">{user.full_name}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Created: {format(new Date(user.created_at), "d MMM yyyy")}
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
                  <Input
                    id="joinDate"
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
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
                      <SelectItem value="user">Team Member</SelectItem>
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
  );
};
