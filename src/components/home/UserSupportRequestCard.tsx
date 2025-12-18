import { Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SupportRequest, PRIORITY_CONFIG, STATUS_CONFIG } from '@/types/support';
import { cn } from '@/lib/utils';

interface UserSupportRequestCardProps {
  request: SupportRequest;
  onClick: () => void;
}

export const UserSupportRequestCard = ({ request, onClick }: UserSupportRequestCardProps) => {
  const priorityConfig = PRIORITY_CONFIG[request.priority];
  const statusConfig = STATUS_CONFIG[request.status];
  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: false });

  return (
    <Card 
      className="p-3 cursor-pointer hover:shadow-md transition-all border-l-3 group"
      style={{ borderLeftColor: request.type === 'bug' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-center gap-1.5 mb-2">
        {request.type === 'bug' ? (
          <Bug className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
        ) : (
          <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        )}
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-1.5 py-0 h-4 font-medium", priorityConfig.color)}
        >
          {priorityConfig.label}
        </Badge>
        <div className="flex items-center gap-1 ml-auto">
          <div className={cn('h-2 w-2 rounded-full', statusConfig.color)} />
          <span className="text-[10px] text-muted-foreground">{statusConfig.label}</span>
        </div>
      </div>

      {/* Title */}
      <h4 className="font-medium text-xs line-clamp-2 mb-2 leading-tight group-hover:text-primary transition-colors">
        {request.title}
      </h4>

      {/* Footer Row */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{timeAgo} ago</span>
        {(request.comment_count ?? 0) > 0 && (
          <div className="flex items-center gap-0.5">
            <MessageSquare className="h-3 w-3" />
            <span>{request.comment_count}</span>
          </div>
        )}
      </div>
    </Card>
  );
};
