import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Plus, 
  Edit, 
  Trash2, 
  Link, 
  Unlink, 
  Bell, 
  UserPlus, 
  UserMinus,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useKpiActivityLogs, KpiActivityLog } from '@/services/useKpiActivityLogs';

interface KpiActivityLogsProps {
  kpiId: string | undefined;
}

const actionIcons: Record<string, React.ReactNode> = {
  created: <Plus className="h-3 w-3" />,
  updated: <Edit className="h-3 w-3" />,
  progress_updated: <TrendingUp className="h-3 w-3" />,
  deleted: <Trash2 className="h-3 w-3" />,
  linked: <Link className="h-3 w-3" />,
  unlinked: <Unlink className="h-3 w-3" />,
  reminder_changed: <Bell className="h-3 w-3" />,
  owner_added: <UserPlus className="h-3 w-3" />,
  owner_removed: <UserMinus className="h-3 w-3" />,
};

const actionColors: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  progress_updated: 'bg-primary/10 text-primary',
  deleted: 'bg-red-100 text-red-700',
  linked: 'bg-purple-100 text-purple-700',
  unlinked: 'bg-orange-100 text-orange-700',
  reminder_changed: 'bg-amber-100 text-amber-700',
  owner_added: 'bg-teal-100 text-teal-700',
  owner_removed: 'bg-rose-100 text-rose-700',
};

const actionLabels: Record<string, string> = {
  created: 'Created KPI',
  updated: 'Updated',
  progress_updated: 'Progress Update',
  deleted: 'Deleted',
  linked: 'Linked to Parent',
  unlinked: 'Unlinked',
  reminder_changed: 'Reminder Changed',
  owner_added: 'Owner Added',
  owner_removed: 'Owner Removed',
};

export function KpiActivityLogs({ kpiId }: KpiActivityLogsProps) {
  const { data: logs, isLoading } = useKpiActivityLogs(kpiId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Activity Log</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Activity Log</h3>
        {logs && logs.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {logs.length}
          </Badge>
        )}
      </div>

      {!logs || logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No activity recorded yet
        </p>
      ) : (
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {logs.map((log, index) => (
              <ActivityLogItem key={log.id} log={log} isLast={index === logs.length - 1} />
            ))}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
}

function ActivityLogItem({ log, isLast }: { log: KpiActivityLog; isLast: boolean }) {
  const icon = actionIcons[log.action_type] || <Activity className="h-3 w-3" />;
  const color = actionColors[log.action_type] || 'bg-muted text-muted-foreground';
  const label = actionLabels[log.action_type] || log.action_type;

  return (
    <div className="relative flex gap-3">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
      )}
      
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 z-10">
        <AvatarImage src={log.employee?.profiles?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">
          {log.employee?.profiles?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
        </AvatarFallback>
      </Avatar>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {log.employee?.profiles?.full_name || 'Unknown'}
          </span>
          <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${color}`}>
            <span className="mr-1">{icon}</span>
            {label}
          </Badge>
        </div>
        
        {log.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {log.description}
          </p>
        )}
        
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
