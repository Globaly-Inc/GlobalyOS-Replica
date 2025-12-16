import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface GlobalSearchResult {
  type: 'team' | 'event' | 'wiki';
  id: string;
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  date?: string;
}

export interface GroupedResults {
  team: GlobalSearchResult[];
  event: GlobalSearchResult[];
  wiki: GlobalSearchResult[];
}

export function useGlobalSearch(query: string) {
  const { currentOrg } = useOrganization();
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-search', currentOrg?.id, debouncedQuery],
    queryFn: async () => {
      if (!currentOrg?.id || debouncedQuery.length < 2) return [];

      const searchResults: GlobalSearchResult[] = [];

      // Search team members
      const { data: employees } = await supabase
        .from('employee_directory')
        .select('id, full_name, position, avatar_url')
        .eq('organization_id', currentOrg.id)
        .or(`full_name.ilike.%${debouncedQuery}%,position.ilike.%${debouncedQuery}%`)
        .limit(5);

      if (employees) {
        employees.forEach((emp) => {
          searchResults.push({
            type: 'team',
            id: emp.id,
            title: emp.full_name || 'Unknown',
            subtitle: emp.position || undefined,
            avatarUrl: emp.avatar_url,
          });
        });
      }

      // Search calendar events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, start_date, event_type')
        .eq('organization_id', currentOrg.id)
        .ilike('title', `%${debouncedQuery}%`)
        .order('start_date', { ascending: true })
        .limit(5);

      if (events) {
        events.forEach((event) => {
          const eventDate = new Date(event.start_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          searchResults.push({
            type: 'event',
            id: event.id,
            title: event.title,
            subtitle: `${eventDate} • ${event.event_type || 'Event'}`,
            date: event.start_date,
          });
        });
      }

      // Search wiki pages
      const { data: wikiPages } = await supabase
        .from('wiki_pages')
        .select('id, title, folder:wiki_folders(name)')
        .eq('organization_id', currentOrg.id)
        .ilike('title', `%${debouncedQuery}%`)
        .limit(5);

      if (wikiPages) {
        wikiPages.forEach((page: any) => {
          searchResults.push({
            type: 'wiki',
            id: page.id,
            title: page.title,
            subtitle: page.folder?.name ? `${page.folder.name} folder` : 'Wiki page',
          });
        });
      }

      return searchResults;
    },
    enabled: !!currentOrg?.id && debouncedQuery.length >= 2,
  });

  // Group results by type
  const groupedResults = useMemo((): GroupedResults => {
    return {
      team: results.filter((r) => r.type === 'team'),
      event: results.filter((r) => r.type === 'event'),
      wiki: results.filter((r) => r.type === 'wiki'),
    };
  }, [results]);

  return {
    results,
    groupedResults,
    isLoading,
    hasResults: results.length > 0,
  };
}
