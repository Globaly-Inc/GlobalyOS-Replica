import { useState, useEffect, useCallback } from "react";

export type SoundType = 
  | "chime"
  | "bell"
  | "pop"
  | "ding"
  | "whoosh"
  | "bubble"
  | "marimba"
  | "ping"
  | "sparkle"
  | "soft";

export const SOUND_OPTIONS: { value: SoundType; label: string; description: string }[] = [
  { value: "chime", label: "Gentle Chime", description: "Soft ascending tones" },
  { value: "bell", label: "Soft Bell", description: "Muted bell tone" },
  { value: "pop", label: "Subtle Pop", description: "Quiet little pop" },
  { value: "ding", label: "Mellow Ding", description: "Warm single note" },
  { value: "whoosh", label: "Whisper", description: "Airy soft breath" },
  { value: "bubble", label: "Droplet", description: "Gentle water drop" },
  { value: "marimba", label: "Wooden", description: "Soft wooden tap" },
  { value: "ping", label: "Hush", description: "Barely-there ping" },
  { value: "sparkle", label: "Twinkle", description: "Delicate shimmer" },
  { value: "soft", label: "Zen", description: "Calming meditation tone" },
];

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export interface NotificationPreferences {
  soundEnabled: boolean;
  soundType: SoundType;
  soundVolume: number; // 0-100
  notificationTypes: {
    kudos: boolean;
    mentions: boolean;
    leave: boolean;
    general: boolean;
  };
  quietHours: QuietHours;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  soundType: "chime",
  soundVolume: 50,
  notificationTypes: {
    kudos: true,
    mentions: true,
    leave: true,
    general: true,
  },
  quietHours: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00",
  },
};

const STORAGE_KEY = "notification_preferences";

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: NotificationPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
    }
  }, []);

  const updatePreference = useCallback(<K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  const updateNotificationType = useCallback((type: keyof NotificationPreferences["notificationTypes"], value: boolean) => {
    const newPreferences = {
      ...preferences,
      notificationTypes: {
        ...preferences.notificationTypes,
        [type]: value,
      },
    };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  const updateQuietHours = useCallback((updates: Partial<QuietHours>) => {
    const newPreferences = {
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        ...updates,
      },
    };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  // Check if current time is within quiet hours
  const isQuietTime = useCallback(() => {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quietHours.startTime.split(":").map(Number);
    const [endHour, endMin] = preferences.quietHours.endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }, [preferences.quietHours]);

  // Check if a notification type is enabled
  const isNotificationTypeEnabled = useCallback((type: string) => {
    const typeMap: Record<string, keyof NotificationPreferences["notificationTypes"]> = {
      kudos: "kudos",
      mention: "mentions",
      leave_request: "leave",
      leave_decision: "leave",
    };
    
    const preferenceKey = typeMap[type] || "general";
    return preferences.notificationTypes[preferenceKey];
  }, [preferences.notificationTypes]);

  // Should play sound for a notification
  const shouldPlaySound = useCallback((notificationType?: string) => {
    if (!preferences.soundEnabled) return false;
    if (isQuietTime()) return false;
    if (notificationType && !isNotificationTypeEnabled(notificationType)) return false;
    return true;
  }, [preferences.soundEnabled, isQuietTime, isNotificationTypeEnabled]);

  return {
    preferences,
    isLoading,
    updatePreference,
    updateNotificationType,
    updateQuietHours,
    isQuietTime,
    isNotificationTypeEnabled,
    shouldPlaySound,
    resetToDefaults: () => savePreferences(DEFAULT_PREFERENCES),
  };
};
