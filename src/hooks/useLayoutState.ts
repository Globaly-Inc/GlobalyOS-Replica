import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from "@/hooks/useOrganization";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useEmployeeWorkLocation, useHasApprovedWfhToday } from "@/services/useWfh";

export interface UserProfile {
  fullName: string;
  position: string;
  avatarUrl: string | null;
  employeeId: string | null;
  role: string | null;
}

export const useLayoutState = () => {
  const { user, signOut } = useAuth();
  const { currentOrg } = useOrganization();
  const { playNotificationSound } = useNotificationSound();
  const { preferences, shouldPlaySound } = useNotificationPreferences();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("");
  const [sessionCount, setSessionCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const previousCountRef = useRef<number>(0);

  // Work location and WFH hooks for smart check-in
  const { data: workLocation } = useEmployeeWorkLocation(userProfile?.employeeId || undefined);
  const { data: hasApprovedWfhToday } = useHasApprovedWfhToday(userProfile?.employeeId || undefined);

  // Determine if user should use remote check-in (no QR scan)
  const shouldUseRemoteCheckIn = workLocation === 'hybrid' || workLocation === 'remote' || 
    (workLocation === 'office' && hasApprovedWfhToday);

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

    updatePresence(true);
    setIsOnline(true);

    const interval = setInterval(() => updatePresence(true), 30000);

    const handleVisibilityChange = () => {
      const online = document.visibilityState === 'visible';
      setIsOnline(online);
      updatePresence(online);
    };

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

      if (newCount > previousCountRef.current && previousCountRef.current !== 0) {
        if (shouldPlaySound()) {
          playNotificationSound(preferences.soundType);
        }
      }

      previousCountRef.current = newCount;
      setUnreadCount(newCount);
    };

    fetchUnreadCount();

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
          const notificationType = (payload.new as { type?: string })?.type;
          if (shouldPlaySound(notificationType)) {
            playNotificationSound(preferences.soundType);
          }
          sendPushNotification(payload.new);
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

  // Fetch today's attendance record
  const fetchTodayAttendance = useCallback(async () => {
    if (!user?.id) return;

    const { data: employee } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!employee) return;

    const today = new Date().toISOString().split('T')[0];
    
    const { data: todaySessions } = await supabase
      .from("attendance_records")
      .select("check_in_time, check_out_time")
      .eq("employee_id", employee.id)
      .eq("date", today)
      .order("check_in_time", { ascending: true });

    const sessions = todaySessions || [];
    setSessionCount(sessions.length);

    const activeSession = sessions.find(s => s.check_in_time && !s.check_out_time);

    if (activeSession?.check_in_time) {
      setCheckInTime(new Date(activeSession.check_in_time));
    } else {
      setCheckInTime(null);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTodayAttendance();

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

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id || !currentOrg) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const { data: employee } = await supabase
        .from("employees")
        .select("id, position")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

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

  return {
    user,
    signOut,
    currentOrg,
    userProfile,
    unreadCount,
    checkInTime,
    elapsedTime,
    sessionCount,
    isOnline,
    shouldUseRemoteCheckIn,
    fetchTodayAttendance,
  };
};
