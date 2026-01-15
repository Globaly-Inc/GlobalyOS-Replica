import { useEffect, useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Loader2, Eye, Activity, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react";
import { format, formatDistanceToNow, subDays } from "date-fns";
import SuperAdminLayout from "@/components/super-admin/SuperAdminLayout";
import SuperAdminPageHeader from "@/components/super-admin/SuperAdminPageHeader";
import { UserDetailSheet } from "@/components/super-admin/UserDetailSheet";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

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

type SortField = 'name' | 'visits' | 'activities' | 'last_active' | 'created_at';
type SortOrder = 'asc' | 'desc';

const SuperAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allOrganizations, setAllOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [lastActiveFilter, setLastActiveFilter] = useState<string>("all");

  // Sort state
  const [sortField, setSortField] = useState<SortField>('last_active');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination
  const pagination = usePagination({ pageKey: 'super-admin-users' });

  useEffect(() => {
    fetchUsers();
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('id, name').order('name');
    setAllOrganizations(data || []);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_admin_users_overview');
      
      if (error) throw error;
      
      // Transform RPC response to match User interface
      const transformedUsers: User[] = (data || []).map((user: {
        id: string;
        email: string;
        full_name: string;
        avatar_url: string | null;
        created_at: string;
        status: string;
        roles: string[];
        organizations: { id: string; name: string; slug: string; role: string }[] | null;
        total_page_visits: number;
        total_activities: number;
        last_active_at: string | null;
      }) => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        status: user.status,
        roles: user.roles || [],
        organizations: user.organizations || [],
        total_page_visits: Number(user.total_page_visits) || 0,
        total_activities: Number(user.total_activities) || 0,
        last_active_at: user.last_active_at,
      }));
      
      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = statusFilter !== 'all' || roleFilter !== 'all' || orgFilter !== 'all' || activityFilter !== 'all' || lastActiveFilter !== 'all';

  const clearFilters = () => {
    setStatusFilter('all');
    setRoleFilter('all');
    setOrgFilter('all');
    setActivityFilter('all');
    setLastActiveFilter('all');
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      // Search
      const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;

      // Role filter
      if (roleFilter !== 'all' && !user.roles.includes(roleFilter)) return false;

      // Organization filter
      if (orgFilter !== 'all' && !user.organizations.some(o => o.id === orgFilter)) return false;

      // Activity level filter
      const totalActivity = user.total_page_visits + user.total_activities;
      if (activityFilter === 'high' && totalActivity < 50) return false;
      if (activityFilter === 'medium' && (totalActivity < 10 || totalActivity >= 50)) return false;
      if (activityFilter === 'low' && (totalActivity < 1 || totalActivity >= 10)) return false;
      if (activityFilter === 'none' && totalActivity > 0) return false;

      // Last active filter
      if (lastActiveFilter !== 'all' && user.last_active_at) {
        const lastActive = new Date(user.last_active_at);
        const now = new Date();
        if (lastActiveFilter === 'today' && lastActive < subDays(now, 1)) return false;
        if (lastActiveFilter === 'week' && lastActive < subDays(now, 7)) return false;
        if (lastActiveFilter === 'month' && lastActive < subDays(now, 30)) return false;
        if (lastActiveFilter === 'inactive' && lastActive >= subDays(now, 30)) return false;
      } else if (lastActiveFilter === 'today' || lastActiveFilter === 'week' || lastActiveFilter === 'month') {
        return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name);
          break;
        case 'visits':
          comparison = a.total_page_visits - b.total_page_visits;
          break;
        case 'activities':
          comparison = a.total_activities - b.total_activities;
          break;
        case 'last_active':
          const aTime = a.last_active_at ? new Date(a.last_active_at).getTime() : 0;
          const bTime = b.last_active_at ? new Date(b.last_active_at).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [users, searchQuery, statusFilter, roleFilter, orgFilter, activityFilter, lastActiveFilter, sortField, sortOrder]);

  // Update pagination total count when filtered users change
  useEffect(() => {
    pagination.setTotalCount(filteredAndSortedUsers.length);
  }, [filteredAndSortedUsers.length]);

  // Reset to page 1 when filters change
  useEffect(() => {
    pagination.resetPage();
  }, [searchQuery, statusFilter, roleFilter, orgFilter, activityFilter, lastActiveFilter]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    return filteredAndSortedUsers.slice(pagination.from, pagination.from + pagination.pageSize);
  }, [filteredAndSortedUsers, pagination.from, pagination.pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleOpenUser = (user: User) => {
    setSelectedUser(user);
    setSheetOpen(true);
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
        <SuperAdminPageHeader title="Users" description="All users across all organisations" />

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* Divider */}
              <div className="h-5 w-px bg-border" />

              {/* Filters */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>

              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue placeholder="Org" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orgs</SelectItem>
                  {allOrganizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="high">High (50+)</SelectItem>
                  <SelectItem value="medium">Medium (10-49)</SelectItem>
                  <SelectItem value="low">Low (1-9)</SelectItem>
                  <SelectItem value="none">No Activity</SelectItem>
                </SelectContent>
              </Select>

              <Select value={lastActiveFilter} onValueChange={setLastActiveFilter}>
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue placeholder="Active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="inactive">Inactive 30+</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2">
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* User count */}
              <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
                {filteredAndSortedUsers.length}/{users.length}
              </span>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>
                    <div className="flex items-center">User <SortIcon field="name" /></div>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Orgs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center cursor-pointer hover:text-foreground" onClick={() => handleSort('visits')}>
                    <div className="flex items-center justify-center">
                      <Eye className="h-3.5 w-3.5 mr-1" />Visits <SortIcon field="visits" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center cursor-pointer hover:text-foreground" onClick={() => handleSort('activities')}>
                    <div className="flex items-center justify-center">
                      <Activity className="h-3.5 w-3.5 mr-1" />Activity <SortIcon field="activities" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('last_active')}>
                    <div className="flex items-center">Last Active <SortIcon field="last_active" /></div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenUser(user)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.roles.map((role) => (
                          <Badge key={role} variant={role === 'super_admin' ? 'destructive' : 'secondary'} className="text-xs">
                            {role.replace('_', ' ')}
                          </Badge>
                        ))}
                        {user.roles.length === 0 && <span className="text-muted-foreground text-sm">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {user.organizations.slice(0, 2).map((org) => (
                          <Badge key={org.id} variant="outline" className="text-xs">{org.name}</Badge>
                        ))}
                        {user.organizations.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{user.organizations.length - 2}</Badge>
                        )}
                        {user.organizations.length === 0 && <span className="text-muted-foreground text-sm">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>{user.status}</Badge>
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
                  </TableRow>
                ))}
                {paginatedUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <PaginationControls
              page={pagination.page}
              pageSize={pagination.pageSize}
              totalCount={pagination.totalCount}
              totalPages={pagination.totalPages}
              hasNextPage={pagination.hasNextPage}
              hasPrevPage={pagination.hasPrevPage}
              onPageChange={pagination.setPage}
              onPageSizeChange={pagination.setPageSize}
              isLoading={loading}
            />
          </CardContent>
        </Card>

        {/* Combined User Detail Sheet */}
        <UserDetailSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          user={selectedUser}
          onUserDeleted={() => {
            fetchUsers();
            setSheetOpen(false);
          }}
        />
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminUsers;
