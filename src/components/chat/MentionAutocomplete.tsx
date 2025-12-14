import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  avatar_url: string | null;
}

interface MentionAutocompleteProps {
  isOpen: boolean;
  searchText: string;
  onSelect: (member: TeamMember) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const MentionAutocomplete = ({
  isOpen,
  searchText,
  onSelect,
  onClose,
  position,
}: MentionAutocompleteProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const containerRef = useRef<HTMLDivElement>(null);

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
        setSelectedIndex((prev) => (prev + 1) % members.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + members.length) % members.length);
      } else if ((e.key === 'Enter' || e.key === 'Tab') && members[selectedIndex]) {
        e.preventDefault();
        onSelect(members[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, members, selectedIndex, onSelect, onClose]);

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

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 z-50 bg-popover border border-border rounded-lg shadow-lg w-[280px] max-h-[280px] overflow-y-auto"
    >
      {isLoading ? (
        <div className="p-3 text-sm text-muted-foreground text-center">
          Loading...
        </div>
      ) : members.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground text-center">
          {searchText ? `No members found for "${searchText}"` : 'No team members available'}
        </div>
      ) : (
        <ul className="py-1">
          {members.map((member, index) => (
            <li
              key={member.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => onSelect(member)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <Avatar className="h-7 w-7">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                {member.position && (
                  <p className="text-xs text-muted-foreground truncate">
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
};

export default MentionAutocomplete;
