import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { formatDateTime } from "@/lib/utils";
import { Bell, Heart, AtSign, Calendar, CheckCheck, Loader2, BellRing, BellOff, Settings2, SmilePlus, Target } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

const Notifications = () => {
  const { navigateOrg } = useOrgNavigation();
  const { user } = useAuth();
  const { isSupported, isSubscribed, permission, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [testingSend, setTestingSend] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sendTestNotification = async () => {
    if (!user) return;
    
    try {
      setTestingSend(true);
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: user.id,
          title: "Test Notification 🔔",
          body: "This is how push notifications look in your browser. You're all set!",
          url: "/notifications",
          tag: `test-${Date.now()}`,
          requireInteraction: true,
        },
      });
      
      if (error) throw error;
      toast.success("Test notification sent! Check your browser.");
    } catch (error) {
      console.error("Error sending test notification:", error);
      toast.error("Failed to send test notification");
    } finally {
      setTestingSend(false);
    }
  };


  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          type,
          title,
          message,
          reference_type,
          reference_id,
          is_read,
          created_at,
          actor:actor_id (
            id,
            user_id
          )
        `)
        .eq("user_id", user.id)
        .neq("type", "chat_message")
        .neq("type", "chat_mention")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch actor profiles separately
      const actorIds = data
        ?.filter((n: any) => n.actor?.user_id)
        .map((n: any) => n.actor.user_id) || [];

      let profilesMap: Record<string, any> = {};
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", actorIds);

        profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }

      const formattedNotifications = data?.map((n: any) => ({
        ...n,
        actor: n.actor?.user_id ? {
          id: n.actor.id,
          full_name: profilesMap[n.actor.user_id]?.full_name || "Unknown",
          avatar_url: profilesMap[n.actor.user_id]?.avatar_url || null,
        } : null,
      })) || [];

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user?.id)
        .eq("is_read", false);

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all as read");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate based on reference type
    if (notification.reference_type === "kudos" || notification.reference_type === "update") {
      navigateOrg("/");
    } else if (notification.reference_type === "leave_request") {
      navigateOrg("/leave-history");
    } else if (notification.reference_type === "kpi") {
      // Navigate to specific KPI if reference_id exists
      if (notification.reference_id) {
        navigateOrg(`/kpi/${notification.reference_id}`);
      } else {
        navigateOrg("/kpi");
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "kudos":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "mention":
        return <AtSign className="h-4 w-4 text-blue-500" />;
      case "reaction":
        return <SmilePlus className="h-4 w-4 text-amber-500" />;
      case "leave_request":
      case "leave_decision":
        return <Calendar className="h-4 w-4 text-green-500" />;
      case "kpi_assigned":
        return <Target className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
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

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "all") return true;
      if (activeTab === "kudos") return n.type === "kudos";
      if (activeTab === "mentions") return n.type === "mention";
      if (activeTab === "reactions") return n.type === "reaction";
      if (activeTab === "leave") return n.type === "leave_request" || n.type === "leave_decision";
      return true;
    });
  }, [notifications, activeTab]);

  // Pagination
  const pagination = usePagination({ pageKey: 'notifications' });

  // Update total count when filtered notifications change
  useEffect(() => {
    pagination.setTotalCount(filteredNotifications.length);
  }, [filteredNotifications.length]);

  // Reset to page 1 when tab changes
  useEffect(() => {
    pagination.resetPage();
  }, [activeTab]);

  // Paginated notifications - must be declared before keyboard handler
  const paginatedNotifications = useMemo(() => {
    return filteredNotifications.slice(pagination.from, pagination.from + pagination.pageSize);
  }, [filteredNotifications, pagination.from, pagination.pageSize]);


  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const kudosCount = notifications.filter((n) => n.type === "kudos").length;
  const mentionsCount = notifications.filter((n) => n.type === "mention").length;
  const reactionsCount = notifications.filter((n) => n.type === "reaction").length;
  const leaveCount = notifications.filter((n) => n.type === "leave_request" || n.type === "leave_decision").length;

  return (
    <div className="space-y-4 md:space-y-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <PageHeader title="Notifications" />
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={markingAllRead}
                className="hidden sm:flex"
              >
                {markingAllRead ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all as read
              </Button>
            )}
            {unreadCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={markAllAsRead}
                    disabled={markingAllRead}
                    className="sm:hidden h-9 w-9"
                  >
                    {markingAllRead ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCheck className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark all as read</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => navigateOrg("/notifications/preferences")}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notification Preferences</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Push Notification Settings */}
        {isSupported && (
          <Card className="mb-4 sm:mb-6 border-primary/10">
            <CardContent className="p-4 sm:p-5">
              {/* Single row: Header left, Controls right */}
              <div className="flex items-center justify-between gap-3">
                {/* Left: Icon + Text */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${isSubscribed ? 'bg-primary/10' : 'bg-muted'}`}>
                    {isSubscribed ? (
                      <BellRing className="h-5 w-5 text-primary" />
                    ) : (
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm sm:text-base">Push Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      {isSubscribed 
                        ? "Receive real-time notifications even when the app is closed" 
                        : "Get notified instantly, even when you're not using the app"}
                    </p>
                  </div>
                </div>
                
                {/* Right: Test button (when subscribed) + Toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSubscribed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sendTestNotification}
                      disabled={testingSend}
                    >
                      {testingSend ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Bell className="h-4 w-4 mr-2" />
                      )}
                      {testingSend ? "Sending..." : "Send Test"}
                    </Button>
                  )}
                  <Switch
                    checked={isSubscribed}
                    onCheckedChange={handlePushToggle}
                    disabled={pushLoading}
                  />
                </div>
              </div>
              
              {/* Permission prompts */}
              {!isSubscribed && permission !== 'denied' && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-3">
                  💡 When you enable push notifications, your browser will ask for permission. Click "Allow" to receive notifications.
                </p>
              )}
              
              {permission === 'denied' && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2 mt-3">
                  ⚠️ Notifications are blocked. Please enable them in your browser settings to receive push notifications.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 mb-4 sm:mb-6">
            <TabsList className="w-max sm:w-auto">
              <TabsTrigger value="all" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1.5">
                <Bell className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">All</span>
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="kudos" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1.5">
                <Heart className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Kudos</span>
                {kudosCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">
                    {kudosCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="mentions" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1.5">
                <AtSign className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Mentions</span>
                {mentionsCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">
                    {mentionsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reactions" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1.5">
                <SmilePlus className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Reactions</span>
                {reactionsCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">
                    {reactionsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="leave" className="text-xs sm:text-sm px-2.5 sm:px-3 gap-1.5">
                <Calendar className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Leave</span>
                {leaveCount > 0 && (
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">
                    {leaveCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-2 sm:space-y-3">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : filteredNotifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {paginatedNotifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      !notification.is_read
                        ? "bg-primary/5 border-primary/20"
                        : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                      {notification.actor ? (
                        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                          <AvatarImage src={notification.actor.avatar_url || undefined} />
                          <AvatarFallback className="text-xs sm:text-sm">
                            {getInitials(notification.actor.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {getNotificationIcon(notification.type)}
                            <p className="font-medium text-sm truncate">
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
              </>
            )}
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default Notifications;
