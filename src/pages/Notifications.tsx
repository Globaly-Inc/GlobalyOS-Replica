import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
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
import { Bell, Heart, AtSign, Calendar, CheckCheck, Loader2, BellRing, BellOff, Settings2, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSupported, isSubscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [markingAllRead, setMarkingAllRead] = useState(false);

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
      navigate("/");
    } else if (notification.reference_type === "leave_request") {
      navigate("/leave-history");
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

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "all") return true;
    if (activeTab === "kudos") return n.type === "kudos";
    if (activeTab === "mentions") return n.type === "mention";
    if (activeTab === "reactions") return n.type === "reaction";
    if (activeTab === "leave") return n.type === "leave_request" || n.type === "leave_decision";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const kudosCount = notifications.filter((n) => n.type === "kudos").length;
  const mentionsCount = notifications.filter((n) => n.type === "mention").length;
  const reactionsCount = notifications.filter((n) => n.type === "reaction").length;
  const leaveCount = notifications.filter((n) => n.type === "leave_request" || n.type === "leave_decision").length;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="Notifications" />
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={markingAllRead}
              >
                {markingAllRead ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                Mark all as read
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/notifications/preferences")}
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
          <Card className="mb-6">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <BellRing className="h-5 w-5 text-primary" />
                ) : (
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium text-sm">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {isSubscribed 
                      ? "You'll receive browser notifications even when the app is in background" 
                      : "Enable to receive notifications even when the app is not in focus"}
                  </p>
                </div>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={pushLoading}
              />
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">
              All
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="kudos">
              Kudos
              {kudosCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {kudosCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentions">
              Mentions
              {mentionsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {mentionsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reactions">
              Reactions
              {reactionsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {reactionsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leave">
              Leave
              {leaveCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {leaveCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
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
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !notification.is_read
                      ? "bg-primary/5 border-primary/20"
                      : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    {notification.actor ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notification.actor.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(notification.actor.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.type)}
                          <p className="font-medium text-sm">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Notifications;
