import { useEffect, useCallback } from 'react';

interface ChatKeyboardShortcutsOptions {
  onQuickSwitcher?: () => void;
  onSearch?: () => void;
  onNewMessage?: () => void;
  onMentions?: () => void;
  enabled?: boolean;
}

export const useChatKeyboardShortcuts = ({
  onQuickSwitcher,
  onSearch,
  onNewMessage,
  onMentions,
  enabled = true,
}: ChatKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't trigger shortcuts when typing in input/textarea
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;

    // Cmd/Ctrl + K - Quick Switcher (always works)
    if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
      e.preventDefault();
      onQuickSwitcher?.();
      return;
    }

    // Cmd/Ctrl + Shift + K - Search
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      onSearch?.();
      return;
    }

    // Don't process other shortcuts if typing
    if (isTyping) return;

    // Cmd/Ctrl + N - New Message
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      onNewMessage?.();
      return;
    }

    // Cmd/Ctrl + Shift + M - Mentions
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      onMentions?.();
      return;
    }
  }, [enabled, onQuickSwitcher, onSearch, onNewMessage, onMentions]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
};

export default useChatKeyboardShortcuts;
