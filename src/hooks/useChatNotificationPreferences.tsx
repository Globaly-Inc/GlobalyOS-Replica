import { useState, useEffect, useCallback } from "react";
import { SoundType } from "./useNotificationPreferences";

export interface ChatNotificationTypes {
  directMessages: boolean;
  spaceMessages: boolean;
  mentions: boolean;
  reactions: boolean;
}

export interface ChatNotificationPreferences {
  soundEnabled: boolean;
  soundType: SoundType;
  soundVolume: number; // 0-100
  notificationTypes: ChatNotificationTypes;
}

const STORAGE_KEY = "chat_notification_preferences";

const DEFAULT_PREFERENCES: ChatNotificationPreferences = {
  soundEnabled: true,
  soundType: "chime",
  soundVolume: 50,
  notificationTypes: {
    directMessages: true,
    spaceMessages: true,
    mentions: true,
    reactions: true,
  },
};

export const useChatNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<ChatNotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (e) {
        console.error("Failed to parse chat notification preferences:", e);
      }
    }
    setIsLoading(false);
  }, []);

  const savePreferences = useCallback((newPrefs: ChatNotificationPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
  }, []);

  const updateSoundEnabled = useCallback((enabled: boolean) => {
    const newPrefs = { ...preferences, soundEnabled: enabled };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const updateSoundType = useCallback((soundType: SoundType) => {
    const newPrefs = { ...preferences, soundType };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const updateSoundVolume = useCallback((volume: number) => {
    const newPrefs = { ...preferences, soundVolume: Math.max(0, Math.min(100, volume)) };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const updateNotificationType = useCallback((
    type: keyof ChatNotificationTypes,
    enabled: boolean
  ) => {
    const newPrefs = {
      ...preferences,
      notificationTypes: {
        ...preferences.notificationTypes,
        [type]: enabled,
      },
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const resetToDefaults = useCallback(() => {
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  const shouldPlayChatSound = useCallback((
    messageType: "dm" | "space" | "mention" | "reaction"
  ): boolean => {
    if (!preferences.soundEnabled) return false;
    
    switch (messageType) {
      case "dm":
        return preferences.notificationTypes.directMessages;
      case "space":
        return preferences.notificationTypes.spaceMessages;
      case "mention":
        return preferences.notificationTypes.mentions;
      case "reaction":
        return preferences.notificationTypes.reactions;
      default:
        return false;
    }
  }, [preferences]);

  const isChatTypeEnabled = useCallback((type: keyof ChatNotificationTypes): boolean => {
    return preferences.notificationTypes[type];
  }, [preferences.notificationTypes]);

  return {
    preferences,
    isLoading,
    updateSoundEnabled,
    updateSoundType,
    updateSoundVolume,
    updateNotificationType,
    resetToDefaults,
    shouldPlayChatSound,
    isChatTypeEnabled,
  };
};
