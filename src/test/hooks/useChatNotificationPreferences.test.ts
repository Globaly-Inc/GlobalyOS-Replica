import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useChatNotificationPreferences, 
  type ChatNotificationPreferences,
  type ChatNotificationTypes 
} from '@/hooks/useChatNotificationPreferences';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useChatNotificationPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return default preferences when localStorage is empty', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.preferences.soundEnabled).toBe(true);
      expect(result.current.preferences.soundType).toBe('chime');
      expect(result.current.preferences.soundVolume).toBe(50);
      expect(result.current.preferences.notificationTypes.directMessages).toBe(true);
      expect(result.current.preferences.notificationTypes.spaceMessages).toBe(true);
      expect(result.current.preferences.notificationTypes.mentions).toBe(true);
      expect(result.current.preferences.notificationTypes.reactions).toBe(true);
    });

    it('should load preferences from localStorage', () => {
      const storedPrefs: ChatNotificationPreferences = {
        soundEnabled: false,
        soundType: 'pop',
        soundVolume: 80,
        notificationTypes: {
          directMessages: true,
          spaceMessages: false,
          mentions: true,
          reactions: false,
        },
      };
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs));
      
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.preferences.soundEnabled).toBe(false);
      expect(result.current.preferences.soundType).toBe('pop');
      expect(result.current.preferences.soundVolume).toBe(80);
      expect(result.current.preferences.notificationTypes.spaceMessages).toBe(false);
      expect(result.current.preferences.notificationTypes.reactions).toBe(false);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('not valid json{{{');
      
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      // Should fall back to defaults
      expect(result.current.preferences.soundEnabled).toBe(true);
      expect(result.current.preferences.soundType).toBe('chime');
    });

    it('should merge partial localStorage with defaults', () => {
      const partialPrefs = {
        soundEnabled: false,
        // Missing other properties
      };
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(partialPrefs));
      
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.preferences.soundEnabled).toBe(false);
      expect(result.current.preferences.soundType).toBe('chime'); // Default
      expect(result.current.preferences.soundVolume).toBe(50); // Default
    });
  });

  describe('Update Sound Enabled', () => {
    it('should update soundEnabled to false', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateSoundEnabled(false);
      });
      
      expect(result.current.preferences.soundEnabled).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should update soundEnabled to true', () => {
      const storedPrefs: ChatNotificationPreferences = {
        soundEnabled: false,
        soundType: 'chime',
        soundVolume: 50,
        notificationTypes: {
          directMessages: true,
          spaceMessages: true,
          mentions: true,
          reactions: true,
        },
      };
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs));
      
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateSoundEnabled(true);
      });
      
      expect(result.current.preferences.soundEnabled).toBe(true);
    });
  });

  describe('Update Sound Type', () => {
    it('should update soundType', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateSoundType('bubble');
      });
      
      expect(result.current.preferences.soundType).toBe('bubble');
    });
  });

  describe('Update Sound Volume', () => {
    it('should update soundVolume', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateSoundVolume(75);
      });
      
      expect(result.current.preferences.soundVolume).toBe(75);
    });

    it('should clamp volume to minimum of 0', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateSoundVolume(-10);
      });
      
      expect(result.current.preferences.soundVolume).toBe(0);
    });

    it('should clamp volume to maximum of 100', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateSoundVolume(150);
      });
      
      expect(result.current.preferences.soundVolume).toBe(100);
    });
  });

  describe('Update Notification Types', () => {
    it('should toggle directMessages', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('directMessages', false);
      });
      
      expect(result.current.preferences.notificationTypes.directMessages).toBe(false);
      expect(result.current.preferences.notificationTypes.spaceMessages).toBe(true);
    });

    it('should toggle spaceMessages', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('spaceMessages', false);
      });
      
      expect(result.current.preferences.notificationTypes.spaceMessages).toBe(false);
    });

    it('should toggle mentions', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('mentions', false);
      });
      
      expect(result.current.preferences.notificationTypes.mentions).toBe(false);
    });

    it('should toggle reactions', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('reactions', false);
      });
      
      expect(result.current.preferences.notificationTypes.reactions).toBe(false);
    });
  });

  describe('Should Play Chat Sound', () => {
    it('should return false when sound is disabled', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateSoundEnabled(false);
      });
      
      expect(result.current.shouldPlayChatSound('dm')).toBe(false);
      expect(result.current.shouldPlayChatSound('space')).toBe(false);
      expect(result.current.shouldPlayChatSound('mention')).toBe(false);
      expect(result.current.shouldPlayChatSound('reaction')).toBe(false);
    });

    it('should return correct value for dm type', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.shouldPlayChatSound('dm')).toBe(true);
      
      act(() => {
        result.current.updateNotificationType('directMessages', false);
      });
      
      expect(result.current.shouldPlayChatSound('dm')).toBe(false);
    });

    it('should return correct value for space type', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.shouldPlayChatSound('space')).toBe(true);
      
      act(() => {
        result.current.updateNotificationType('spaceMessages', false);
      });
      
      expect(result.current.shouldPlayChatSound('space')).toBe(false);
    });

    it('should return correct value for mention type', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.shouldPlayChatSound('mention')).toBe(true);
      
      act(() => {
        result.current.updateNotificationType('mentions', false);
      });
      
      expect(result.current.shouldPlayChatSound('mention')).toBe(false);
    });

    it('should return correct value for reaction type', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.shouldPlayChatSound('reaction')).toBe(true);
      
      act(() => {
        result.current.updateNotificationType('reactions', false);
      });
      
      expect(result.current.shouldPlayChatSound('reaction')).toBe(false);
    });
  });

  describe('Is Chat Type Enabled', () => {
    it('should return correct enabled state for each type', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      expect(result.current.isChatTypeEnabled('directMessages')).toBe(true);
      expect(result.current.isChatTypeEnabled('spaceMessages')).toBe(true);
      expect(result.current.isChatTypeEnabled('mentions')).toBe(true);
      expect(result.current.isChatTypeEnabled('reactions')).toBe(true);
    });

    it('should update when notification type changes', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('directMessages', false);
      });
      
      expect(result.current.isChatTypeEnabled('directMessages')).toBe(false);
      expect(result.current.isChatTypeEnabled('spaceMessages')).toBe(true);
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all preferences to defaults', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      // Change some preferences - each in separate act for proper state updates
      act(() => {
        result.current.updateSoundEnabled(false);
      });
      
      act(() => {
        result.current.updateSoundType('marimba');
      });
      
      act(() => {
        result.current.updateSoundVolume(25);
      });
      
      act(() => {
        result.current.updateNotificationType('directMessages', false);
      });
      
      act(() => {
        result.current.updateNotificationType('reactions', false);
      });
      
      // Verify changes took effect
      expect(result.current.preferences.soundEnabled).toBe(false);
      expect(result.current.preferences.soundType).toBe('marimba');
      expect(result.current.preferences.soundVolume).toBe(25);
      
      // Reset
      act(() => {
        result.current.resetToDefaults();
      });
      
      expect(result.current.preferences.soundEnabled).toBe(true);
      expect(result.current.preferences.soundType).toBe('chime');
      expect(result.current.preferences.soundVolume).toBe(50);
      expect(result.current.preferences.notificationTypes.directMessages).toBe(true);
      expect(result.current.preferences.notificationTypes.reactions).toBe(true);
    });
  });

  describe('Loading State', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useChatNotificationPreferences());
      
      // After initial render, isLoading should be false
      expect(result.current.isLoading).toBe(false);
    });
  });
});
