import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';

interface Props {
  conversation: {
    created_at: string;
    first_response_at?: string | null;
    resolved_at?: string | null;
    status: string;
  };
  slaTargets: {
    firstResponseMinutes: number;
    resolutionMinutes: number;
  };
}

export default function SlaTimerBadge({ conversation, slaTargets }: Props) {
  const now = new Date();
  const created = new Date(conversation.created_at);

  // First response SLA
  if (!conversation.first_response_at && conversation.status !== 'resolved') {
    const elapsed = differenceInMinutes(now, created);
    const remaining = slaTargets.firstResponseMinutes - elapsed;
    const breached = remaining <= 0;

    return (
      <Badge
        variant={breached ? 'destructive' : 'outline'}
        className="text-[10px] gap-1 font-normal"
      >
        {breached ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
        {breached ? `FRT breached (${Math.abs(remaining)}m over)` : `FRT: ${remaining}m left`}
      </Badge>
    );
  }

  // Resolution SLA
  if (conversation.status !== 'resolved' && !conversation.resolved_at) {
    const elapsed = differenceInMinutes(now, created);
    const remaining = slaTargets.resolutionMinutes - elapsed;
    const breached = remaining <= 0;

    return (
      <Badge
        variant={breached ? 'destructive' : 'secondary'}
        className="text-[10px] gap-1 font-normal"
      >
        {breached ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
        {breached ? `Resolve SLA breached` : `Resolve: ${remaining}m left`}
      </Badge>
    );
  }

  return null;
}
