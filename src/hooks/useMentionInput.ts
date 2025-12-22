/**
 * Hook for handling @ mention detection in input fields
 */

import { useState, useCallback, useRef } from 'react';

interface MentionState {
  isOpen: boolean;
  searchText: string;
  triggerIndex: number;
}

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  avatar_url: string | null;
}

export const useMentionInput = (
  value: string,
  onChange: (value: string) => void,
  onMentionAdd: (memberId: string) => void
) => {
  const [mentionState, setMentionState] = useState<MentionState>({
    isOpen: false,
    searchText: '',
    triggerIndex: -1,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    onChange(newValue);

    // Find the last @ before cursor
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by whitespace
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        // Check if there's text after @ (search text) with no spaces
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        if (!textAfterAt.includes(' ')) {
          setMentionState({
            isOpen: true,
            searchText: textAfterAt,
            triggerIndex: lastAtIndex,
          });
          return;
        }
      }
    }

    // Close mention popup if no valid @ trigger
    if (mentionState.isOpen) {
      setMentionState({ isOpen: false, searchText: '', triggerIndex: -1 });
    }
  }, [onChange, mentionState.isOpen]);

  const handleMentionSelect = useCallback((member: TeamMember) => {
    const { triggerIndex } = mentionState;
    
    // Replace @searchText with @MemberName
    const beforeAt = value.slice(0, triggerIndex);
    const cursorPos = inputRef.current?.selectionStart || value.length;
    const afterSearch = value.slice(cursorPos);
    
    const newValue = `${beforeAt}@${member.name} ${afterSearch}`;
    onChange(newValue);
    onMentionAdd(member.id);
    
    setMentionState({ isOpen: false, searchText: '', triggerIndex: -1 });

    // Focus input after selection
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeAt.length + member.name.length + 2; // +2 for @ and space
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, onChange, onMentionAdd, mentionState]);

  const closeMention = useCallback(() => {
    setMentionState({ isOpen: false, searchText: '', triggerIndex: -1 });
  }, []);

  return {
    mentionState,
    handleInputChange,
    handleMentionSelect,
    closeMention,
    inputRef,
  };
};
