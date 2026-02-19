import { useInboxActivity } from '@/hooks/useInboxActivity';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import {
  ArrowRightLeft,
  Tag,
  UserCheck,
  Bot,
  StickyNote,
  AlertTriangle,
  Clock,
} from 'lucide-react';

const actionIcons: Record<string, React.ReactNode> = {
  status_change: <ArrowRightLeft className="h-3 w-3 text-blue-500" />,
  priority_change: <AlertTriangle className="h-3 w-3 text-amber-500" />,
  tag_add: <Tag className="h-3 w-3 text-green-500" />,
  tag_remove: <Tag className="h-3 w-3 text-red-500" />,
  assigned: <UserCheck className="h-3 w-3 text-primary" />,
  unassigned: <UserCheck className="h-3 w-3 text-muted-foreground" />,
  ai_draft: <Bot className="h-3 w-3 text-violet-500" />,
  ai_auto_send: <Bot className="h-3 w-3 text-violet-500" />,
  note_added: <StickyNote className="h-3 w-3 text-yellow-500" />,
};

function describeAction(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case 'status_change':
      return `Status → ${details.to || 'unknown'}`;
    case 'priority_change':
      return `Priority → ${details.to || 'unknown'}`;
    case 'tag_add':
      return `Tag added: ${details.tag || ''}`;
    case 'tag_remove':
      return `Tag removed: ${details.tag || ''}`;
    case 'assigned':
      return 'Assigned to agent';
    case 'unassigned':
      return 'Unassigned';
    case 'ai_draft':
      return 'AI draft generated';
    case 'ai_auto_send':
      return 'AI auto-replied';
    case 'note_added':
      return 'Internal note added';
    default:
      return action;
  }
}

interface Props {
  conversationId: string | undefined;
}

export const InboxActivityTimeline = ({ conversationId }: Props) => {
  const { data: activities = [], isLoading } = useInboxActivity(conversationId);

  if (!conversationId) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Activity
      </h4>
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3 animate-spin" /> Loading...
        </div>
      ) : activities.length === 0 ? (
        <p className="text-xs text-muted-foreground">No activity yet</p>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-2">
            {activities.slice(0, 20).map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-xs">
                <div className="mt-0.5">
                  {actionIcons[a.action] || <Clock className="h-3 w-3 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground">{describeAction(a.action, a.details)}</span>
                  <span className="text-muted-foreground ml-1">
                    {format(new Date(a.created_at), 'MMM d, HH:mm')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
