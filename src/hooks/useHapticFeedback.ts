import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Web fallback patterns (vibration duration in ms)
const webPatterns = {
  incomingCall: [300, 100, 300, 100, 300, 200],
  outgoingPulse: [100, 200, 100],
  callConnected: [50, 100, 50],
  callEnded: [200],
  messageSent: [50],
  error: [100, 50, 100, 50, 100],
  success: [50, 50, 50],
  tap: [30],
} as const;

type HapticPattern = keyof typeof webPatterns;

// Impact style mapping
const impactStyleMap: Record<string, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

/**
 * Cross-platform haptic feedback hook
 * Uses native Capacitor Haptics on iOS/Android, falls back to Web Vibration API
 */
export const useHapticFeedback = () => {
  const isNative = Capacitor.isNativePlatform();
  const isWebSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const isSupported = isNative || isWebSupported;

  /**
   * Trigger impact haptic feedback
   */
  const impact = useCallback(
    async (style: 'light' | 'medium' | 'heavy' = 'medium') => {
      if (isNative) {
        try {
          await Haptics.impact({ style: impactStyleMap[style] || ImpactStyle.Medium });
        } catch (error) {
          console.warn('Native haptic impact failed:', error);
        }
      } else if (isWebSupported) {
        const duration = style === 'heavy' ? 50 : style === 'medium' ? 30 : 15;
        navigator.vibrate(duration);
      }
    },
    [isNative, isWebSupported]
  );

  /**
   * Trigger notification haptic feedback (native only, falls back to impact on web)
   */
  const notification = useCallback(
    async (type: 'success' | 'warning' | 'error' = 'success') => {
      if (isNative) {
        try {
          const notificationType: Record<string, NotificationType> = {
            success: NotificationType.Success,
            warning: NotificationType.Warning,
            error: NotificationType.Error,
          };
          await Haptics.notification({ type: notificationType[type] });
        } catch (error) {
          console.warn('Native haptic notification failed:', error);
        }
      } else if (isWebSupported) {
        // Fallback patterns for web
        const pattern = type === 'error' ? [100, 50, 100] : type === 'warning' ? [50, 100] : [50];
        navigator.vibrate(pattern);
      }
    },
    [isNative, isWebSupported]
  );

  /**
   * Trigger selection changed haptic (iOS-style tick)
   */
  const selectionChanged = useCallback(async () => {
    if (isNative) {
      try {
        await Haptics.selectionChanged();
      } catch (error) {
        console.warn('Native haptic selection failed:', error);
      }
    } else if (isWebSupported) {
      navigator.vibrate(10);
    }
  }, [isNative, isWebSupported]);

  /**
   * Legacy vibrate method for backward compatibility
   * Supports both named patterns and custom arrays
   */
  const vibrate = useCallback(
    (pattern: HapticPattern | number[]) => {
      if (isNative) {
        // Map legacy patterns to native haptics
        const heavyPatterns: HapticPattern[] = ['incomingCall', 'error'];
        const lightPatterns: HapticPattern[] = ['tap', 'messageSent'];

        if (typeof pattern === 'string') {
          if (heavyPatterns.includes(pattern)) {
            impact('heavy');
          } else if (lightPatterns.includes(pattern)) {
            impact('light');
          } else {
            impact('medium');
          }
        } else {
          // Custom pattern - use medium impact
          impact('medium');
        }
      } else if (isWebSupported) {
        const vibrationPattern = Array.isArray(pattern) ? pattern : webPatterns[pattern];
        navigator.vibrate(vibrationPattern);
      }
    },
    [isNative, isWebSupported, impact]
  );

  /**
   * Stop any ongoing vibration (web only)
   */
  const stop = useCallback(() => {
    if (!isNative && isWebSupported) {
      navigator.vibrate(0);
    }
  }, [isNative, isWebSupported]);

  /**
   * Create a looping vibration pattern (web only, uses impact on native)
   */
  const vibrateLoop = useCallback(
    (pattern: HapticPattern | number[], intervalMs: number = 2000) => {
      if (isNative) {
        // On native, just do a single heavy impact and return null
        impact('heavy');
        return null;
      }

      if (!isWebSupported) return null;

      const vibrationPattern = Array.isArray(pattern) ? pattern : webPatterns[pattern];
      navigator.vibrate(vibrationPattern);

      const interval = setInterval(() => {
        navigator.vibrate(vibrationPattern);
      }, intervalMs);

      return interval;
    },
    [isNative, isWebSupported, impact]
  );

  return {
    // New native-friendly methods
    impact,
    notification,
    selectionChanged,
    // Legacy methods for backward compatibility
    vibrate,
    stop,
    vibrateLoop,
    // Status
    isSupported,
    isNative,
  };
};

export default useHapticFeedback;
