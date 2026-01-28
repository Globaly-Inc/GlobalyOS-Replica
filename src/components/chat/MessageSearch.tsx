import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  sender: {
    name: string;
    avatar_url: string | null;
  };
}

interface MessageSearchProps {
  conversationId: string | null;
  spaceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (messageId: string) => void;
}

const MessageSearch = ({
  conversationId,
  spaceId,
  isOpen,
  onClose,
  onResultClick,
}: MessageSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear results when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setCurrentIndex(0);
    }
  }, [isOpen]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setResults([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        let queryBuilder = supabase
          .from('chat_messages')
          .select(`
            id,
            content,
            created_at,
            sender:sender_id (
              user_id,
              profiles:user_id (
                full_name,
                avatar_url
              )
            )
          `)
          .ilike('content', `%${query}%`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (conversationId) {
          queryBuilder = queryBuilder.eq('conversation_id', conversationId);
        } else if (spaceId) {
          queryBuilder = queryBuilder.eq('space_id', spaceId);
        }

        const { data, error } = await queryBuilder;

        if (error) {
          console.error('Search error:', error);
          return;
        }

        const formattedResults: SearchResult[] = (data || []).map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          sender: {
            name: msg.sender?.profiles?.full_name || 'Unknown',
            avatar_url: msg.sender?.profiles?.avatar_url,
          },
        }));

        setResults(formattedResults);
        setCurrentIndex(0);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, conversationId, spaceId, isOpen]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const navigateResult = (direction: 'up' | 'down') => {
    if (results.length === 0) return;
    
    if (direction === 'up') {
      setCurrentIndex((prev) => (prev - 1 + results.length) % results.length);
    } else {
      setCurrentIndex((prev) => (prev + 1) % results.length);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results[currentIndex]) {
      onResultClick(results[currentIndex].id);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateResult('down');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateResult('up');
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-x-0 top-full z-20 bg-card border-b border-border shadow-lg rounded-b-lg">
      <div className="p-3">
        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search messages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-4"
            />
          </div>
          
          {results.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {currentIndex + 1} of {results.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateResult('up')}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => navigateResult('down')}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search results */}
        {query.trim() && (
          <div className="mt-3">
            {isSearching ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Searching...
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No messages found for "{query}"
              </p>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors",
                        index === currentIndex
                          ? "bg-accent"
                          : "hover:bg-muted"
                      )}
                      onClick={() => {
                        setCurrentIndex(index);
                        onResultClick(result.id);
                      }}
                    >
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarImage src={result.sender.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(result.sender.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {result.sender.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(result.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {highlightMatch(result.content, query)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageSearch;
