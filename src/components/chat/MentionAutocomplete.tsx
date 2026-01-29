import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Users, Search } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  avatar_url: string | null;
  isAllMention?: boolean;
}

interface MentionAutocompleteProps {
  isOpen: boolean;
  searchText: string;
  onSelect: (member: TeamMember) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement>;
  /** Pre-filtered member list to show (from space/group members) */
  members?: TeamMember[];
  /** All member IDs for @all mention - if provided, shows @everyone option */
  allMemberIds?: string[];
  /** Total member count for display */
  memberCount?: number;
  /** Hide @all option (e.g., for DMs) */
  hideAllOption?: boolean;
}

const MentionAutocomplete = ({
  isOpen,
  searchText,
  onSelect,
  onClose,
  anchorRef,
  members: providedMembers = [],
  allMemberIds,
  memberCount = 0,
  hideAllOption = false,
}: MentionAutocompleteProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 280 });
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Check if search matches "all" or "everyone"
  const showAllOption = useMemo(() => {
    if (hideAllOption || !allMemberIds || allMemberIds.length === 0) return false;
    const search = searchText.toLowerCase();
    return search === '' || 'all'.startsWith(search) || 'everyone'.startsWith(search);
  }, [searchText, allMemberIds, hideAllOption]);

  // Create the @all option
  const allMembersOption: TeamMember = useMemo(() => ({
    id: 'all',
    name: 'everyone',
    position: `Notify all ${memberCount} member${memberCount !== 1 ? 's' : ''}`,
    avatar_url: null,
    isAllMention: true,
  }), [memberCount]);

  // Filter members by search text
  const filteredMembers = useMemo(() => {
    if (!searchText) return providedMembers;
    const search = searchText.toLowerCase();
    return providedMembers.filter(member => 
      member.name.toLowerCase().includes(search) ||
      (member.position && member.position.toLowerCase().includes(search))
    );
  }, [providedMembers, searchText]);

  // Combine @all with filtered members
  const displayMembers = useMemo(() => {
    if (showAllOption) {
      return [allMembersOption, ...filteredMembers];
    }
    return filteredMembers;
  }, [showAllOption, allMembersOption, filteredMembers]);

  // Reset selected index when members change
  useEffect(() => {
    setSelectedIndex(0);
  }, [displayMembers.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && displayMembers.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, displayMembers.length]);

  // Calculate position based on anchor element
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Position above the input with some padding
      const top = rect.top - 8;
      const left = rect.left;
      const width = Math.min(rect.width, 320);

      setPosition({ top, left, width });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || displayMembers.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % displayMembers.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + displayMembers.length) % displayMembers.length);
      } else if ((e.key === 'Enter' || e.key === 'Tab') && displayMembers[selectedIndex]) {
        e.preventDefault();
        onSelect(displayMembers[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, displayMembers, selectedIndex, onSelect, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  if (!isOpen) return null;

  const content = (
    <div
      ref={containerRef}
      className="fixed z-[100] bg-popover border border-border rounded-xl shadow-lg overflow-hidden"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: '300px',
        transform: 'translateY(-100%)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="h-3 w-3" />
          <span>
            {searchText ? `Searching "${searchText}"` : 'Mention someone'}
          </span>
        </div>
      </div>

      {/* Members list */}
      <div className="overflow-y-auto max-h-[240px]">
        {displayMembers.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            {searchText ? (
              <span>No members found for "<strong>{searchText}</strong>"</span>
            ) : (
              <span>No members available</span>
            )}
          </div>
        ) : (
          <ul ref={listRef} className="py-1">
            {displayMembers.map((member, index) => (
              <li
                key={member.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                  index === selectedIndex
                    ? "bg-accent"
                    : "hover:bg-muted/50"
                )}
                onClick={() => onSelect(member)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {member.isAllMention ? (
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                    index === selectedIndex ? "bg-accent-foreground/20" : "bg-primary/10"
                  )}>
                    <Users className={cn(
                      "h-4 w-4",
                      index === selectedIndex ? "text-accent-foreground" : "text-primary"
                    )} />
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-muted">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    member.isAllMention && index !== selectedIndex && "text-primary"
                  )}>
                    @{member.name}
                  </p>
                  {member.position && (
                    <p className={cn(
                      "text-xs truncate",
                      index === selectedIndex ? "text-accent-foreground/70" : "text-muted-foreground"
                    )}>
                      {member.position}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer hint */}
      {displayMembers.length > 0 && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground flex items-center gap-2">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">↑↓</kbd>
          <span>navigate</span>
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] ml-1">↵</kbd>
          <span>select</span>
          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] ml-1">esc</kbd>
          <span>close</span>
        </div>
      )}
    </div>
  );

  // Use portal to render at document body level
  return createPortal(content, document.body);
};

export default MentionAutocomplete;
