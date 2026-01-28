import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ChevronUp, ChevronDown } from "lucide-react";
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

interface InlineSearchResultsProps {
  query: string;
  conversationId: string | null;
  spaceId: string | null;
  onResultClick: (messageId: string) => void;
  onClose: () => void;
  onNavigate?: (direction: 'up' | 'down') => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
}

/**
 * InlineSearchResults - A content-only panel for search results.
 * 
 * This component is designed to be rendered inside a PopoverContent (portal-based)
 * to avoid stacking context issues with backdrop-blur headers.
 * It does NOT handle its own positioning - the parent PopoverContent does.
 */
const InlineSearchResults = ({
  query,
  conversationId,
  spaceId,
  onResultClick,
  onClose,
  currentIndex,
  setCurrentIndex,
}: InlineSearchResultsProps) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) {
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
  }, [query, conversationId, spaceId, setCurrentIndex]);

  // Scroll current result into view
  useEffect(() => {
    if (results.length > 0 && resultsRef.current) {
      const currentElement = resultsRef.current.querySelector(`[data-index="${currentIndex}"]`);
      currentElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentIndex, results.length]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Highlights matching text by splitting on the query.
   * Uses split indices (odd = match) to avoid regex.lastIndex issues.
   */
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
    
    return parts.map((part, index) => 
      // Odd indices are the matched segments
      index % 2 === 1 ? (
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
      setCurrentIndex((currentIndex - 1 + results.length) % results.length);
    } else {
      setCurrentIndex((currentIndex + 1) % results.length);
    }
  };

  if (!query.trim()) return null;

  return (
    <div className="flex flex-col">
      {/* Header with result count and navigation */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs text-muted-foreground">
          {isSearching ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''}`}
        </span>
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{currentIndex + 1}/{results.length}</span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={() => navigateResult('up')}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={() => navigateResult('down')}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Results list */}
      <ScrollArea className="max-h-[340px]">
        <div ref={resultsRef}>
          {results.map((result, index) => (
            <div
              key={result.id}
              data-index={index}
              className={cn(
                "flex items-start gap-2 px-3 py-2.5 cursor-pointer border-b border-border/50 last:border-0 transition-colors",
                index === currentIndex 
                  ? "bg-accent text-accent-foreground [&_.text-muted-foreground]:text-accent-foreground/80" 
                  : "hover:bg-muted/50"
              )}
              onClick={() => {
                setCurrentIndex(index);
                onResultClick(result.id);
                onClose();
              }}
            >
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={result.sender.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {getInitials(result.sender.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">{result.sender.name}</span>
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

      {/* Empty state */}
      {!isSearching && query.trim() && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No messages found for "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default InlineSearchResults;
