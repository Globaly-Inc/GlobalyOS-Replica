import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
import { 
  Loader2, 
  Users, 
  Crown, 
  Shield, 
  User, 
  MoreHorizontal, 
  UserMinus, 
  UserCog, 
  UserPlus,
  Search,
  Ban
} from "lucide-react";
import { toast } from "sonner";
import { useAdminActivityLog } from "@/hooks/useAdminActivityLog";

interface OrgMembersTabProps {
  organizationId: string;
}

interface UserWithAccess {
  id: string;
  user_id: string | null;
  position: string | null;
  department: string | null;
  status: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  accessRole: string | null;
  memberId: string | null;
  hasAccount: boolean;
}

export function OrgMembersTab({ organizationId }: OrgMembersTabProps) {
  const queryClient = useQueryClient();
  const { logActivity } = useAdminActivityLog();
  const [searchQuery, setSearchQuery] = useState("");
  const [removingAccess, setRemovingAccess] = useState<UserWithAccess | null>(null);
  const [grantingAccess, setGrantingAccess] = useState<UserWithAccess | null>(null);
  const [changingRole, setChangingRole] = useState<UserWithAccess | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [grantRole, setGrantRole] = useState<string>("member");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch employees with merged organization member data
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["org-users", organizationId],
    queryFn: async () => {
      // Get all employees
      const { data: employees, error: empError } = await supabase
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

      if (empError) throw empError;

      // Get organization members for access roles
      const { data: members, error: memError } = await supabase
        .from("organization_members")
        .select("id, user_id, role")
        .eq("organization_id", organizationId);

      if (memError) throw memError;

      // Create a map of user_id -> { role, memberId }
      const roleMap = new Map<string, { role: string; memberId: string }>();
      members?.forEach((m) => {
        roleMap.set(m.user_id, { role: m.role, memberId: m.id });
      });

      // Merge data
      return employees?.map((emp): UserWithAccess => {
        const memberData = emp.user_id ? roleMap.get(emp.user_id) : null;
        return {
          id: emp.id,
          user_id: emp.user_id,
          position: emp.position,
          department: emp.department,
          status: emp.status,
          profile: emp.profiles as UserWithAccess["profile"],
          accessRole: memberData?.role || null,
          memberId: memberData?.memberId || null,
          hasAccount: !!emp.user_id,
        };
      }) || [];
    },
  });

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      const name = user.profile?.full_name?.toLowerCase() || "";
      const email = user.profile?.email?.toLowerCase() || "";
      const position = user.position?.toLowerCase() || "";
      const department = user.department?.toLowerCase() || "";
      return name.includes(query) || email.includes(query) || position.includes(query) || department.includes(query);
    });
  }, [users, searchQuery]);

  const handleRevokeAccess = async () => {
    if (!removingAccess?.memberId) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", removingAccess.memberId);

      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: "member_removed",
        entityType: "member",
        entityId: removingAccess.memberId,
        metadata: {
          memberName: removingAccess.profile?.full_name || removingAccess.profile?.email || "Unknown",
          role: removingAccess.accessRole,
        },
      });

      toast.success("Access revoked successfully");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["org-quick-stats", organizationId] });
    } catch (error) {
      console.error("Error revoking access:", error);
      toast.error("Failed to revoke access");
    } finally {
      setIsProcessing(false);
      setRemovingAccess(null);
    }
  };

  const handleGrantAccess = async () => {
    if (!grantingAccess?.user_id || !grantRole) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase.from("organization_members").insert({
        organization_id: organizationId,
        user_id: grantingAccess.user_id,
        role: grantRole,
      });

      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: "member_added",
        entityType: "member",
        entityId: grantingAccess.id,
        metadata: {
          memberName: grantingAccess.profile?.full_name || grantingAccess.profile?.email || "Unknown",
          role: grantRole,
        },
      });

      toast.success("Access granted successfully");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["org-quick-stats", organizationId] });
    } catch (error) {
      console.error("Error granting access:", error);
      toast.error("Failed to grant access");
    } finally {
      setIsProcessing(false);
      setGrantingAccess(null);
      setGrantRole("member");
    }
  };

  const handleChangeRole = async () => {
    if (!changingRole?.memberId || !newRole) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole })
        .eq("id", changingRole.memberId);

      if (error) throw error;

      await logActivity({
        organizationId,
        actionType: "member_role_changed",
        entityType: "member",
        entityId: changingRole.memberId,
        changes: { role: { from: changingRole.accessRole, to: newRole } },
        metadata: { memberName: changingRole.profile?.full_name || changingRole.profile?.email || "Unknown" },
      });

      toast.success("Role updated successfully");
      refetch();
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Failed to update role");
    } finally {
      setIsProcessing(false);
      setChangingRole(null);
      setNewRole("");
    }
  };

  const getAccessBadge = (user: UserWithAccess) => {
    if (!user.hasAccount) {
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground border-dashed">
          <Ban className="h-3 w-3" />
          Not Linked
        </Badge>
      );
    }

    if (!user.accessRole) {
      return (
        <Badge variant="secondary" className="gap-1">
          <User className="h-3 w-3" />
          No Access
        </Badge>
      );
    }

    switch (user.accessRole) {
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
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20">
            <User className="h-3 w-3" />
            Member
          </Badge>
        );
    }
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
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
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users ({users?.length || 0})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>System Access</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const isOwner = user.accessRole === "owner";
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile?.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(user.profile?.full_name || null, user.profile?.email || null)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.profile?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">{user.profile?.email || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.position || "-"}</TableCell>
                    <TableCell>{user.department || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell>{getAccessBadge(user)}</TableCell>
                    <TableCell>
                      {user.hasAccount && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.accessRole ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setChangingRole(user);
                                    setNewRole(user.accessRole || "member");
                                  }}
                                >
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Change Role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setRemovingAccess(user)}
                                  className="text-destructive focus:text-destructive"
                                  disabled={isOwner}
                                >
                                  <UserMinus className="h-4 w-4 mr-2" />
                                  Revoke Access
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem onClick={() => setGrantingAccess(user)}>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Grant Access
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No users found matching your search" : "No users found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Revoke Access Confirmation Dialog */}
      <AlertDialog open={!!removingAccess} onOpenChange={(open) => !open && setRemovingAccess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke System Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke system access for{" "}
              <strong>{removingAccess?.profile?.full_name || removingAccess?.profile?.email}</strong>? They will no longer be
              able to log in to the organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAccess}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                "Revoke Access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Access Dialog */}
      <AlertDialog open={!!grantingAccess} onOpenChange={(open) => !open && setGrantingAccess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant System Access</AlertDialogTitle>
            <AlertDialogDescription>
              Grant system access to <strong>{grantingAccess?.profile?.full_name || grantingAccess?.profile?.email}</strong>.
              Select a role for this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={grantRole} onValueChange={setGrantRole}>
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
            <AlertDialogAction onClick={handleGrantAccess} disabled={isProcessing || !grantRole}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Granting...
                </>
              ) : (
                "Grant Access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <AlertDialog open={!!changingRole} onOpenChange={(open) => !open && setChangingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role</AlertDialogTitle>
            <AlertDialogDescription>
              Select a new role for {changingRole?.profile?.full_name || changingRole?.profile?.email}.
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
            <AlertDialogAction onClick={handleChangeRole} disabled={isProcessing || !newRole || newRole === changingRole?.accessRole}>
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
