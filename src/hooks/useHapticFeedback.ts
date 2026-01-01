import { useCallback } from 'react';

const hapticPatterns = {
  incomingCall: [300, 100, 300, 100, 300, 200],
  outgoingPulse: [100, 200, 100],
  callConnected: [50, 100, 50],
  callEnded: [200],
  messageSent: [50],
  error: [100, 50, 100, 50, 100],
  success: [50, 50, 50],
  tap: [30],
} as const;

type HapticPattern = keyof typeof hapticPatterns;

export const useHapticFeedback = () => {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: HapticPattern | number[]) => {
    if (!isSupported) return;
    
    const vibrationPattern = Array.isArray(pattern) ? pattern : hapticPatterns[pattern];
    navigator.vibrate(vibrationPattern);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    navigator.vibrate(0);
  }, [isSupported]);

  const vibrateLoop = useCallback((pattern: HapticPattern | number[], intervalMs: number = 2000) => {
    if (!isSupported) return null;
    
    const vibrationPattern = Array.isArray(pattern) ? pattern : hapticPatterns[pattern];
    navigator.vibrate(vibrationPattern);
    
    const interval = setInterval(() => {
      navigator.vibrate(vibrationPattern);
    }, intervalMs);
    
    return interval;
  }, [isSupported]);

  return { vibrate, stop, vibrateLoop, isSupported };
};
