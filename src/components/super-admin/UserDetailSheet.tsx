import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Globe,
  MessageSquare,
  FileText,
  Heart,
  Calendar,
  BarChart3,
  Clock,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Activity,
  Building2,
  Shield,
  User as UserIcon,
  Zap,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, subDays } from "date-fns";
import { cn } from "@/lib/utils";

type TimePeriod = 'today' | '7days' | '30days' | 'all';

const ACTIVITY_TYPES = [
  { type: 'wiki_created', label: 'Wiki', icon: FileText, bgClass: 'bg-blue-50 dark:bg-blue-900/20', textClass: 'text-blue-700 dark:text-blue-300', iconClass: 'text-blue-600 dark:text-blue-400' },
  { type: 'chat_sent', label: 'Chats', icon: MessageSquare, bgClass: 'bg-green-50 dark:bg-green-900/20', textClass: 'text-green-700 dark:text-green-300', iconClass: 'text-green-600 dark:text-green-400' },
  { type: 'update_posted', label: 'Posts', icon: FileText, bgClass: 'bg-purple-50 dark:bg-purple-900/20', textClass: 'text-purple-700 dark:text-purple-300', iconClass: 'text-purple-600 dark:text-purple-400' },
  { type: 'kudos_given', label: 'Kudos', icon: Heart, bgClass: 'bg-pink-50 dark:bg-pink-900/20', textClass: 'text-pink-700 dark:text-pink-300', iconClass: 'text-pink-600 dark:text-pink-400' },
  { type: 'leave_requested', label: 'Leaves', icon: Calendar, bgClass: 'bg-orange-50 dark:bg-orange-900/20', textClass: 'text-orange-700 dark:text-orange-300', iconClass: 'text-orange-600 dark:text-orange-400' },
  { type: 'kpi_created', label: 'KPIs', icon: BarChart3, bgClass: 'bg-indigo-50 dark:bg-indigo-900/20', textClass: 'text-indigo-700 dark:text-indigo-300', iconClass: 'text-indigo-600 dark:text-indigo-400' },
  { type: 'attendance_checked_in', label: 'Check-ins', icon: Clock, bgClass: 'bg-teal-50 dark:bg-teal-900/20', textClass: 'text-teal-700 dark:text-teal-300', iconClass: 'text-teal-600 dark:text-teal-400' },
  { type: 'login', label: 'Logins', icon: Zap, bgClass: 'bg-amber-50 dark:bg-amber-900/20', textClass: 'text-amber-700 dark:text-amber-300', iconClass: 'text-amber-600 dark:text-amber-400' },
];

interface UserDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    created_at: string;
    organizations: { id: string; name: string; slug: string; role: string }[];
    roles: string[];
    status: string;
    total_page_visits: number;
    total_activities: number;
    last_active_at: string | null;
  } | null;
}

interface PageVisit {
  id: string;
  page_path: string;
  page_title: string | null;
  visited_at: string;
  browser_info: string | null;
  device_type: string | null;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  entity_type: string;
  created_at: string;
  metadata: unknown;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'wiki_created':
      return <FileText className="h-3.5 w-3.5 text-blue-500" />;
    case 'chat_sent':
      return <MessageSquare className="h-3.5 w-3.5 text-green-500" />;
    case 'update_posted':
      return <FileText className="h-3.5 w-3.5 text-purple-500" />;
    case 'kudos_given':
      return <Heart className="h-3.5 w-3.5 text-pink-500" />;
    case 'leave_requested':
      return <Calendar className="h-3.5 w-3.5 text-orange-500" />;
    case 'kpi_created':
      return <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />;
    case 'attendance_checked_in':
      return <Clock className="h-3.5 w-3.5 text-teal-500" />;
    default:
      return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const getActivityLabel = (type: string) => {
  switch (type) {
    case 'wiki_created': return 'Created wiki page';
    case 'chat_sent': return 'Sent chat message';
    case 'update_posted': return 'Posted update';
    case 'kudos_given': return 'Gave kudos';
    case 'leave_requested': return 'Requested leave';
    case 'kpi_created': return 'Created KPI';
    case 'attendance_checked_in': return 'Checked in';
    default: return type.replace(/_/g, ' ');
  }
};

const getDeviceIcon = (device: string | null) => {
  switch (device) {
    case 'mobile': return <Smartphone className="h-3 w-3" />;
    case 'tablet': return <Tablet className="h-3 w-3" />;
    default: return <Monitor className="h-3 w-3" />;
  }
};

const getInitials = (name: string) => {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const formatDateGroup = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
};

const groupByDate = <T extends { visited_at?: string; created_at?: string }>(
  items: T[]
): { date: Date; items: T[] }[] => {
  const groups: Map<string, T[]> = new Map();
  
  items.forEach((item) => {
    const dateStr = item.visited_at || item.created_at || '';
    const date = startOfDay(new Date(dateStr));
    const key = date.toISOString();
    
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });

  return Array.from(groups.entries())
    .map(([key, items]) => ({ date: new Date(key), items }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const UserDetailSheet = ({ open, onOpenChange, user }: UserDetailSheetProps) => {
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityPeriod, setActivityPeriod] = useState<TimePeriod>('all');
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalActivities: 0,
    uniquePages: 0,
    lastActive: null as string | null,
  });

  const filteredActivityCounts = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;
    
    switch (activityPeriod) {
      case 'today': startDate = startOfDay(now); break;
      case '7days': startDate = subDays(now, 7); break;
      case '30days': startDate = subDays(now, 30); break;
      default: startDate = null;
    }
    
    const filteredActivities = startDate 
      ? activities.filter(a => new Date(a.created_at) >= startDate!)
      : activities;
    
    const counts: Record<string, number> = {};
    filteredActivities.forEach((a) => {
      counts[a.activity_type] = (counts[a.activity_type] || 0) + 1;
    });
    
    return counts;
  }, [activities, activityPeriod]);

  useEffect(() => {
    if (!user?.id || !open) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [{ data: visits }, { data: activityLogs }] = await Promise.all([
          supabase
            .from('user_page_visits')
            .select('*')
            .eq('user_id', user.id)
            .order('visited_at', { ascending: false })
            .limit(200),
          supabase
            .from('user_activity_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(200),
        ]);

        const visitData = visits || [];
        const activityData = activityLogs || [];

        setPageVisits(visitData);
        setActivities(activityData);

        const uniquePages = new Set(visitData.map((v) => v.page_path)).size;
        const lastVisit = visitData[0]?.visited_at;
        const lastActivity = activityData[0]?.created_at;
        const lastActive = lastVisit && lastActivity
          ? new Date(lastVisit) > new Date(lastActivity) ? lastVisit : lastActivity
          : lastVisit || lastActivity;

        setStats({ totalVisits: visitData.length, totalActivities: activityData.length, uniquePages, lastActive });
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, open]);

  if (!user) return null;

  const visitGroups = groupByDate(pageVisits);
  const activityGroups = groupByDate(activities);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col">
        {/* Compact Header */}
        <SheetHeader className="p-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-sm">{getInitials(user.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Badge variant={user.status === 'active' ? 'default' : 'secondary'} className="shrink-0">
              {user.status}
            </Badge>
          </div>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="overview" className="flex-1 flex flex-col">
            <TabsList className="w-full grid grid-cols-3 mx-4 mt-3" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger value="overview" className="text-xs gap-1">
                <UserIcon className="h-3 w-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="visits" className="text-xs gap-1">
                <Eye className="h-3 w-3" />
                Visits ({stats.totalVisits})
              </TabsTrigger>
              <TabsTrigger value="activities" className="text-xs gap-1">
                <Activity className="h-3 w-3" />
                Activity ({stats.totalActivities})
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 m-0 p-4 space-y-4">
              {/* Section 1: Role + Joined */}
              <div className="flex items-center gap-4 text-sm bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">Roles:</span>
                  <div className="flex gap-1 flex-wrap">
                    {user.roles.length > 0 ? user.roles.map((role) => (
                      <Badge key={role} variant={role === 'super_admin' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                        {role.replace('_', ' ')}
                      </Badge>
                    )) : <span className="text-muted-foreground text-xs">None</span>}
                  </div>
                </div>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined:</span>
                  <span className="font-medium">{format(new Date(user.created_at), "d MMM yyyy")}</span>
                </div>
              </div>

              {/* Section 2: Organizations */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Organisations ({user.organizations.length})</span>
                </div>
                {user.organizations.length > 0 ? (
                  <div className="space-y-1.5">
                    {user.organizations.map((org) => (
                      <div key={org.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{org.name}</p>
                            <code className="text-[10px] text-muted-foreground">{org.slug}</code>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{org.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Not a member of any organisation</p>
                )}
              </div>

              {/* Section 3: Overview Stats */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">Overview</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                    <Eye className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mx-auto mb-0.5" />
                    <p className="text-base font-bold text-blue-700 dark:text-blue-300">{stats.totalVisits}</p>
                    <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Visits</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                    <Activity className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mx-auto mb-0.5" />
                    <p className="text-base font-bold text-green-700 dark:text-green-300">{stats.totalActivities}</p>
                    <p className="text-[10px] text-green-600/80 dark:text-green-400/80">Actions</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center">
                    <Globe className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 mx-auto mb-0.5" />
                    <p className="text-base font-bold text-purple-700 dark:text-purple-300">{stats.uniquePages}</p>
                    <p className="text-[10px] text-purple-600/80 dark:text-purple-400/80">Pages</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center">
                    <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mx-auto mb-0.5" />
                    <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 leading-tight">
                      {stats.lastActive ? formatDistanceToNow(new Date(stats.lastActive), { addSuffix: false }) : 'Never'}
                    </p>
                    <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Last Active</p>
                  </div>
                </div>
              </div>

              {/* Section 4: Activity Breakdown */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium">Activity Breakdown</span>
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={activityPeriod} 
                    onValueChange={(v) => v && setActivityPeriod(v as TimePeriod)}
                    className="h-6"
                  >
                    <ToggleGroupItem value="today" className="text-[10px] px-2 h-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">Today</ToggleGroupItem>
                    <ToggleGroupItem value="7days" className="text-[10px] px-2 h-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">7d</ToggleGroupItem>
                    <ToggleGroupItem value="30days" className="text-[10px] px-2 h-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">30d</ToggleGroupItem>
                    <ToggleGroupItem value="all" className="text-[10px] px-2 h-6 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">All</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {ACTIVITY_TYPES.map(({ type, label, icon: Icon, bgClass, textClass, iconClass }) => {
                    const count = filteredActivityCounts[type] || 0;
                    return (
                      <div 
                        key={type} 
                        className={cn(
                          "rounded-lg p-2 text-center transition-opacity",
                          bgClass,
                          count === 0 && "opacity-40"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 mx-auto mb-0.5", iconClass)} />
                        <p className={cn("text-base font-bold", textClass)}>{count}</p>
                        <p className={cn("text-[10px] opacity-80", textClass)}>{label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Page Visits Tab */}
            <TabsContent value="visits" className="flex-1 m-0">
              <ScrollArea className="h-[calc(100vh-180px)] px-4">
                {visitGroups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No page visits recorded</p>
                ) : (
                  <div className="space-y-4 py-2">
                    {visitGroups.map((group) => (
                      <div key={group.date.toISOString()}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatDateGroup(group.date)}
                          </span>
                        </div>
                        <div className="space-y-1 border-l-2 border-muted ml-1.5 pl-3">
                          {group.items.map((visit) => (
                            <div key={visit.id} className="flex items-center justify-between py-1.5 hover:bg-muted/50 rounded -ml-1.5 px-1.5">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{visit.page_path}</p>
                                  {visit.page_title && visit.page_title !== visit.page_path && (
                                    <p className="text-[10px] text-muted-foreground truncate">{visit.page_title}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[10px] text-muted-foreground">{format(new Date(visit.visited_at), 'HH:mm')}</span>
                                {getDeviceIcon(visit.device_type)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities" className="flex-1 m-0">
              <ScrollArea className="h-[calc(100vh-180px)] px-4">
                {activityGroups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No activities recorded</p>
                ) : (
                  <div className="space-y-4 py-2">
                    {activityGroups.map((group) => (
                      <div key={group.date.toISOString()}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {formatDateGroup(group.date)}
                          </span>
                        </div>
                        <div className="space-y-1 border-l-2 border-muted ml-1.5 pl-3">
                          {group.items.map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between py-1.5 hover:bg-muted/50 rounded -ml-1.5 px-1.5">
                              <div className="flex items-center gap-2">
                                {getActivityIcon(activity.activity_type)}
                                <span className="text-xs">{getActivityLabel(activity.activity_type)}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">
                                {format(new Date(activity.created_at), 'HH:mm')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
};
