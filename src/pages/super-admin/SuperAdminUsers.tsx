import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Search, Loader2 } from "lucide-react";
import { format } from "date-fns";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  organizations: { id: string; name: string; slug: string; role: string }[];
  roles: string[];
  status: string;
}

const SuperAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // For each profile, get their organizations and roles
      const usersWithDetails = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get organization memberships
          const { data: memberships } = await supabase
            .from('organization_members')
            .select('organization_id, role')
            .eq('user_id', profile.id);

          const orgs: { id: string; name: string; slug: string; role: string }[] = [];
          
          if (memberships) {
            for (const membership of memberships) {
              const { data: org } = await supabase
                .from('organizations')
                .select('id, name, slug')
                .eq('id', membership.organization_id)
                .maybeSingle();
              
              if (org) {
                orgs.push({ ...org, role: membership.role });
              }
            }
          }

          // Get user roles
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          // Get employee status if available
          const { data: employee } = await supabase
            .from('employees')
            .select('status')
            .eq('user_id', profile.id)
            .limit(1)
            .maybeSingle();

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            organizations: orgs,
            roles: userRoles?.map(r => r.role) || [],
            status: employee?.status || 'active',
          };
        })
      );

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    return (
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground">
            All users across all organisations
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Organisations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedUser(user);
                      setDetailsOpen(true);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === 'super_admin' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                        {user.roles.length === 0 && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.organizations.slice(0, 2).map((org) => (
                          <Badge key={org.id} variant="outline" className="text-xs">
                            {org.name}
                          </Badge>
                        ))}
                        {user.organizations.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{user.organizations.length - 2}
                          </Badge>
                        )}
                        {user.organizations.length === 0 && (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === 'active' ? 'default' : 'secondary'}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "dd MMM yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* User Details Sheet */}
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser?.avatar_url || undefined} />
                  <AvatarFallback>
                    {selectedUser && getInitials(selectedUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p>{selectedUser?.full_name}</p>
                  <p className="text-sm font-normal text-muted-foreground">
                    {selectedUser?.email}
                  </p>
                </div>
              </SheetTitle>
            </SheetHeader>
            {selectedUser && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge
                      variant={selectedUser.status === 'active' ? 'default' : 'secondary'}
                    >
                      {selectedUser.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {format(new Date(selectedUser.created_at), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Roles</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedUser.roles.map((role) => (
                      <Badge
                        key={role}
                        variant={role === 'super_admin' ? 'destructive' : 'secondary'}
                      >
                        {role.replace('_', ' ')}
                      </Badge>
                    ))}
                    {selectedUser.roles.length === 0 && (
                      <span className="text-muted-foreground text-sm">No roles assigned</span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Organisations</h4>
                  {selectedUser.organizations.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.organizations.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div>
                            <p className="font-medium">{org.name}</p>
                            <code className="text-xs text-muted-foreground">
                              {org.slug}
                            </code>
                          </div>
                          <Badge variant="outline">{org.role}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Not a member of any organisation
                    </p>
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminUsers;
