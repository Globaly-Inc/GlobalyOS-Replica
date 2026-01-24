import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, Building2, Users } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

export type DatePreset = 'last7' | 'last30' | 'last90' | 'last6months' | 'last12months' | 'custom';
export type ViewMode = 'days' | 'week' | 'month';

interface Organization {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  organization_id?: string;
}

interface AnalyticsFiltersProps {
  selectedOrgs: string[];
  onOrgsChange: (orgs: string[]) => void;
  selectedUsers: string[];
  onUsersChange: (users: string[]) => void;
  datePreset: DatePreset;
  onDatePresetChange: (preset: DatePreset) => void;
  customStartDate: Date | undefined;
  onCustomStartDateChange: (date: Date | undefined) => void;
  customEndDate: Date | undefined;
  onCustomEndDateChange: (date: Date | undefined) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'last6months', label: 'Last 6 months' },
  { value: 'last12months', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

const AnalyticsFilters = ({
  selectedOrgs,
  onOrgsChange,
  selectedUsers,
  onUsersChange,
  datePreset,
  onDatePresetChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  viewMode,
  onViewModeChange,
}: AnalyticsFiltersProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrgs.length === 1) {
      fetchUsersForOrg(selectedOrgs[0]);
    } else {
      setUsers([]);
      // Only clear parent state if users are currently selected to prevent infinite loops
      if (selectedUsers.length > 0) {
        onUsersChange([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgs.join(',')]);

  const fetchOrganizations = async () => {
    try {
      const { data } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchUsersForOrg = async (orgId: string) => {
    setLoadingUsers(true);
    try {
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id')
        .eq('organization_id', orgId);
      
      if (employees && employees.length > 0) {
        const userIds = employees.map(e => e.user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        setUsers(profiles || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleOrgSelect = (orgId: string) => {
    if (orgId === 'all') {
      onOrgsChange([]);
    } else if (selectedOrgs.includes(orgId)) {
      onOrgsChange(selectedOrgs.filter(id => id !== orgId));
    } else {
      onOrgsChange([...selectedOrgs, orgId]);
    }
  };

  const handleUserSelect = (userId: string) => {
    if (userId === 'all') {
      onUsersChange([]);
    } else if (selectedUsers.includes(userId)) {
      onUsersChange(selectedUsers.filter(id => id !== userId));
    } else {
      onUsersChange([...selectedUsers, userId]);
    }
  };

  const getOrgLabel = () => {
    if (selectedOrgs.length === 0) return 'All Organisations';
    if (selectedOrgs.length === 1) {
      return organizations.find(o => o.id === selectedOrgs[0])?.name || 'Selected';
    }
    return `${selectedOrgs.length} organisations`;
  };

  const getUserLabel = () => {
    if (selectedUsers.length === 0) return 'All Users';
    if (selectedUsers.length === 1) {
      return users.find(u => u.id === selectedUsers[0])?.full_name || 'Selected';
    }
    return `${selectedUsers.length} users`;
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border border-border">
      {/* Organization Filter */}
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <Select
          value={selectedOrgs.length === 0 ? 'all' : selectedOrgs[0]}
          onValueChange={handleOrgSelect}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select organisation">
              {getOrgLabel()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organisations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedOrgs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onOrgsChange([])}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* User Filter (only shown when single org selected) */}
      {selectedOrgs.length === 1 && (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedUsers.length === 0 ? 'all' : selectedUsers[0]}
            onValueChange={handleUserSelect}
            disabled={loadingUsers}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select user">
                {getUserLabel()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email || 'Unknown'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedUsers.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onUsersChange([])}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      <div className="h-6 w-px bg-border" />

      {/* View Mode */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">View:</span>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['days', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Period:</span>
        <Select value={datePreset} onValueChange={(v) => onDatePresetChange(v as DatePreset)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {datePreset === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {customStartDate ? format(customStartDate, 'dd MMM yyyy') : 'Start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={onCustomStartDateChange}
                disabled={(date) => date > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {customEndDate ? format(customEndDate, 'dd MMM yyyy') : 'End date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={onCustomEndDateChange}
                disabled={(date) => date > new Date() || (customStartDate && date < customStartDate)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Active Filters Display */}
      {(selectedOrgs.length > 0 || selectedUsers.length > 0) && (
        <>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            {selectedOrgs.map((orgId) => {
              const org = organizations.find(o => o.id === orgId);
              return (
                <Badge key={orgId} variant="secondary" className="gap-1">
                  {org?.name || 'Unknown'}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => onOrgsChange(selectedOrgs.filter(id => id !== orgId))}
                  />
                </Badge>
              );
            })}
            {selectedUsers.map((userId) => {
              const user = users.find(u => u.id === userId);
              return (
                <Badge key={userId} variant="outline" className="gap-1">
                  {user?.full_name || 'Unknown'}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                    onClick={() => onUsersChange(selectedUsers.filter(id => id !== userId))}
                  />
                </Badge>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsFilters;
