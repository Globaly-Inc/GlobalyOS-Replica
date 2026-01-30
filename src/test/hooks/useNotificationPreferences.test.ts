import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useNotificationPreferences, 
  SOUND_OPTIONS, 
  type NotificationPreferences,
  type SoundType
} from '@/hooks/useNotificationPreferences';

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

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should return default preferences when localStorage is empty', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      expect(result.current.preferences.soundEnabled).toBe(true);
      expect(result.current.preferences.soundType).toBe('chime');
      expect(result.current.preferences.soundVolume).toBe(50);
      expect(result.current.preferences.notificationTypes.kudos).toBe(true);
      expect(result.current.preferences.notificationTypes.mentions).toBe(true);
      expect(result.current.preferences.notificationTypes.leave).toBe(true);
      expect(result.current.preferences.notificationTypes.general).toBe(true);
      expect(result.current.preferences.quietHours.enabled).toBe(false);
      expect(result.current.preferences.quietHours.startTime).toBe('22:00');
      expect(result.current.preferences.quietHours.endTime).toBe('08:00');
    });

    it('should load preferences from localStorage', () => {
      const storedPrefs: NotificationPreferences = {
        soundEnabled: false,
        soundType: 'bell',
        soundVolume: 75,
        notificationTypes: {
          kudos: false,
          mentions: true,
          leave: false,
          general: true,
        },
        quietHours: {
          enabled: true,
          startTime: '23:00',
          endTime: '07:00',
        },
      };
      
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(storedPrefs));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      expect(result.current.preferences.soundEnabled).toBe(false);
      expect(result.current.preferences.soundType).toBe('bell');
      expect(result.current.preferences.soundVolume).toBe(75);
      expect(result.current.preferences.notificationTypes.kudos).toBe(false);
      expect(result.current.preferences.quietHours.enabled).toBe(true);
      expect(result.current.preferences.quietHours.startTime).toBe('23:00');
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.getItem.mockReturnValueOnce('invalid json{');
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      // Should fall back to defaults
      expect(result.current.preferences.soundEnabled).toBe(true);
      expect(result.current.preferences.soundType).toBe('chime');
    });
  });

  describe('Update Preferences', () => {
    it('should update soundEnabled', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updatePreference('soundEnabled', false);
      });
      
      expect(result.current.preferences.soundEnabled).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should update soundType', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updatePreference('soundType', 'marimba');
      });
      
      expect(result.current.preferences.soundType).toBe('marimba');
    });

    it('should update soundVolume', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updatePreference('soundVolume', 80);
      });
      
      expect(result.current.preferences.soundVolume).toBe(80);
    });
  });

  describe('Update Notification Types', () => {
    it('should toggle individual notification types', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('kudos', false);
      });
      
      expect(result.current.preferences.notificationTypes.kudos).toBe(false);
      expect(result.current.preferences.notificationTypes.mentions).toBe(true);
    });

    it('should update leave notification type', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('leave', false);
      });
      
      expect(result.current.preferences.notificationTypes.leave).toBe(false);
    });
  });

  describe('Quiet Hours', () => {
    it('should update quiet hours settings', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateQuietHours({ enabled: true });
      });
      
      expect(result.current.preferences.quietHours.enabled).toBe(true);
    });

    it('should update quiet hours start time', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateQuietHours({ startTime: '21:00' });
      });
      
      expect(result.current.preferences.quietHours.startTime).toBe('21:00');
    });

    it('should detect quiet time during evening hours', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T23:30:00'));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateQuietHours({ enabled: true, startTime: '22:00', endTime: '08:00' });
      });
      
      expect(result.current.isQuietTime()).toBe(true);
    });

    it('should detect quiet time during morning hours (overnight)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T06:30:00'));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateQuietHours({ enabled: true, startTime: '22:00', endTime: '08:00' });
      });
      
      expect(result.current.isQuietTime()).toBe(true);
    });

    it('should not detect quiet time outside range', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T14:00:00'));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateQuietHours({ enabled: true, startTime: '22:00', endTime: '08:00' });
      });
      
      expect(result.current.isQuietTime()).toBe(false);
    });

    it('should not detect quiet time when disabled', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T23:30:00'));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      // Quiet hours disabled by default
      expect(result.current.isQuietTime()).toBe(false);
    });

    it('should handle same-day quiet hours', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T13:30:00'));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateQuietHours({ enabled: true, startTime: '12:00', endTime: '14:00' });
      });
      
      expect(result.current.isQuietTime()).toBe(true);
    });
  });

  describe('Notification Type Enabled Check', () => {
    it('should check kudos type', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      expect(result.current.isNotificationTypeEnabled('kudos')).toBe(true);
      
      act(() => {
        result.current.updateNotificationType('kudos', false);
      });
      
      expect(result.current.isNotificationTypeEnabled('kudos')).toBe(false);
    });

    it('should map leave_request to leave type', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      expect(result.current.isNotificationTypeEnabled('leave_request')).toBe(true);
      
      act(() => {
        result.current.updateNotificationType('leave', false);
      });
      
      expect(result.current.isNotificationTypeEnabled('leave_request')).toBe(false);
    });

    it('should map leave_decision to leave type', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('leave', false);
      });
      
      expect(result.current.isNotificationTypeEnabled('leave_decision')).toBe(false);
    });

    it('should map mention to mentions type', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      expect(result.current.isNotificationTypeEnabled('mention')).toBe(true);
    });

    it('should fall back to general for unknown types', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      expect(result.current.isNotificationTypeEnabled('unknown_type')).toBe(true);
      
      act(() => {
        result.current.updateNotificationType('general', false);
      });
      
      expect(result.current.isNotificationTypeEnabled('unknown_type')).toBe(false);
    });
  });

  describe('Should Play Sound', () => {
    it('should return false when sound is disabled', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updatePreference('soundEnabled', false);
      });
      
      expect(result.current.shouldPlaySound()).toBe(false);
    });

    it('should return false during quiet hours', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T23:30:00'));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateQuietHours({ enabled: true, startTime: '22:00', endTime: '08:00' });
      });
      
      expect(result.current.shouldPlaySound()).toBe(false);
    });

    it('should return false for disabled notification type', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      act(() => {
        result.current.updateNotificationType('kudos', false);
      });
      
      expect(result.current.shouldPlaySound('kudos')).toBe(false);
    });

    it('should return true when all conditions are met', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15T14:00:00'));
      
      const { result } = renderHook(() => useNotificationPreferences());
      
      expect(result.current.shouldPlaySound('kudos')).toBe(true);
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset all preferences to defaults', () => {
      const { result } = renderHook(() => useNotificationPreferences());
      
      // Change some preferences
      act(() => {
        result.current.updatePreference('soundEnabled', false);
        result.current.updatePreference('soundType', 'marimba');
        result.current.updatePreference('soundVolume', 25);
        result.current.updateQuietHours({ enabled: true });
      });
      
      // Reset
      act(() => {
        result.current.resetToDefaults();
      });
      
      expect(result.current.preferences.soundEnabled).toBe(true);
      expect(result.current.preferences.soundType).toBe('chime');
      expect(result.current.preferences.soundVolume).toBe(50);
      expect(result.current.preferences.quietHours.enabled).toBe(false);
    });
  });

  describe('SOUND_OPTIONS', () => {
    it('should have all expected sound types', () => {
      expect(SOUND_OPTIONS).toHaveLength(10);
      
      const soundTypes: SoundType[] = ['chime', 'bell', 'pop', 'ding', 'whoosh', 'bubble', 'marimba', 'ping', 'sparkle', 'soft'];
      
      soundTypes.forEach(type => {
        const option = SOUND_OPTIONS.find(o => o.value === type);
        expect(option).toBeDefined();
        expect(option?.label).toBeDefined();
        expect(option?.description).toBeDefined();
      });
    });
  });
});
