import { useCallback, useRef } from "react";

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const isInitializedRef = useRef(false);

  const playNotificationSound = useCallback(() => {
    try {
      // Create AudioContext on first user interaction
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        isInitializedRef.current = true;
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
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      
      // Play a pleasant ascending chime: C5 -> E5 -> G5
      playNote(523.25, now, 0.15);        // C5
      playNote(659.25, now + 0.1, 0.15);  // E5
      playNote(783.99, now + 0.2, 0.25);   // G5 (slightly longer)

      console.log('Notification sound played');
    } catch (e) {
      console.log('Error playing notification sound:', e);
    }
  }, []);

  return { playNotificationSound };
};