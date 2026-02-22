import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAgentApi } from '@/hooks/useAgentApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, FileStack, Clock, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
  cancelled: 'bg-muted text-muted-foreground',
};

const AgentDealsPage = () => {
  const { agentFetch } = useAgentApi();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['agent-deals'],
    queryFn: () => agentFetch('list-deals'),
  });

  const deals = data?.deals || [];
  const filtered = search
    ? deals.filter((d: any) =>
        d.title?.toLowerCase().includes(search.toLowerCase()) ||
        d.contact?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.contact?.last_name?.toLowerCase().includes(search.toLowerCase())
      )
    : deals;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deals</h1>
        <p className="text-muted-foreground mt-1">Track deal progress and pipeline stages</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deals..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-12">
          <FileStack className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {search ? 'No deals match your search' : 'No deals assigned to you yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((deal: any) => (
            <Card key={deal.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{deal.title}</p>
                      <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[deal.status] || ''}`}>
                        {deal.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {deal.contact && (
                        <span>{deal.contact.first_name} {deal.contact.last_name}</span>
                      )}
                      {deal.pipeline && (
                        <span>• {deal.pipeline.name}</span>
                      )}
                      {deal.current_stage && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: deal.current_stage.color }} />
                          {deal.current_stage.name}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      {deal.deal_value != null && (
                        <span className="font-medium text-foreground">{deal.currency} {Number(deal.deal_value).toLocaleString()}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentDealsPage;
