import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, startOfDay, isSameDay } from "date-fns";

interface UserActivityLogsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
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
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'chat_sent':
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case 'update_posted':
      return <FileText className="h-4 w-4 text-purple-500" />;
    case 'kudos_given':
      return <Heart className="h-4 w-4 text-pink-500" />;
    case 'leave_requested':
      return <Calendar className="h-4 w-4 text-orange-500" />;
    case 'kpi_created':
      return <BarChart3 className="h-4 w-4 text-indigo-500" />;
    case 'attendance_checked_in':
      return <Clock className="h-4 w-4 text-teal-500" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
};

const getActivityLabel = (type: string) => {
  switch (type) {
    case 'wiki_created':
      return 'Created wiki page';
    case 'chat_sent':
      return 'Sent chat message';
    case 'update_posted':
      return 'Posted update';
    case 'kudos_given':
      return 'Gave kudos';
    case 'leave_requested':
      return 'Requested leave';
    case 'kpi_created':
      return 'Created KPI';
    case 'attendance_checked_in':
      return 'Checked in';
    default:
      return type.replace(/_/g, ' ');
  }
};

const getDeviceIcon = (device: string | null) => {
  switch (device) {
    case 'mobile':
      return <Smartphone className="h-3 w-3" />;
    case 'tablet':
      return <Tablet className="h-3 w-3" />;
    default:
      return <Monitor className="h-3 w-3" />;
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const formatDateGroup = (date: Date) => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, d MMMM');
};

const groupByDate = <T extends { visited_at?: string; created_at?: string }>(
  items: T[]
): { date: Date; items: T[] }[] => {
  const groups: Map<string, T[]> = new Map();
  
  items.forEach((item) => {
    const dateStr = item.visited_at || item.created_at || '';
    const date = startOfDay(new Date(dateStr));
    const key = date.toISOString();
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  });

  return Array.from(groups.entries())
    .map(([key, items]) => ({ date: new Date(key), items }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const UserActivityLogsSheet = ({
  open,
  onOpenChange,
  user,
}: UserActivityLogsSheetProps) => {
  const [pageVisits, setPageVisits] = useState<PageVisit[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalActivities: 0,
    uniquePages: 0,
    lastActive: null as string | null,
  });

  useEffect(() => {
    if (!user?.id || !open) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch page visits
        const { data: visits } = await supabase
          .from('user_page_visits')
          .select('*')
          .eq('user_id', user.id)
          .order('visited_at', { ascending: false })
          .limit(200);

        // Fetch activity logs
        const { data: activityLogs } = await supabase
          .from('user_activity_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(200);

        const visitData = visits || [];
        const activityData = activityLogs || [];

        setPageVisits(visitData);
        setActivities(activityData);

        // Calculate stats
        const uniquePages = new Set(visitData.map((v) => v.page_path)).size;
        const lastVisit = visitData[0]?.visited_at;
        const lastActivity = activityData[0]?.created_at;
        const lastActive = lastVisit && lastActivity
          ? new Date(lastVisit) > new Date(lastActivity) ? lastVisit : lastActivity
          : lastVisit || lastActivity;

        setStats({
          totalVisits: visitData.length,
          totalActivities: activityData.length,
          uniquePages,
          lastActive,
        });
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
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-left">{user.full_name}</p>
              <p className="text-sm font-normal text-muted-foreground text-left">
                {user.email}
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {stats.totalVisits}
                </p>
                <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Visits</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {stats.totalActivities}
                </p>
                <p className="text-[10px] text-green-600/80 dark:text-green-400/80">Activities</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Globe className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {stats.uniquePages}
                </p>
                <p className="text-[10px] text-purple-600/80 dark:text-purple-400/80">Pages</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 leading-tight">
                  {stats.lastActive
                    ? formatDistanceToNow(new Date(stats.lastActive), { addSuffix: true })
                    : 'Never'}
                </p>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">Last Active</p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="visits" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="visits" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Page Visits ({stats.totalVisits})
                </TabsTrigger>
                <TabsTrigger value="activities" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Activities ({stats.totalActivities})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="visits" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {visitGroups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No page visits recorded
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {visitGroups.map((group) => (
                        <div key={group.date.toISOString()}>
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatDateGroup(group.date)}
                            </span>
                          </div>
                          <div className="space-y-2 border-l-2 border-muted ml-2 pl-4">
                            {group.items.map((visit) => (
                              <div
                                key={visit.id}
                                className="flex items-start justify-between py-2 hover:bg-muted/50 rounded-md -ml-2 px-2"
                              >
                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                  <Globe className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">
                                      {visit.page_path}
                                    </p>
                                    {visit.page_title && visit.page_title !== visit.page_path && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        {visit.page_title}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(visit.visited_at), 'HH:mm')}
                                  </span>
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    {getDeviceIcon(visit.device_type)}
                                    {visit.browser_info && (
                                      <span className="text-[10px]">{visit.browser_info}</span>
                                    )}
                                  </div>
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

              <TabsContent value="activities" className="mt-4">
                <ScrollArea className="h-[400px] pr-4">
                  {activityGroups.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No activities recorded
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {activityGroups.map((group) => (
                        <div key={group.date.toISOString()}>
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {formatDateGroup(group.date)}
                            </span>
                          </div>
                          <div className="space-y-2 border-l-2 border-muted ml-2 pl-4">
                            {group.items.map((activity) => (
                              <div
                                key={activity.id}
                                className="flex items-center justify-between py-2 hover:bg-muted/50 rounded-md -ml-2 px-2"
                              >
                                <div className="flex items-center gap-2">
                                  {getActivityIcon(activity.activity_type)}
                                  <span className="text-sm">
                                    {getActivityLabel(activity.activity_type)}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">
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
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
