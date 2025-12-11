import { useCallback, useRef } from "react";
import { SoundType } from "./useNotificationPreferences";

type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

interface NoteConfig {
  frequency: number;
  startOffset: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
}

const SOUND_CONFIGS: Record<SoundType, NoteConfig[]> = {
  chime: [
    { frequency: 392, startOffset: 0, duration: 0.2, volume: 0.12 },      // G4
    { frequency: 440, startOffset: 0.12, duration: 0.2, volume: 0.1 },    // A4
    { frequency: 523.25, startOffset: 0.24, duration: 0.3, volume: 0.08 }, // C5
  ],
  bell: [
    { frequency: 440, startOffset: 0, duration: 0.5, volume: 0.1 },
    { frequency: 880, startOffset: 0, duration: 0.4, volume: 0.05 },
  ],
  pop: [
    { frequency: 280, startOffset: 0, duration: 0.08, volume: 0.1 },
    { frequency: 350, startOffset: 0.04, duration: 0.1, volume: 0.08 },
  ],
  ding: [
    { frequency: 523.25, startOffset: 0, duration: 0.4, volume: 0.1 },
  ],
  whoosh: [
    { frequency: 150, startOffset: 0, duration: 0.2, type: "sine", volume: 0.06 },
    { frequency: 300, startOffset: 0.08, duration: 0.25, type: "sine", volume: 0.04 },
  ],
  bubble: [
    { frequency: 260, startOffset: 0, duration: 0.12, volume: 0.1 },
    { frequency: 330, startOffset: 0.1, duration: 0.15, volume: 0.08 },
  ],
  marimba: [
    { frequency: 349.23, startOffset: 0, duration: 0.25, type: "triangle", volume: 0.12 },
    { frequency: 698.46, startOffset: 0, duration: 0.2, type: "triangle", volume: 0.06 },
  ],
  ping: [
    { frequency: 800, startOffset: 0, duration: 0.15, type: "sine", volume: 0.06 },
  ],
  sparkle: [
    { frequency: 800, startOffset: 0, duration: 0.1, volume: 0.06 },
    { frequency: 1000, startOffset: 0.08, duration: 0.1, volume: 0.05 },
    { frequency: 1200, startOffset: 0.16, duration: 0.12, volume: 0.04 },
  ],
  soft: [
    { frequency: 262, startOffset: 0, duration: 0.4, volume: 0.08 },
    { frequency: 330, startOffset: 0.15, duration: 0.35, volume: 0.06 },
    { frequency: 392, startOffset: 0.3, duration: 0.4, volume: 0.05 },
  ],
};

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback((soundType: SoundType = "chime") => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const playNote = (config: NoteConfig) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = config.type || 'sine';
        const startTime = audioContext.currentTime + config.startOffset;
        oscillator.frequency.setValueAtTime(config.frequency, startTime);
        
        const volume = config.volume ?? 0.3;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + config.duration);
      };

      const notes = SOUND_CONFIGS[soundType] || SOUND_CONFIGS.chime;
      notes.forEach(playNote);

      console.log(`Notification sound played: ${soundType}`);
    } catch (e) {
      console.log('Error playing notification sound:', e);
    }
  }, []);

  return { playNotificationSound };
};