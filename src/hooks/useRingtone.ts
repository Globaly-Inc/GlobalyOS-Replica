import { useRef, useCallback, useEffect } from 'react';

export const useRingtone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  
  // Create a single reusable audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);
  
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Close the audio context to release all resources
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);
  
  const playTone = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    try {
      const audioContext = getAudioContext();
      
      // Resume if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Pleasant two-tone ring (major third interval)
      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
      
      // Smooth envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.4);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const now = audioContext.currentTime;
      oscillator1.start(now);
      oscillator2.start(now);
      // Schedule stop - oscillators clean themselves up
      oscillator1.stop(now + 0.8);
      oscillator2.stop(now + 0.8);
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  }, [getAudioContext]);
  
  const play = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    // Play immediately
    playTone();
    
    // Then repeat in ring-ring pattern with pause
    let count = 0;
    intervalRef.current = setInterval(() => {
      if (!isPlayingRef.current) {
        stop();
        return;
      }
      count++;
      // Ring-ring pattern: play twice, pause once
      if (count % 3 !== 0) {
        playTone();
      }
    }, 600);
  }, [playTone, stop]);
  
  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);
  
  // CRITICAL: Cleanup on page visibility change and before unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlayingRef.current) {
        // Suspend context to save resources when hidden
        audioContextRef.current?.suspend();
      } else if (document.visibilityState === 'visible' && isPlayingRef.current) {
        audioContextRef.current?.resume();
      }
    };
    
    const handleBeforeUnload = () => {
      stop();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [stop]);
  
  return { play, stop };
};
