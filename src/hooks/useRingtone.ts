import { useRef, useCallback, useEffect } from 'react';

// Generate a pleasant ringtone using Web Audio API
const createRingtone = (audioContext: AudioContext): { oscillators: OscillatorNode[], gainNode: GainNode } => {
  const oscillators: OscillatorNode[] = [];
  const gainNode = audioContext.createGain();
  
  // Create two oscillators for a pleasant ring (major third interval)
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
  
  // Create a smooth envelope
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + 0.05);
  gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.4);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8);
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillators.push(osc1, osc2);
  return { oscillators, gainNode };
};

export const useRingtone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const play = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    const playTone = () => {
      if (!isPlayingRef.current || !isMountedRef.current) return;
      
      try {
        // Create a new audio context for each tone
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const { oscillators, gainNode } = createRingtone(audioContext);
        oscillatorsRef.current = oscillators;
        gainNodeRef.current = gainNode;
        
        oscillators.forEach(osc => osc.start());
        
        // Stop after 800ms
        setTimeout(() => {
          oscillators.forEach(osc => {
            try {
              osc.stop();
              osc.disconnect();
            } catch (e) {
              // Ignore if already stopped
            }
          });
          gainNode.disconnect();
          audioContext.close().catch(() => {});
        }, 800);
      } catch (error) {
        console.error('Error playing ringtone:', error);
      }
    };
    
    // Play immediately then repeat with a pattern (ring-ring ... ring-ring)
    playTone();
    
    let ringCount = 0;
    intervalRef.current = setInterval(() => {
      if (!isPlayingRef.current || !isMountedRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      
      ringCount++;
      // Create a ring-ring pattern with pause
      if (ringCount % 3 !== 0) {
        playTone();
      }
    }, 600);
  }, []);
  
  const stop = useCallback(() => {
    isPlayingRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    oscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    oscillatorsRef.current = [];
    
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      gainNodeRef.current = null;
    }
    
    if (audioContextRef.current) {
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
  
  return { play, stop };
};
