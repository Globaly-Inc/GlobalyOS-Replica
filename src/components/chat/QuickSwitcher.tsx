import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MessageSquare, Hash, User, Clock } from "lucide-react";
import { useConversations, useSpaces } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { cn } from "@/lib/utils";
import type { ActiveChat, ChatConversation, ChatSpace } from "@/types/chat";

interface QuickSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectChat: (chat: ActiveChat) => void;
  recentChats?: ActiveChat[];
}

interface SearchResult {
  type: 'conversation' | 'space';
  id: string;
  name: string;
  avatarUrl?: string | null;
  isGroup?: boolean;
  subtitle?: string;
}

const QuickSwitcher = ({ open, onOpenChange, onSelectChat, recentChats = [] }: QuickSwitcherProps) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: conversations = [] } = useConversations();
  const { data: spaces = [] } = useSpaces();
  const { data: currentEmployee } = useCurrentEmployee();

  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name;
    if (conv.is_group) return "Group Chat";
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.full_name || "Unknown";
  };

  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.icon_url) return conv.icon_url;
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.avatar_url || null;
  };

  // Build search results
  const allItems: SearchResult[] = [
    ...conversations.map(conv => ({
      type: 'conversation' as const,
      id: conv.id,
      name: getConversationName(conv),
      avatarUrl: getConversationAvatar(conv),
      isGroup: conv.is_group,
      subtitle: conv.is_group ? `${conv.participants?.length || 0} members` : undefined,
    })),
    ...spaces.map(space => ({
      type: 'space' as const,
      id: space.id,
      name: space.name,
      avatarUrl: space.icon_url,
      subtitle: `${space.member_count || 0} members`,
    })),
  ];

  // Filter by query
  const filteredResults = query.trim()
    ? allItems.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 10); // Show first 10 when no query

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onOpenChange(false);
        break;
    }
  }, [filteredResults, selectedIndex, onOpenChange]);

  const handleSelect = (result: SearchResult) => {
    onSelectChat({
      type: result.type,
      id: result.id,
      name: result.name,
      isGroup: result.isGroup,
      iconUrl: result.avatarUrl,
    });
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Jump to a conversation or space..."
            className="border-0 focus-visible:ring-0 p-0 h-auto text-base"
          />
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {/* Recent Section */}
          {!query && recentChats.length > 0 && (
            <div className="px-2 py-2">
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                <Clock className="h-3 w-3" />
                Recent
              </div>
              {recentChats.slice(0, 3).map((chat, idx) => (
                <button
                  key={`recent-${chat.id}`}
                  onClick={() => handleSelect({
                    type: chat.type === 'space' ? 'space' : 'conversation',
                    id: chat.id,
                    name: chat.name,
                    avatarUrl: chat.iconUrl,
                    isGroup: chat.isGroup,
                  })}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors",
                    idx === selectedIndex && !query ? "bg-accent" : "hover:bg-accent/50"
                  )}
                >
                  {chat.type === 'space' ? (
                    <div className="flex items-center justify-center h-8 w-8 rounded bg-primary/10 text-primary">
                      <Hash className="h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={chat.iconUrl || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(chat.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{chat.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* All Results */}
          <div className="px-2 py-2">
            {query && (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground uppercase tracking-wider">
                Results
              </div>
            )}
            {filteredResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found</p>
              </div>
            ) : (
              filteredResults.map((result, idx) => {
                const adjustedIdx = query ? idx : idx + (recentChats.length > 0 ? recentChats.slice(0, 3).length : 0);
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className={cn(
                      "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors",
                      (query ? idx === selectedIndex : adjustedIdx === selectedIndex)
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                  >
                    {result.type === 'space' ? (
                      <div className="flex items-center justify-center h-8 w-8 rounded bg-primary/10 text-primary">
                        {result.avatarUrl ? (
                          <img src={result.avatarUrl} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <Hash className="h-4 w-4" />
                        )}
                      </div>
                    ) : (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={result.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {result.isGroup ? (
                            <MessageSquare className="h-4 w-4" />
                          ) : (
                            getInitials(result.name)
                          )}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1">
                        {result.type === 'space' && <span className="text-muted-foreground">#</span>}
                        <p className="text-sm font-medium truncate">{result.name}</p>
                      </div>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {result.type === 'space' ? 'Space' : result.isGroup ? 'Group' : 'DM'}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd> select</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd> close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSwitcher;
