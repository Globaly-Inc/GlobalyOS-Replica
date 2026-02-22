import { Card } from '@/components/ui/card';
import { useDealActivityLog } from '@/services/useCRMDeals';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';

interface Props {
  dealId: string;
}

export function DealActivityLog({ dealId }: Props) {
  const { data: logs, isLoading } = useDealActivityLog(dealId);

  if (isLoading) return <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>;
  if (!logs?.length) return <p className="text-sm text-muted-foreground text-center py-6">No activity yet</p>;

  return (
    <Card className="divide-y">
      {logs.map((log: any) => (
        <div key={log.id} className="flex items-start gap-3 p-3">
          <Activity className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm">{log.description || log.action_type}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(log.created_at), 'dd MMM yyyy HH:mm')} • {log.actor_type}
            </p>
          </div>
        </div>
      ))}
    </Card>
  );
}
