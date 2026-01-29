import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { Users } from "lucide-react";

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
  allMemberIds,
  memberCount = 0,
  hideAllOption = false,
}: MentionAutocompleteProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Combine @all with regular members
  const displayMembers = useMemo(() => {
    if (showAllOption) {
      return [allMembersOption, ...members];
    }
    return members;
  }, [showAllOption, allMembersOption, members]);

  // Calculate position based on anchor element
  useEffect(() => {
    if (!isOpen || !anchorRef?.current) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Position above the input with some padding
      const top = rect.top - 8;
      const left = rect.left;

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  // Fetch team members when search text changes
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentOrg?.id || !isOpen) return;

      setIsLoading(true);
      try {
        let query = supabase
          .from('employees')
          .select(`
            id,
            position,
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          `)
          .eq('organization_id', currentOrg.id)
          .eq('status', 'active')
          .neq('id', currentEmployee?.id || '')
          .limit(10);

        // If there's search text, filter by name
        if (searchText) {
          query = query.ilike('profiles.full_name', `%${searchText}%`);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching members:', error);
          return;
        }

        const formattedMembers: TeamMember[] = (data || [])
          .filter((emp: any) => emp.profiles)
          .map((emp: any) => ({
            id: emp.id,
            name: emp.profiles.full_name,
            position: emp.position,
            avatar_url: emp.profiles.avatar_url,
          }));

        setMembers(formattedMembers);
        setSelectedIndex(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [currentOrg?.id, currentEmployee?.id, searchText, isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

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

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const content = (
    <div
      ref={containerRef}
      className="fixed z-[100] bg-popover border border-border rounded-lg shadow-lg w-[280px] max-h-[280px] overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateY(-100%)',
      }}
    >
      {isLoading ? (
        <div className="p-3 text-sm text-muted-foreground text-center">
          Loading...
        </div>
      ) : displayMembers.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground text-center">
          {searchText ? `No members found for "${searchText}"` : 'No team members available'}
        </div>
      ) : (
        <ul className="py-1">
          {displayMembers.map((member, index) => (
            <li
              key={member.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted",
                member.isAllMention && "border-b border-border"
              )}
              onClick={() => onSelect(member)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
            {member.isAllMention ? (
                <div className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center",
                  index === selectedIndex ? "bg-primary-foreground/20" : "bg-primary/10"
                )}>
                  <Users className={cn(
                    "h-4 w-4",
                    index === selectedIndex ? "text-accent-foreground" : "text-primary"
                  )} />
                </div>
              ) : (
                <Avatar className="h-7 w-7">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
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
                    index === selectedIndex ? "text-accent-foreground/80" : "text-muted-foreground"
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
  );

  // Use portal to render at document body level
  return createPortal(content, document.body);
};

export default MentionAutocomplete;
