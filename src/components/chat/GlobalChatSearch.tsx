import { useState, useMemo, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MessageSquare,
  Users,
  Hash,
  User,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalChatSearch, GlobalSearchResult } from "@/hooks/useGlobalChatSearch";
import { useTeamPresence } from "@/services/useTeamData";
import { format } from "date-fns";
import type { ActiveChat } from "@/types/chat";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface GlobalChatSearchProps {
  onSelectResult: (result: GlobalSearchResult, chat: ActiveChat) => void;
  onStartDM: (employeeId: string, name: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const resultTypeConfig = {
  member: {
    icon: User,
    label: "Members",
    iconClass: "text-amber-600",
  },
  conversation: {
    icon: Users,
    label: "Groups & DMs",
    iconClass: "text-green-600",
  },
  space: {
    icon: Hash,
    label: "Spaces",
    iconClass: "text-purple-600",
  },
  message: {
    icon: MessageSquare,
    label: "Messages",
    iconClass: "text-blue-600",
  },
};

// Helper to highlight matching text
const HighlightedText = ({ text, query }: { text: string; query: string }) => {
  if (!query || query.length < 2) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const GlobalChatSearch = ({ 
  onSelectResult, 
  onStartDM,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: GlobalChatSearchProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  const { groupedResults, isLoading, hasResults } = useGlobalChatSearch(query);

  // Extract member employee IDs for online status
  const memberEmployeeIds = useMemo(() => {
    return groupedResults.member.map(m => m.id.replace('member-', ''));
  }, [groupedResults.member]);

  const onlineStatuses = useTeamPresence(memberEmployeeIds);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Reset query when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const handleSelectResult = (result: GlobalSearchResult) => {
    if (result.type === 'member') {
      const employeeId = result.id.replace('member-', '');
      onStartDM(employeeId, result.title);
    } else if (result.type === 'message') {
      const chat: ActiveChat = result.conversationId
        ? { type: 'conversation', id: result.conversationId, name: result.subtitle || 'Chat' }
        : { type: 'space', id: result.spaceId!, name: result.subtitle || 'Space' };
      onSelectResult(result, chat);
    } else if (result.type === 'conversation') {
      const chat: ActiveChat = {
        type: 'conversation',
        id: result.conversationId!,
        name: result.title,
        isGroup: result.subtitle === 'Group chat',
        iconUrl: result.avatarUrl,
      };
      onSelectResult(result, chat);
    } else if (result.type === 'space') {
      const chat: ActiveChat = {
        type: 'space',
        id: result.spaceId!,
        name: result.title,
      };
      onSelectResult(result, chat);
    }

    setIsOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClearQuery = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery("");
    inputRef.current?.focus();
  };

  const renderResultItem = (result: GlobalSearchResult) => {
    const config = resultTypeConfig[result.type];
    const Icon = config.icon;

    return (
      <CommandItem
        key={result.id}
        value={result.id}
        onSelect={() => handleSelectResult(result)}
        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
      >
        {result.type === 'space' ? (
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/15 text-purple-600 font-semibold text-sm shrink-0">
            <Hash className="h-4 w-4" />
          </div>
        ) : (
          <div className="relative">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={result.avatarUrl || undefined} />
              <AvatarFallback className="text-xs bg-muted">
                {result.type === 'conversation' ? (
                  <Users className="h-4 w-4 text-muted-foreground" />
                ) : result.type === 'message' ? (
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                ) : (
                  getInitials(result.title)
                )}
              </AvatarFallback>
            </Avatar>
            {result.type === 'member' && onlineStatuses[result.id.replace('member-', '')] && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
            )}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              <HighlightedText text={result.title} query={query} />
            </p>
            {result.type === 'member' && onlineStatuses[result.id.replace('member-', '')] && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20">
                Online
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">
              {result.type === 'message' ? (
                <HighlightedText text={result.subtitle || ''} query={query} />
              ) : (
                result.subtitle
              )}
            </span>
            {result.createdAt && (
              <span className="shrink-0">
                · {format(new Date(result.createdAt), "MMM d")}
              </span>
            )}
          </div>
        </div>

        <Icon className={cn("h-4 w-4 shrink-0 opacity-40", config.iconClass)} />
      </CommandItem>
    );
  };

  const hasAnyResults = hasResults && query.length >= 2;
  const showEmptyState = !isLoading && query.length >= 2 && !hasResults;
  const showInitialState = query.length < 2;

  // Result counts
  const memberCount = groupedResults.member.length;
  const conversationCount = groupedResults.conversation.length;
  const spaceCount = groupedResults.space.length;
  const messageCount = groupedResults.message.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chat..."
            className="w-full pl-9 pr-8 h-9 bg-muted/50 border-border focus-visible:bg-background"
            onClick={() => !isOpen && setIsOpen(true)}
          />
          {query && (
            <button
              onClick={handleClearQuery}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg" 
        align="start" 
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command className="rounded-lg" shouldFilter={false}>
          <CommandList className="max-h-[320px]">
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Searching...</span>
              </div>
            )}

            {showEmptyState && (
              <CommandEmpty>
                <div className="flex flex-col items-center py-6 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm font-medium">No results for "{query}"</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              </CommandEmpty>
            )}

            {showInitialState && !isLoading && (
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Search members, groups, spaces & messages</p>
                <p className="text-xs mt-1 opacity-70">Type at least 2 characters</p>
              </div>
            )}

            {hasAnyResults && !isLoading && (
              <>
                {/* Members - First priority */}
                {memberCount > 0 && (
                  <CommandGroup heading={`Members (${memberCount})`}>
                    {groupedResults.member.map(renderResultItem)}
                  </CommandGroup>
                )}

                {/* Groups & DMs - Second priority */}
                {conversationCount > 0 && (
                  <CommandGroup heading={`Groups & DMs (${conversationCount})`}>
                    {groupedResults.conversation.map(renderResultItem)}
                  </CommandGroup>
                )}

                {/* Spaces - Third priority */}
                {spaceCount > 0 && (
                  <CommandGroup heading={`Spaces (${spaceCount})`}>
                    {groupedResults.space.map(renderResultItem)}
                  </CommandGroup>
                )}

                {/* Messages - Fourth priority */}
                {messageCount > 0 && (
                  <CommandGroup heading={`Messages (${messageCount})`}>
                    {groupedResults.message.map(renderResultItem)}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-center px-3 py-1.5 border-t border-border text-[10px] text-muted-foreground bg-muted/30">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="mx-2">·</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border">↵</kbd>
              <span>select</span>
            </span>
            <span className="mx-2">·</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-background border">esc</kbd>
              <span>close</span>
            </span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default GlobalChatSearch;
