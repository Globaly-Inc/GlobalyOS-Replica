import { useState, useMemo, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  MessageSquare,
  Users,
  Hash,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalChatSearch, GlobalSearchResult } from "@/hooks/useGlobalChatSearch";
import { useTeamPresence } from "@/services/useTeamData";
import { format } from "date-fns";
import type { ActiveChat } from "@/types/chat";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface GlobalChatSearchProps {
  onSelectResult: (result: GlobalSearchResult, chat: ActiveChat) => void;
  onStartDM: (employeeId: string, name: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const resultTypeConfig = {
  message: {
    icon: MessageSquare,
    label: "Messages",
    iconClass: "text-blue-600",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  conversation: {
    icon: Users,
    label: "Groups & DMs",
    iconClass: "text-green-600",
    badgeClass: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  space: {
    icon: Hash,
    label: "Spaces",
    iconClass: "text-purple-600",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  member: {
    icon: User,
    label: "Members",
    iconClass: "text-amber-600",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
};

const GlobalChatSearch = ({ 
  onSelectResult, 
  onStartDM,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: GlobalChatSearchProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;

  const { groupedResults, isLoading, hasResults } = useGlobalChatSearch(query);

  // Extract member employee IDs for online status
  const memberEmployeeIds = useMemo(() => {
    return groupedResults.member.map(m => m.id.replace('member-', ''));
  }, [groupedResults.member]);

  const onlineStatuses = useTeamPresence(memberEmployeeIds);

  // Register global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  // Reset query when dialog closes
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

  const renderResultItem = (result: GlobalSearchResult) => {
    const config = resultTypeConfig[result.type];
    const Icon = config.icon;

    return (
      <CommandItem
        key={result.id}
        value={result.id}
        onSelect={() => handleSelectResult(result)}
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
      >
        {result.type === 'space' ? (
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-purple-500/15 text-purple-600 font-semibold text-sm shrink-0">
            <Hash className="h-4 w-4" />
          </div>
        ) : (
          <div className="relative">
            <Avatar className="h-9 w-9 shrink-0">
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
              {result.title}
            </p>
            {result.type === 'member' && onlineStatuses[result.id.replace('member-', '')] && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20">
                Online
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{result.subtitle}</span>
            {result.createdAt && (
              <span className="shrink-0">
                · {format(new Date(result.createdAt), "MMM d")}
              </span>
            )}
          </div>
        </div>

        <Icon className={cn("h-4 w-4 shrink-0 opacity-50", config.iconClass)} />
      </CommandItem>
    );
  };

  const hasAnyResults = hasResults && query.length >= 2;
  const showEmptyState = !isLoading && query.length >= 2 && !hasResults;
  const showInitialState = query.length < 2;

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted border border-border rounded-md transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search chat...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search Dialog */}
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <CommandInput
          placeholder="Search messages, people, and spaces..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[400px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Searching...</span>
            </div>
          )}

          {showEmptyState && (
            <CommandEmpty>
              <div className="flex flex-col items-center py-6 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No results found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            </CommandEmpty>
          )}

          {showInitialState && !isLoading && (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Search className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Search messages, people, and spaces</p>
              <p className="text-xs mt-1">Type at least 2 characters to search</p>
            </div>
          )}

          {hasAnyResults && !isLoading && (
            <>
              {groupedResults.message.length > 0 && (
                <CommandGroup heading="Messages">
                  {groupedResults.message.map(renderResultItem)}
                </CommandGroup>
              )}

              {groupedResults.conversation.length > 0 && (
                <CommandGroup heading="Groups & DMs">
                  {groupedResults.conversation.map(renderResultItem)}
                </CommandGroup>
              )}

              {groupedResults.space.length > 0 && (
                <CommandGroup heading="Spaces">
                  {groupedResults.space.map(renderResultItem)}
                </CommandGroup>
              )}

              {groupedResults.member.length > 0 && (
                <CommandGroup heading="Members">
                  {groupedResults.member.map(renderResultItem)}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>

        {/* Footer with keyboard hints */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↓</kbd>
              <span className="ml-1">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">↵</kbd>
              <span className="ml-1">select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-background border text-[10px]">esc</kbd>
              <span className="ml-1">close</span>
            </span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
};

export default GlobalChatSearch;
