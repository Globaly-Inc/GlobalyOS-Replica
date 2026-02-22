import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, SkipForward, ListChecks, Upload, FormInput, FileText, MessageSquare } from 'lucide-react';
import { useDealRequirements, useUpdateDealRequirement } from '@/services/useCRMDeals';
import type { RequirementType, RequirementStatus } from '@/types/crm-pipeline';

interface Props {
  dealId: string;
}

const REQ_ICONS: Record<RequirementType, React.ReactNode> = {
  task: <ListChecks className="h-4 w-4" />,
  document: <Upload className="h-4 w-4" />,
  field: <FormInput className="h-4 w-4" />,
  form: <FileText className="h-4 w-4" />,
  note_question: <MessageSquare className="h-4 w-4" />,
};

const STATUS_CONFIG: Record<RequirementStatus, { icon: React.ReactNode; label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pending: { icon: <Circle className="h-4 w-4" />, label: 'Pending', variant: 'secondary' },
  completed: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />, label: 'Completed', variant: 'default' },
  skipped: { icon: <SkipForward className="h-4 w-4" />, label: 'Skipped', variant: 'outline' },
  waived: { icon: <SkipForward className="h-4 w-4" />, label: 'Waived', variant: 'outline' },
};

export function DealRequirementsTab({ dealId }: Props) {
  const { data: requirements, isLoading } = useDealRequirements(dealId);
  const updateReq = useUpdateDealRequirement();

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;
  if (!requirements?.length) return <p className="text-sm text-muted-foreground text-center py-6">No requirements for this deal. Requirements are auto-created when a deal enters a stage with configured requirements.</p>;

  const toggleComplete = (req: any) => {
    const newStatus: RequirementStatus = req.status === 'completed' ? 'pending' : 'completed';
    updateReq.mutate({ id: req.id, deal_id: dealId, status: newStatus });
  };

  return (
    <Card className="divide-y">
      {requirements.map((req: any) => {
        const stageReq = req.stage_requirement;
        const cfg = STATUS_CONFIG[req.status as RequirementStatus] || STATUS_CONFIG.pending;
        const reqType = stageReq?.requirement_type as RequirementType;
        return (
          <div key={req.id} className="flex items-center gap-3 p-3">
            <button onClick={() => toggleComplete(req)} className="shrink-0">
              {cfg.icon}
            </button>
            <div className="text-muted-foreground shrink-0">{reqType ? REQ_ICONS[reqType] : null}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${req.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {stageReq?.title || 'Requirement'}
              </p>
              {stageReq?.description && (
                <p className="text-xs text-muted-foreground">{stageReq.description}</p>
              )}
            </div>
            {stageReq?.is_required && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">Required</Badge>
            )}
            <Badge variant={cfg.variant} className="text-[10px] shrink-0">{cfg.label}</Badge>
            {req.status === 'pending' && (
              <Button variant="ghost" size="sm" className="text-xs h-7 shrink-0" onClick={() => updateReq.mutate({ id: req.id, deal_id: dealId, status: 'skipped' })}>
                Skip
              </Button>
            )}
          </div>
        );
      })}
    </Card>
  );
}
