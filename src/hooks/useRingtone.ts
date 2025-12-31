import { useRef, useCallback } from 'react';

// Generate a simple ringtone using Web Audio API
const createRingtone = (audioContext: AudioContext): OscillatorNode[] => {
  const oscillators: OscillatorNode[] = [];
  
  // Create two oscillators for a pleasant ring
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(440, audioContext.currentTime); // A4
  
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  
  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillators.push(osc1, osc2);
  return oscillators;
};

export const useRingtone = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  
  const play = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    
    const playTone = () => {
      if (!isPlayingRef.current) return;
      
      try {
        audioContextRef.current = new AudioContext();
        oscillatorsRef.current = createRingtone(audioContextRef.current);
        
        oscillatorsRef.current.forEach(osc => osc.start());
        
        // Stop after 1 second
        setTimeout(() => {
          oscillatorsRef.current.forEach(osc => {
            try {
              osc.stop();
            } catch (e) {
              // Ignore if already stopped
            }
          });
          audioContextRef.current?.close();
        }, 1000);
      } catch (error) {
        console.error('Error playing ringtone:', error);
      }
    };
    
    // Play immediately then repeat
    playTone();
    intervalRef.current = setInterval(playTone, 2000);
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
      } catch (e) {
        // Ignore if already stopped
      }
    });
    oscillatorsRef.current = [];
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);
  
  return { play, stop };
};
