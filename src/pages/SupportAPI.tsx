/**
 * API Reference Page
 * Auto-generated API documentation for edge functions
 */

import { useState } from 'react';
import { Search, Code, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SupportLayout } from '@/components/support/SupportLayout';
import { APIEndpointCard } from '@/components/support/APIEndpointCard';
import { useApiDocumentation } from '@/services/useSupportArticles';

const SupportAPI = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPublic, setFilterPublic] = useState<boolean | null>(null);
  const { data: endpoints, isLoading } = useApiDocumentation();

  const filteredEndpoints = endpoints?.filter((endpoint) => {
    const matchesSearch = searchQuery.trim() === '' || 
      endpoint.function_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterPublic === null || endpoint.is_public === filterPublic;
    
    return matchesSearch && matchesFilter;
  });

  // Group by first tag if available
  const groupedEndpoints = filteredEndpoints?.reduce((acc, endpoint) => {
    const group = endpoint.tags?.[0] || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(endpoint);
    return acc;
  }, {} as Record<string, typeof filteredEndpoints>);

  return (
    <SupportLayout 
      title="API Reference"
      breadcrumbs={[{ label: 'API Reference' }]}
    >
      <div className="max-w-4xl">
        <p className="text-muted-foreground mb-6">
          Documentation for GlobalyOS backend functions. These endpoints can be called from your applications.
        </p>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search endpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterPublic === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPublic(null)}
            >
              All
            </Button>
            <Button
              variant={filterPublic === true ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPublic(true)}
            >
              Public
            </Button>
            <Button
              variant={filterPublic === false ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterPublic(false)}
            >
              Authenticated
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {/* Endpoints List */}
        {!isLoading && filteredEndpoints && filteredEndpoints.length > 0 ? (
          <div className="space-y-8">
            {groupedEndpoints && Object.entries(groupedEndpoints).map(([group, endpoints]) => (
              <div key={group}>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  {group}
                  <Badge variant="secondary" className="text-xs">
                    {endpoints?.length} endpoints
                  </Badge>
                </h2>
                <div className="space-y-3">
                  {endpoints?.map((endpoint) => (
                    <APIEndpointCard key={endpoint.id} endpoint={endpoint} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading ? (
          <div className="text-center py-12 border rounded-lg bg-muted/50">
            <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No API Documentation</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'No endpoints match your search.' : 'API documentation will be auto-generated when available.'}
            </p>
          </div>
        ) : null}

        {/* Base URL Info */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-medium mb-2">Base URL</h3>
          <code className="text-sm bg-background px-2 py-1 rounded">
            https://rygowmzkvxgnxagqlyxf.functions.supabase.co/
          </code>
          <p className="text-sm text-muted-foreground mt-2">
            All endpoints require the <code className="bg-background px-1 rounded">Authorization</code> header with a valid JWT token unless marked as public.
          </p>
        </div>
      </div>
    </SupportLayout>
  );
};

export default SupportAPI;
