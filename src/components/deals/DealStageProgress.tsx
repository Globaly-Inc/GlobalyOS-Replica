import { Trophy } from 'lucide-react';
import { useMoveDealStage } from '@/services/useCRMDeals';
import type { CRMPipelineStage } from '@/types/crm-pipeline';
import { cn } from '@/lib/utils';

interface Props {
  stages: CRMPipelineStage[];
  currentStageId: string | null;
  dealId: string;
}

export function DealStageProgress({ stages, currentStageId, dealId }: Props) {
  const moveDeal = useMoveDealStage();

  const currentIdx = stages.findIndex(s => s.id === currentStageId);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {stages.map((stage, idx) => {
        const isPast = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <button
            key={stage.id}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
              'border cursor-pointer hover:opacity-80',
              isPast && 'bg-primary/10 text-primary border-primary/30',
              isCurrent && 'text-primary-foreground border-transparent',
              isFuture && 'bg-muted text-muted-foreground border-border',
            )}
            style={isCurrent ? { backgroundColor: stage.color, borderColor: stage.color } : undefined}
            onClick={() => {
              if (stage.id !== currentStageId) {
                moveDeal.mutate({ dealId, stageId: stage.id });
              }
            }}
          >
            {stage.stage_type === 'win' && <Trophy className="h-3 w-3" />}
            {stage.name}
          </button>
        );
      })}
    </div>
  );
}
