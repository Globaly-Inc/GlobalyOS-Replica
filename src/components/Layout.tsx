import { useEffect, useState, useRef, useCallback } from "react";
import { NavLink } from "./NavLink";
import { Users, Home, Menu, LogOut, User, CalendarPlus, SquarePen, Bell, Settings, ScanLine, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { AddLeaveRequestDialog } from "./dialogs/AddLeaveRequestDialog";
import { PostUpdateDialog } from "./dialogs/PostUpdateDialog";
import { QRScannerDialog } from "./dialogs/QRScannerDialog";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { MobileBottomNav } from "./MobileBottomNav";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Team", href: "/team", icon: Users },
];

interface UserProfile {
  fullName: string;
  position: string;
  avatarUrl: string | null;
  employeeId: string | null;
  role: string | null;
}

const getRoleConfig = (role?: string | null) => {
  switch (role) {
    case 'admin':
      return { label: 'Admin', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'hr':
      return { label: 'HR', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    default:
      return { label: 'User', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
  }
};

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentOrg } = useOrganization();
  const { playNotificationSound } = useNotificationSound();
  const { preferences, shouldPlaySound } = useNotificationPreferences();
  const previousCountRef = useRef<number>(0);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("");

  // Send push notification when a new notification is created
  const sendPushNotification = useCallback(async (notification: any) => {
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: user?.id,
          title: notification.title || "New notification",
          body: notification.message || "You have a new notification",
          url: "/notifications",
          tag: notification.type || "notification",
        },
      });
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }, [user?.id]);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return;
      
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      
      const newCount = count || 0;
      
      // Play sound if count increased and preferences allow
      if (newCount > previousCountRef.current && previousCountRef.current !== 0) {
        if (shouldPlaySound()) {
          playNotificationSound(preferences.soundType);
        }
      }
      
      previousCountRef.current = newCount;
      setUnreadCount(newCount);
    };

    fetchUnreadCount();

    // Real-time subscription for notification updates
    const channel = supabase
      .channel("layout-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          // Play notification sound based on preferences
          const notificationType = (payload.new as { type?: string })?.type;
          if (shouldPlaySound(notificationType)) {
            playNotificationSound(preferences.soundType);
          }
          // Send push notification
          sendPushNotification(payload.new);
          
          // Update count
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, playNotificationSound, sendPushNotification, shouldPlaySound, preferences.soundType]);

  // Fetch today's attendance record to check if user is checked in
  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.id) return;

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!employee) return;

    const today = new Date().toISOString().split('T')[0];
    // Find active session (checked in but not out)
    const { data: activeSession } = await supabase
      .from("attendance_records")
      .select("check_in_time, check_out_time")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .is("check_out_time", null)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeSession?.check_in_time) {
      setCheckInTime(new Date(activeSession.check_in_time));
    } else {
      setCheckInTime(null);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTodayAttendance();

    // Subscribe to attendance changes
    const channel = supabase
      .channel("layout-attendance")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
        },
        () => {
          fetchTodayAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTodayAttendance]);

  // Re-fetch attendance when QR scanner closes
  useEffect(() => {
    if (!qrScannerOpen) {
      fetchTodayAttendance();
    }
  }, [qrScannerOpen, fetchTodayAttendance]);

  // Update elapsed time every second
  useEffect(() => {
    if (!checkInTime) {
      setElapsedTime("");
      return;
    }

    const updateElapsed = () => {
      const now = new Date();
      const diff = now.getTime() - checkInTime.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsedTime(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [checkInTime]);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id || !currentOrg) return;

      // Get profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      // Get employee data for current org
      const { data: employee } = await supabase
        .from("employees")
        .select("id, position")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      // Get user role for current org
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      if (profile) {
        setUserProfile({
          fullName: profile.full_name,
          position: employee?.position || "",
          avatarUrl: profile.avatar_url,
          employeeId: employee?.id || null,
          role: roleData?.role || null,
        });
      }
    };

    loadUserProfile();
  }, [user?.id, currentOrg?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleViewProfile = () => {
    if (userProfile?.employeeId) {
      navigate(`/team/${userProfile.employeeId}`);
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

  const roleConfig = getRoleConfig(userProfile?.role);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center px-4 md:px-8">
          <div className="mr-4 hidden md:flex items-center">
            <button 
              onClick={() => navigate("/landing")}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark hover:opacity-90 transition-opacity"
            >
              <Users className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>

          {(userProfile?.role === 'admin' || userProfile?.role === 'hr') && (
            <div className="hidden md:block mr-4">
              <OrganizationSwitcher />
            </div>
          )}
          
          <nav className="hidden md:flex md:flex-1 md:items-center md:space-x-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                activeClassName="bg-secondary text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex md:items-center md:gap-2">
            {elapsedTime && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>{elapsedTime}</span>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setQrScannerOpen(true)}
                  disabled={!userProfile?.employeeId}
                >
                  <ScanLine className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Quick Check-In</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setPostDialogOpen(true)}
                  disabled={!userProfile?.employeeId}
                >
                  <SquarePen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>New Post</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setLeaveDialogOpen(true)}
                  disabled={!userProfile?.employeeId}
                >
                  <CalendarPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Request Leave</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 relative"
                  onClick={() => navigate("/notifications")}
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
            {(userProfile?.role === 'admin' || userProfile?.role === 'hr') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Organization Settings</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button 
              variant="outline" 
              className="flex items-center gap-2 px-2 h-10 hover:bg-secondary"
              onClick={handleViewProfile}
              disabled={!userProfile?.employeeId}
            >
              <Avatar className="h-7 w-7 border-2 border-primary/10">
                <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.fullName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold text-xs">
                  {userProfile?.fullName ? getInitials(userProfile.fullName) : user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start gap-0">
                <span className="text-sm font-medium text-foreground leading-tight">
                  {userProfile?.fullName || "Loading..."}
                </span>
                <Badge className={`text-[10px] px-1.5 py-0 h-4 font-normal ${roleConfig.className} border-0`}>
                  {roleConfig.label}
                </Badge>
              </div>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleSignOut}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Mobile Header - Minimal */}
          <div className="flex flex-1 items-center justify-between md:hidden">
            <button 
              onClick={() => navigate("/")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark"
            >
              <Users className="h-4 w-4 text-primary-foreground" />
            </button>
            
            <div className="flex items-center gap-2">
              {elapsedTime && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium">
                  <Clock className="h-3 w-3" />
                  <span>{elapsedTime}</span>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 relative"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 pt-2 pb-24 md:pb-8 md:px-8 overflow-x-hidden">{children}</main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {userProfile?.employeeId && (
        <>
          <QRScannerDialog
            open={qrScannerOpen}
            onOpenChange={setQrScannerOpen}
          />
          <AddLeaveRequestDialog
            employeeId={userProfile.employeeId}
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
          />
          <PostUpdateDialog
            open={postDialogOpen}
            onOpenChange={setPostDialogOpen}
            canPostAnnouncement={userProfile?.role === 'admin' || userProfile?.role === 'hr'}
          />
        </>
      )}
    </div>
  );
};
