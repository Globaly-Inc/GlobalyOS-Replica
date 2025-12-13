import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  X,
  MessageSquare,
  Users,
  Hash,
  User,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalChatSearch, GlobalSearchResult } from "@/hooks/useGlobalChatSearch";
import { format } from "date-fns";
import type { ActiveChat } from "@/types/chat";

interface GlobalChatSearchProps {
  onSelectResult: (result: GlobalSearchResult, chat: ActiveChat) => void;
  onStartDM: (employeeId: string, name: string) => void;
}

const resultTypeConfig = {
  message: {
    icon: MessageSquare,
    label: "Messages",
    bgClass: "bg-blue-500/10",
    borderClass: "border-l-blue-500",
    iconClass: "text-blue-600",
  },
  conversation: {
    icon: Users,
    label: "Groups & DMs",
    bgClass: "bg-green-500/10",
    borderClass: "border-l-green-500",
    iconClass: "text-green-600",
  },
  space: {
    icon: Hash,
    label: "Spaces",
    bgClass: "bg-purple-500/10",
    borderClass: "border-l-purple-500",
    iconClass: "text-purple-600",
  },
  member: {
    icon: User,
    label: "Members",
    bgClass: "bg-amber-500/10",
    borderClass: "border-l-amber-500",
    iconClass: "text-amber-600",
  },
};

const GlobalChatSearch = ({ onSelectResult, onStartDM }: GlobalChatSearchProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { groupedResults, isLoading, hasResults } = useGlobalChatSearch(query);

  // Flatten results for keyboard navigation
  const flatResults: GlobalSearchResult[] = [
    ...groupedResults.message,
    ...groupedResults.conversation,
    ...groupedResults.space,
    ...groupedResults.member,
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when typing
  useEffect(() => {
    if (query.length >= 2) {
      setIsOpen(true);
      setSelectedIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || flatResults.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flatResults.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
        break;
      case "Enter":
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelectResult(flatResults[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelectResult = (result: GlobalSearchResult) => {
    if (result.type === 'member') {
      // Start DM with member
      const employeeId = result.id.replace('member-', '');
      onStartDM(employeeId, result.title);
    } else if (result.type === 'message') {
      // Navigate to the message in conversation/space
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

    setQuery("");
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

  const renderResultGroup = (type: GlobalSearchResult['type'], results: GlobalSearchResult[]) => {
    if (results.length === 0) return null;

    const config = resultTypeConfig[type];
    const Icon = config.icon;

    return (
      <div key={type} className="mb-3">
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <Icon className={cn("h-3.5 w-3.5", config.iconClass)} />
          {config.label}
        </div>
        <div className="space-y-1 px-2">
          {results.map((result, idx) => {
            const globalIndex = flatResults.findIndex((r) => r.id === result.id);
            const isSelected = globalIndex === selectedIndex;

            return (
              <button
                key={result.id}
                onClick={() => handleSelectResult(result)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-md text-left transition-colors border-l-2",
                  config.bgClass,
                  config.borderClass,
                  isSelected && "ring-2 ring-primary ring-offset-1"
                )}
              >
                {type === 'space' ? (
                  <div className="flex items-center justify-center h-8 w-8 rounded bg-purple-500/20 text-purple-600 font-semibold text-sm shrink-0">
                    {result.title.charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={result.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px]">
                      {type === 'conversation' ? <Users className="h-4 w-4" /> : getInitials(result.title)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {result.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{result.subtitle}</span>
                    {result.createdAt && (
                      <span className="shrink-0">
                        · {format(new Date(result.createdAt), "MMM d")}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search chat..."
          className="pl-9 pr-8"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          style={{ width: 'calc(200% + 1rem)' }}
        >
          <ScrollArea className="h-[400px]">
            <div className="py-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Searching...
                </div>
              ) : !hasResults && query.length >= 2 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results found for "{query}"</p>
                </div>
              ) : (
                <>
                  {renderResultGroup('message', groupedResults.message)}
                  {renderResultGroup('conversation', groupedResults.conversation)}
                  {renderResultGroup('space', groupedResults.space)}
                  {renderResultGroup('member', groupedResults.member)}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default GlobalChatSearch;
