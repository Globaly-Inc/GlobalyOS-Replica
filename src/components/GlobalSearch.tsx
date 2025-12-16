import { useState, useEffect, useCallback } from 'react';
import { Search, Users, Calendar, BookOpen, Clock } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useGlobalSearch, GlobalSearchResult } from '@/hooks/useGlobalSearch';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeConfig = {
  team: {
    icon: Users,
    label: 'Team Members',
    className: 'text-amber-600 dark:text-amber-400',
    bgClassName: 'bg-amber-500/10',
  },
  event: {
    icon: Calendar,
    label: 'Calendar Events',
    className: 'text-blue-600 dark:text-blue-400',
    bgClassName: 'bg-blue-500/10',
  },
  wiki: {
    icon: BookOpen,
    label: 'Wiki Pages',
    className: 'text-purple-600 dark:text-purple-400',
    bgClassName: 'bg-purple-500/10',
  },
};

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { results, groupedResults, isLoading, hasResults } = useGlobalSearch(query);
  const { navigateOrg } = useOrgNavigation();
  const { currentOrg } = useOrganization();

  // Load recent searches
  useEffect(() => {
    if (currentOrg?.id) {
      const stored = localStorage.getItem(`global_search_recent_${currentOrg.id}`);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    }
  }, [currentOrg?.id]);

  // Save recent search
  const saveRecentSearch = useCallback(
    (term: string) => {
      if (!currentOrg?.id || !term.trim()) return;
      const updated = [term, ...recentSearches.filter((s) => s !== term)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem(`global_search_recent_${currentOrg.id}`, JSON.stringify(updated));
    },
    [currentOrg?.id, recentSearches]
  );

  // Clear search on close
  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const handleSelect = (result: GlobalSearchResult) => {
    saveRecentSearch(query);

    switch (result.type) {
      case 'team':
        navigateOrg(`/team/${result.id}`);
        break;
      case 'event':
        navigateOrg(`/calendar`);
        break;
      case 'wiki':
        navigateOrg(`/wiki/${result.id}`);
        break;
    }

    onOpenChange(false);
  };

  const handleRecentSearch = (term: string) => {
    setQuery(term);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderResultItem = (result: GlobalSearchResult) => {
    const config = typeConfig[result.type];
    const Icon = config.icon;

    return (
      <CommandItem
        key={`${result.type}-${result.id}`}
        value={`${result.type}-${result.id}-${result.title}`}
        onSelect={() => handleSelect(result)}
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
      >
        {result.type === 'team' && result.avatarUrl ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={result.avatarUrl} />
            <AvatarFallback className="text-xs">{getInitials(result.title)}</AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn('h-8 w-8 rounded-full flex items-center justify-center', config.bgClassName)}>
            <Icon className={cn('h-4 w-4', config.className)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{result.title}</p>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
          )}
        </div>
      </CommandItem>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search team, events, wiki..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
        )}

        {!isLoading && query.length >= 2 && !hasResults && (
          <CommandEmpty>No results found for "{query}"</CommandEmpty>
        )}

        {/* Search Results */}
        {!isLoading && hasResults && (
          <>
            {groupedResults.team.length > 0 && (
              <CommandGroup heading="Team Members">
                {groupedResults.team.map(renderResultItem)}
              </CommandGroup>
            )}

            {groupedResults.event.length > 0 && (
              <>
                {groupedResults.team.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Calendar Events">
                  {groupedResults.event.map(renderResultItem)}
                </CommandGroup>
              </>
            )}

            {groupedResults.wiki.length > 0 && (
              <>
                {(groupedResults.team.length > 0 || groupedResults.event.length > 0) && (
                  <CommandSeparator />
                )}
                <CommandGroup heading="Wiki Pages">
                  {groupedResults.wiki.map(renderResultItem)}
                </CommandGroup>
              </>
            )}
          </>
        )}

        {/* Recent Searches */}
        {!query && recentSearches.length > 0 && (
          <CommandGroup heading="Recent Searches">
            {recentSearches.map((term, i) => (
              <CommandItem
                key={i}
                value={`recent-${term}`}
                onSelect={() => handleRecentSearch(term)}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{term}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Empty State */}
        {!query && recentSearches.length === 0 && (
          <div className="py-8 text-center">
            <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Search for team members, events, or wiki pages
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd> anytime to open
            </p>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
