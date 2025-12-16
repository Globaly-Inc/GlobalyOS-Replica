import { useState, useEffect } from "react";
import { Search, X, Users, BookOpen, MessageSquare, Clock, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { cn } from "@/lib/utils";

interface MobileSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  type: "team" | "wiki" | "chat" | "event";
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
}

export const MobileSearch = ({ open, onOpenChange }: MobileSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { currentOrg } = useOrganization();
  const { navigateOrg } = useOrgNavigation();

  // Load recent searches from localStorage
  useEffect(() => {
    if (currentOrg?.id) {
      const stored = localStorage.getItem(`recent_searches_${currentOrg.id}`);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    }
  }, [currentOrg?.id]);

  // Save to recent searches
  const saveRecentSearch = (term: string) => {
    if (!currentOrg?.id || !term.trim()) return;
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem(`recent_searches_${currentOrg.id}`, JSON.stringify(updated));
  };

  // Search function
  useEffect(() => {
    const search = async () => {
      if (!query.trim() || !currentOrg?.id) {
        setResults([]);
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Search team members
        const { data: employees } = await supabase
          .from("employee_directory")
          .select("id, full_name, position, avatar_url")
          .eq("organization_id", currentOrg.id)
          .or(`full_name.ilike.%${query}%,position.ilike.%${query}%`)
          .limit(5);

        if (employees) {
          employees.forEach((emp: any) => {
            searchResults.push({
              type: "team",
              id: emp.id,
              title: emp.full_name,
              subtitle: emp.position,
              avatarUrl: emp.avatar_url,
            });
          });
        }

        // Search wiki pages
        const { data: wikiPages } = await supabase
          .from("wiki_pages")
          .select("id, title")
          .eq("organization_id", currentOrg.id)
          .ilike("title", `%${query}%`)
          .limit(5);

        if (wikiPages) {
          wikiPages.forEach((page: any) => {
            searchResults.push({
              type: "wiki",
              id: page.id,
              title: page.title,
              subtitle: "Wiki page",
            });
          });
        }

        // Search chat spaces
        const { data: spaces } = await supabase
          .from("chat_spaces")
          .select("id, name, description")
          .eq("organization_id", currentOrg.id)
          .ilike("name", `%${query}%`)
          .limit(3);

        if (spaces) {
          spaces.forEach((space: any) => {
            searchResults.push({
              type: "chat",
              id: space.id,
              title: space.name,
              subtitle: space.description || "Chat space",
            });
          });
        }

        // Search calendar events
        const { data: events } = await supabase
          .from("calendar_events")
          .select("id, title, start_date, event_type")
          .eq("organization_id", currentOrg.id)
          .ilike("title", `%${query}%`)
          .order("start_date", { ascending: true })
          .limit(5);

        if (events) {
          events.forEach((event: any) => {
            const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            searchResults.push({
              type: "event",
              id: event.id,
              title: event.title,
              subtitle: `${eventDate} • ${event.event_type || 'Event'}`,
            });
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, currentOrg?.id]);

  const handleResultClick = (result: SearchResult) => {
    saveRecentSearch(query);
    
    switch (result.type) {
      case "team":
        navigateOrg(`/team/${result.id}`);
        break;
      case "wiki":
        navigateOrg(`/wiki/${result.id}`);
        break;
      case "chat":
        navigateOrg(`/chat?space=${result.id}`);
        break;
      case "event":
        navigateOrg(`/calendar`);
        break;
    }
    
    onOpenChange(false);
    setQuery("");
  };

  const getTypeIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "team":
        return Users;
      case "wiki":
        return BookOpen;
      case "chat":
        return MessageSquare;
      case "event":
        return Calendar;
    }
  };

  const getTypeBg = (type: SearchResult["type"]) => {
    switch (type) {
      case "team":
        return "bg-amber-500/10 border-amber-500/20";
      case "wiki":
        return "bg-purple-500/10 border-purple-500/20";
      case "chat":
        return "bg-green-500/10 border-green-500/20";
      case "event":
        return "bg-blue-500/10 border-blue-500/20";
    }
  };


  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-[85vh] p-0">
        <div className="flex flex-col h-full">
          {/* Search Header */}
          <div className="sticky top-0 bg-background border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team, wiki, chat..."
                className="pl-10 pr-10 h-12 text-base"
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Results */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {loading && (
                <div className="text-center py-8 text-muted-foreground">
                  Searching...
                </div>
              )}

              {!loading && query && results.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No results found for "{query}"
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="space-y-2">
                  {results.map((result) => {
                    const Icon = getTypeIcon(result.type);
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className={cn(
                          "flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-colors",
                          getTypeBg(result.type),
                          "hover:bg-muted/50 active:bg-muted"
                        )}
                      >
                        {result.type === "team" && result.avatarUrl ? (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={result.avatarUrl} />
                            <AvatarFallback>{getInitials(result.title)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Recent Searches */}
              {!query && recentSearches.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Recent searches</span>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(term)}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-muted text-left"
                      >
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!query && recentSearches.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Search for team members, wiki pages, or chat spaces</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
