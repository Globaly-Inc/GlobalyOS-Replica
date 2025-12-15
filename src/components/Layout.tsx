import { useEffect, useState, useRef, useCallback } from 'react';
import { Users, LogOut, CalendarPlus, SquarePen, Bell, Settings, ScanLine, Clock, Calendar, BookOpen, BarChart3, Search, ClipboardCheck } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { supabase } from "@/integrations/supabase/client";
import { OrganizationSwitcher } from "./OrganizationSwitcher";
import { useOrganization } from "@/hooks/useOrganization";
import { AddLeaveRequestDialog } from "./dialogs/AddLeaveRequestDialog";
import { PostUpdateDialog } from "./dialogs/PostUpdateDialog";
import { QRScannerDialog } from "./dialogs/QRScannerDialog";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { MobileBottomNav } from "./MobileBottomNav";
import { TopNav } from "./TopNav";
import { SubNav } from "./SubNav";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "./PullToRefreshIndicator";
import { GlobalAskAI } from "./GlobalAskAI";
import { MobileSearch } from "./MobileSearch";
import TrialBanner from "./TrialBanner";
import { SpotlightTour } from "./SpotlightTour";
import { WelcomeSurvey, OnboardingChecklist } from "./onboarding";
import { useUserRole } from "@/hooks/useUserRole";
import { InstallAppBanner } from "./InstallAppBanner";

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
  const location = useLocation();
  const { orgCode } = useParams<{ orgCode: string }>();
  
  // Detect full-height pages that need no padding
  const isFullHeightPage = location.pathname.includes('/wiki') || location.pathname.includes('/chat');
  const isHomePage = location.pathname === `/org/${orgCode}` || location.pathname === `/org/${orgCode}/`;
  const { navigateOrg } = useOrgNavigation();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentOrg } = useOrganization();
  const { role } = useUserRole();
  const { playNotificationSound } = useNotificationSound();
  const { preferences, shouldPlaySound } = useNotificationPreferences();
  const previousCountRef = useRef<number>(0);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("");
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showWelcomeSurvey, setShowWelcomeSurvey] = useState(false);

  // Check if user needs to see welcome survey (owners only)
  useEffect(() => {
    const checkSurveyStatus = async () => {
      if (!user?.id || !currentOrg?.id || role !== 'owner') {
        setShowWelcomeSurvey(false);
        return;
      }

      const { data } = await supabase
        .from('onboarding_progress')
        .select('survey_completed')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .maybeSingle();

      // Show survey only for owners who haven't completed it
      if (!data?.survey_completed) {
        // Small delay to let the page load first
        setTimeout(() => setShowWelcomeSurvey(true), 1000);
      }
    };

    checkSurveyStatus();
  }, [user?.id, currentOrg?.id, role]);

  // Track online presence
  useEffect(() => {
    if (!userProfile?.employeeId || !currentOrg?.id) return;

    const updatePresence = async (online: boolean) => {
      await supabase
        .from('chat_presence')
        .upsert({
          employee_id: userProfile.employeeId,
          organization_id: currentOrg.id,
          is_online: online,
          last_seen_at: new Date().toISOString()
        }, { onConflict: 'employee_id' });
    };

    // Set online when component mounts
    updatePresence(true);
    setIsOnline(true);

    // Update presence every 30 seconds
    const interval = setInterval(() => updatePresence(true), 30000);

    // Handle visibility change
    const handleVisibilityChange = () => {
      const online = document.visibilityState === 'visible';
      setIsOnline(online);
      updatePresence(online);
    };

    // Handle before unload
    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence(false);
    };
  }, [userProfile?.employeeId, currentOrg?.id]);
  
  // Pull to refresh for mobile
  const { pullDistance, isRefreshing, isPastThreshold } = usePullToRefresh();

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
    if (!user?.id) {
      previousCountRef.current = 0;
      setUnreadCount(0);
      return;
    }

    const userId = user.id;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

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
      .channel('layout-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
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
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
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
    
    // Get all today's sessions to count them
    const { data: todaySessions } = await supabase
      .from("attendance_records")
      .select("check_in_time, check_out_time")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .order("check_in_time", { ascending: true });

    const sessions = todaySessions || [];
    setSessionCount(sessions.length);

    // Find active session (checked in but not out)
    const activeSession = sessions.find(s => s.check_in_time && !s.check_out_time);

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
    navigate('/auth');
  };

  const handleViewProfile = () => {
    if (userProfile?.employeeId) {
      navigateOrg(`/team/${userProfile.employeeId}`);
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
      {/* Spotlight Tour for Onboarding - starts after WelcomeSurvey completes */}
      <SpotlightTour />
      
      {/* Pull to Refresh Indicator for Mobile */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        isPastThreshold={isPastThreshold}
      />
      
      {/* Trial Banner */}
      <TrialBanner />
      
      {/* Desktop Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 safe-area-top">
        <div className="container flex h-16 items-center px-4 md:px-8">
          <div className="mr-4 hidden md:flex items-center">
            <button 
              onClick={() => navigate("/landing")}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-dark hover:opacity-90 transition-opacity"
            >
              <Users className="h-5 w-5 text-primary-foreground" />
            </button>
          </div>

          {(userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'hr') && (
            <div className="hidden md:block mr-4">
              <OrganizationSwitcher />
            </div>
          )}
          
          <div className="hidden md:flex md:flex-1 md:items-center">
            <TopNav isAdmin={userProfile?.role === 'owner' || userProfile?.role === 'admin'} />
          </div>

          <div className="hidden md:flex md:items-center md:gap-2 tour-quick-actions">
            {elapsedTime && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
                <Clock className="h-4 w-4" />
                <span>{elapsedTime}</span>
              </div>
            )}
            <GlobalAskAI organizationId={currentOrg?.id} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 tour-check-in"
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
                  onClick={() => navigateOrg('/notifications')}
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
            {(userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'hr') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 tour-settings-menu"
                    onClick={() => navigateOrg('/settings')}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Organization Settings</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-10 w-10 relative tour-profile-avatar"
                  onClick={handleViewProfile}
                  disabled={!userProfile?.employeeId}
                >
                  <Avatar className="h-7 w-7 border-2 border-primary/10">
                    <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.fullName} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-dark text-primary-foreground font-semibold text-xs">
                      {userProfile?.fullName ? getInitials(userProfile.fullName) : user?.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isOnline && (
                    <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{userProfile?.fullName || "Profile"}</p>
              </TooltipContent>
            </Tooltip>
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

          {/* Mobile Header - Left Quick Actions + Right User Actions */}
          <div className="flex flex-1 items-center justify-between md:hidden">
            {/* Left Side - Quick Access Icons (no org logo) */}
            <div className="flex items-center gap-1.5">
              {/* Calendar */}
              <button
                onClick={() => navigateOrg("/calendar")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {/* Wiki */}
              <button
                onClick={() => navigateOrg("/wiki")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {/* KPI */}
              <button
                onClick={() => navigateOrg("/kpi-dashboard")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {/* Attendance */}
              <button
                onClick={() => navigateOrg("/attendance-history")}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Elapsed Time indicator */}
              {elapsedTime && (
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium ml-1">
                  <Clock className="h-3 w-3" />
                  <span>{elapsedTime}</span>
                </div>
              )}
            </div>

            {/* Right Side - Search, Notifications (no profile - moved to bottom nav) */}
            <div className="flex items-center gap-1.5">
              {/* Search */}
              <button
                onClick={() => setMobileSearchOpen(true)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </button>
              
              {/* Notifications */}
              <button 
                onClick={() => navigateOrg('/notifications')}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Navigation for Team section */}
      <SubNav />

      <main className={`container px-4 md:px-8 ${isFullHeightPage ? 'h-[calc(100vh-4rem)] overflow-hidden pt-0 pb-0' : 'pt-2 pb-24 md:pb-8 overflow-x-hidden'}`}>{children}</main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav userProfile={userProfile} isOnline={isOnline} />

      {/* Install App Banner for Mobile */}
      <InstallAppBanner />

      {/* Mobile Search */}
      <MobileSearch open={mobileSearchOpen} onOpenChange={setMobileSearchOpen} />

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
            canPostAnnouncement={userProfile?.role === 'owner' || userProfile?.role === 'admin' || userProfile?.role === 'hr'}
          />
        </>
      )}

      {/* Welcome Survey Modal */}
      <WelcomeSurvey 
        open={showWelcomeSurvey} 
        onComplete={() => setShowWelcomeSurvey(false)} 
      />

      {/* Onboarding Checklist - only show floating version on non-home pages */}
      {!isHomePage && <OnboardingChecklist userRole={role} />}
    </div>
  );
};
