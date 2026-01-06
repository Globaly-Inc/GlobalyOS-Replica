import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2, Users, Crown, Shield, User, MoreHorizontal, UserMinus, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface OrgMembersTabProps {
  organizationId: string;
}

export function OrgMembersTab({ organizationId }: OrgMembersTabProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<{ id: string; currentRole: string; name: string } | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch organization members with profiles
  const { data: members, isLoading, refetch } = useQuery({
    queryKey: ["org-members", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          id,
          role,
          created_at,
          user_id,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees for this organization (with their linked profiles)
  const { data: employees } = useQuery({
    queryKey: ["org-employees", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select(`
          id,
          user_id,
          position,
          department,
          status,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("organization_id", organizationId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    
    const member = members?.find(m => m.id === removingMember);
    if (!member) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", removingMember);

      if (error) throw error;

      const profile = member.profiles as any;
      await logActivity({
        organizationId,
        actionType: 'member_removed',
        entityType: 'member',
        entityId: removingMember,
        metadata: { 
          memberName: profile?.full_name || profile?.email || 'Unknown',
          role: member.role
        }
      });

      toast.success("Member removed successfully");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["org-quick-stats", organizationId] });
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    } finally {
      setIsProcessing(false);
      setRemovingMember(null);
    }
  };

  const handleChangeRole = async () => {
    if (!changingRole || !newRole) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", changingRole.id);

      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: 'member_role_changed',
        entityType: 'member',
        entityId: changingRole.id,
        changes: { role: { from: changingRole.currentRole, to: newRole } },
        metadata: { memberName: changingRole.name }
      });

      toast.success("Member role updated successfully");
      refetch();
    } catch (error) {
      console.error("Error updating member role:", error);
      toast.error("Failed to update member role");
    } finally {
      setIsProcessing(false);
      setChangingRole(null);
      setNewRole("");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
            <Crown className="h-3 w-3" />
            Owner
          </Badge>
        );
      case "admin":
        return (
          <Badge variant="default" className="gap-1">
            <Shield className="h-3 w-3" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <User className="h-3 w-3" />
            Member
          </Badge>
        );
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Members (Users) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organization Members ({members?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member) => {
                const profile = member.profiles as any;
                const isOwner = member.role === "owner";
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback>
                            {getInitials(profile?.full_name, profile?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{profile?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{format(new Date(member.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setChangingRole({ 
                                id: member.id, 
                                currentRole: member.role,
                                name: profile?.full_name || profile?.email || 'Unknown'
                              });
                              setNewRole(member.role);
                            }}
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setRemovingMember(member.id)}
                            className="text-destructive focus:text-destructive"
                            disabled={isOwner}
                          >
                            <UserMinus className="h-4 w-4 mr-2" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!members || members.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees ({employees?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Linked User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees?.map((employee) => {
                const profile = employee.profiles as any;
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback>
                            {getInitials(profile?.full_name, profile?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{profile?.email || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{employee.position || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                        {employee.status || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {employee.user_id ? (
                        <Badge variant="outline">Linked</Badge>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!employees || employees.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!removingMember} onOpenChange={(open) => !open && setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the organization? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <AlertDialog open={!!changingRole} onOpenChange={(open) => !open && setChangingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Member Role</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new role for {changingRole?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleChangeRole}
              disabled={isProcessing || !newRole || newRole === changingRole?.currentRole}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
