import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Trophy, Clock } from 'lucide-react';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';
import { useMoveDealStage } from '@/services/useCRMDeals';
import type { CRMPipeline, CRMDeal, CRMPipelineStage } from '@/types/crm-pipeline';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  pipeline: CRMPipeline;
  deals: CRMDeal[];
}

export function DealKanbanBoard({ pipeline, deals }: Props) {
  const { navigateOrg } = useOrgNavigation();
  const moveDeal = useMoveDealStage();

  const stages = useMemo(() => {
    if (!pipeline.stages) return [];
    return [...pipeline.stages].sort((a, b) => a.sort_order - b.sort_order);
  }, [pipeline.stages]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, CRMDeal[]> = {};
    stages.forEach(s => { map[s.id] = []; });
    deals.forEach(d => {
      if (d.current_stage_id && map[d.current_stage_id]) {
        map[d.current_stage_id].push(d);
      }
    });
    return map;
  }, [deals, stages]);

  if (!stages.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No stages defined for this pipeline. Configure stages in Settings.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 mt-2">
      {stages.map(stage => (
        <div key={stage.id} className="flex-shrink-0 w-[300px]">
          {/* Column Header */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="text-sm font-semibold text-foreground">{stage.name}</span>
            {stage.stage_type === 'win' && <Trophy className="h-3.5 w-3.5 text-emerald-500" />}
            <Badge variant="secondary" className="ml-auto text-xs">
              {dealsByStage[stage.id]?.length || 0}
            </Badge>
          </div>

          {/* Cards */}
          <div className="space-y-2 min-h-[200px] rounded-lg bg-muted/40 p-2">
            {dealsByStage[stage.id]?.map(deal => (
              <Card
                key={deal.id}
                className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigateOrg(`/crm/deals/${deal.id}`)}
              >
                <div className="space-y-2">
                  <p className="text-sm font-medium line-clamp-2">{deal.title}</p>

                  {deal.contact && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={deal.contact.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {deal.contact.first_name?.[0]}{deal.contact.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {deal.contact.first_name} {deal.contact.last_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {deal.deal_value != null && (
                      <span className="text-xs font-semibold text-foreground">
                        {deal.currency} {Number(deal.deal_value).toLocaleString()}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(deal.updated_at), { addSuffix: false })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={
                      deal.priority === 'high' ? 'destructive' :
                      deal.priority === 'medium' ? 'default' : 'secondary'
                    } className="text-[10px] px-1.5 py-0">
                      {deal.priority}
                    </Badge>
                    {deal.assignee && (
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={deal.assignee.avatar_url || ''} />
                        <AvatarFallback className="text-[10px]">
                          {deal.assignee.first_name?.[0]}{deal.assignee.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {!dealsByStage[stage.id]?.length && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No deals
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
