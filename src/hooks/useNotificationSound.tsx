import { useCallback, useRef } from "react";

// Use a simple beep sound generated programmatically
const createNotificationSound = (): HTMLAudioElement | null => {
  try {
    // Create an AudioContext to generate a simple notification chime
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a simple chime using Web Audio API
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1); // C#6
    oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2); // E6
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
    
    return null; // We don't need to return anything, sound is played directly
  } catch (e) {
    console.log('Audio not supported:', e);
    return null;
  }
};

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create or resume AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Resume if suspended (required for autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Create a pleasant notification chime (three ascending notes)
      const playNote = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      
      // Play a pleasant ascending chime: C5 -> E5 -> G5
      playNote(523.25, now, 0.15);        // C5
      playNote(659.25, now + 0.1, 0.15);  // E5
      playNote(783.99, now + 0.2, 0.2);   // G5

    } catch (e) {
      console.log('Error playing notification sound:', e);
    }
  }, []);

  return { playNotificationSound };
};