import { useEffect, useCallback } from "react";

interface UseWikiKeyboardShortcutsProps {
  onSave?: () => void;
  onNewPage?: () => void;
  onEscape?: () => void;
  isEditing?: boolean;
  enabled?: boolean;
}

export const useWikiKeyboardShortcuts = ({
  onSave,
  onNewPage,
  onEscape,
  isEditing = false,
  enabled = true,
}: UseWikiKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? e.metaKey : e.ctrlKey;

    // Cmd/Ctrl + S - Save
    if (modKey && e.key === 's') {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Cmd/Ctrl + N - New page (only when not editing to avoid browser conflicts)
    if (modKey && e.key === 'n' && !isEditing) {
      e.preventDefault();
      onNewPage?.();
      return;
    }

    // Escape - Close/cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onEscape?.();
      return;
    }
  }, [enabled, isEditing, onSave, onNewPage, onEscape]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
};
