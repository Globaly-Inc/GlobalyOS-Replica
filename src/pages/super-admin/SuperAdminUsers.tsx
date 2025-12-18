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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Loader2, Eye, Activity, FileText } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import { UserActivityLogsSheet } from "@/components/super-admin/UserActivityLogsSheet";

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  organizations: { id: string; name: string; slug: string; role: string }[];
  roles: string[];
  status: string;
  total_page_visits: number;
  total_activities: number;
  last_active_at: string | null;
}

const SuperAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [logsUser, setLogsUser] = useState<User | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

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

      // Fetch page visit counts for all users
      const { data: visitCounts } = await supabase
        .from('user_page_visits')
        .select('user_id');

      // Fetch activity counts for all users
      const { data: activityCounts } = await supabase
        .from('user_activity_logs')
        .select('user_id');

      // Get latest visit timestamps
      const { data: latestVisits } = await supabase
        .from('user_page_visits')
        .select('user_id, visited_at')
        .order('visited_at', { ascending: false });

      // Get latest activity timestamps
      const { data: latestActivities } = await supabase
        .from('user_activity_logs')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      // Aggregate counts
      const visitCountMap: Record<string, number> = {};
      const activityCountMap: Record<string, number> = {};
      const lastVisitMap: Record<string, string> = {};
      const lastActivityMap: Record<string, string> = {};

      (visitCounts || []).forEach((v) => {
        visitCountMap[v.user_id] = (visitCountMap[v.user_id] || 0) + 1;
      });

      (activityCounts || []).forEach((a) => {
        activityCountMap[a.user_id] = (activityCountMap[a.user_id] || 0) + 1;
      });

      (latestVisits || []).forEach((v) => {
        if (!lastVisitMap[v.user_id]) {
          lastVisitMap[v.user_id] = v.visited_at;
        }
      });

      (latestActivities || []).forEach((a) => {
        if (!lastActivityMap[a.user_id]) {
          lastActivityMap[a.user_id] = a.created_at;
        }
      });

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

          // Determine last active time
          const lastVisit = lastVisitMap[profile.id];
          const lastActivity = lastActivityMap[profile.id];
          let lastActiveAt: string | null = null;
          
          if (lastVisit && lastActivity) {
            lastActiveAt = new Date(lastVisit) > new Date(lastActivity) ? lastVisit : lastActivity;
          } else {
            lastActiveAt = lastVisit || lastActivity || null;
          }

          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
            created_at: profile.created_at,
            organizations: orgs,
            roles: userRoles?.map(r => r.role) || [],
            status: employee?.status || 'active',
            total_page_visits: visitCountMap[profile.id] || 0,
            total_activities: activityCountMap[profile.id] || 0,
            last_active_at: lastActiveAt,
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

  const handleOpenLogs = (user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogsUser(user);
    setLogsOpen(true);
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
        <SuperAdminPageHeader 
          title="Users" 
          description="All users across all organisations" 
        />

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
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      <span>Visits</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      <span>Activities</span>
                    </div>
                  </TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-center">Logs</TableHead>
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
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                        {user.total_page_visits}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                        {user.total_activities}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_active_at ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(user.last_active_at), { addSuffix: true })}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {format(new Date(user.last_active_at), "dd MMM yyyy 'at' HH:mm")}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => handleOpenLogs(user, e)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View activity logs</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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

                {/* Activity Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {selectedUser.total_page_visits}
                    </p>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Page Visits</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-700 dark:text-green-300">
                      {selectedUser.total_activities}
                    </p>
                    <p className="text-xs text-green-600/80 dark:text-green-400/80">Activities</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {selectedUser.last_active_at
                        ? formatDistanceToNow(new Date(selectedUser.last_active_at), { addSuffix: true })
                        : 'Never'}
                    </p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">Last Active</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setLogsUser(selectedUser);
                    setLogsOpen(true);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Activity Logs
                </Button>

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

        {/* Activity Logs Sheet */}
        <UserActivityLogsSheet
          open={logsOpen}
          onOpenChange={setLogsOpen}
          user={logsUser}
        />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminUsers;
