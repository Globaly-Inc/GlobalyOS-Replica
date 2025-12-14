import { useState, useEffect, useCallback } from 'react';

interface UseTypewriterOptions {
  words: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  startDelay?: number;
}

export function useTypewriter({
  words,
  typingSpeed = 100,
  deletingSpeed = 60,
  pauseDuration = 2000,
  startDelay = 0,
}: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStarted, setIsStarted] = useState(startDelay === 0);

  const currentWord = words[wordIndex];

  // Handle start delay
  useEffect(() => {
    if (startDelay > 0) {
      const timer = setTimeout(() => setIsStarted(true), startDelay);
      return () => clearTimeout(timer);
    }
  }, [startDelay]);

  const tick = useCallback(() => {
    if (!isStarted) return;

    if (isDeleting) {
      // Deleting characters
      setDisplayText(prev => prev.slice(0, -1));
      
      if (displayText.length === 1) {
        setIsDeleting(false);
        setWordIndex(prev => (prev + 1) % words.length);
      }
    } else {
      // Typing characters
      const targetText = currentWord;
      if (displayText.length < targetText.length) {
        setDisplayText(targetText.slice(0, displayText.length + 1));
      }
    }
  }, [isStarted, isDeleting, displayText, currentWord, words.length]);

  useEffect(() => {
    if (!isStarted) return;

    // Check if word is complete
    if (!isDeleting && displayText === currentWord) {
      // Pause before deleting
      const pauseTimer = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(pauseTimer);
    }

    // Set typing/deleting speed
    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timer = setTimeout(tick, speed);
    
    return () => clearTimeout(timer);
  }, [tick, isStarted, isDeleting, displayText, currentWord, typingSpeed, deletingSpeed, pauseDuration]);

  return { displayText, isDeleting };
}
