import { useRef, useCallback, useEffect } from 'react';

// North American ringback: 440 Hz + 480 Hz, 2 sec on, 4 sec off
const RINGBACK_FREQ_1 = 440;
const RINGBACK_FREQ_2 = 480;
const TONE_DURATION = 2000;
const SILENCE_DURATION = 4000;

export const useRingbackTone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback(async () => {
    try {
      const ctx = getAudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const now = ctx.currentTime;
      const duration = TONE_DURATION / 1000;
      
      // Create oscillators for dual-tone
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.value = RINGBACK_FREQ_1;
      osc2.type = 'sine';
      osc2.frequency.value = RINGBACK_FREQ_2;
      
      // Lower volume for ringback (it's a waiting tone)
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gainNode.gain.setValueAtTime(0.15, now + duration - 0.02);
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch (e) {
      console.error('Error playing ringback tone:', e);
    }
  }, [getAudioContext]);

  const play = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    // Play immediately
    playTone();
    
    // Repeat with pattern: 2s tone, 4s silence
    intervalRef.current = setInterval(() => {
      if (isPlayingRef.current) {
        playTone();
      }
    }, TONE_DURATION + SILENCE_DURATION);
  }, [playTone]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Stop on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stop]);

  return { play, stop };
};
