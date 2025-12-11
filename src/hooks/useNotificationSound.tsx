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
    { frequency: 523.25, startOffset: 0, duration: 0.15 },      // C5
    { frequency: 659.25, startOffset: 0.1, duration: 0.15 },    // E5
    { frequency: 783.99, startOffset: 0.2, duration: 0.25 },    // G5
  ],
  bell: [
    { frequency: 880, startOffset: 0, duration: 0.4, volume: 0.25 },
    { frequency: 1760, startOffset: 0, duration: 0.3, volume: 0.15 },
  ],
  pop: [
    { frequency: 400, startOffset: 0, duration: 0.05 },
    { frequency: 600, startOffset: 0.03, duration: 0.08 },
  ],
  ding: [
    { frequency: 1000, startOffset: 0, duration: 0.3 },
  ],
  whoosh: [
    { frequency: 200, startOffset: 0, duration: 0.15, type: "sawtooth", volume: 0.1 },
    { frequency: 800, startOffset: 0.05, duration: 0.2, type: "sawtooth", volume: 0.08 },
  ],
  bubble: [
    { frequency: 300, startOffset: 0, duration: 0.1 },
    { frequency: 500, startOffset: 0.08, duration: 0.12 },
    { frequency: 400, startOffset: 0.15, duration: 0.15 },
  ],
  marimba: [
    { frequency: 440, startOffset: 0, duration: 0.2, type: "triangle" },
    { frequency: 880, startOffset: 0, duration: 0.15, type: "triangle", volume: 0.2 },
  ],
  ping: [
    { frequency: 1500, startOffset: 0, duration: 0.1, type: "square", volume: 0.15 },
  ],
  sparkle: [
    { frequency: 1200, startOffset: 0, duration: 0.08 },
    { frequency: 1600, startOffset: 0.06, duration: 0.08 },
    { frequency: 2000, startOffset: 0.12, duration: 0.1 },
    { frequency: 2400, startOffset: 0.18, duration: 0.15 },
  ],
  soft: [
    { frequency: 350, startOffset: 0, duration: 0.25, volume: 0.15 },
    { frequency: 440, startOffset: 0.1, duration: 0.2, volume: 0.12 },
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