import { Bug, Lightbulb, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SupportRequest, PRIORITY_CONFIG } from '@/types/support';
import { cn } from '@/lib/utils';

interface SupportRequestCardProps {
  request: SupportRequest;
  onClick: () => void;
}

export const SupportRequestCard = ({ request, onClick }: SupportRequestCardProps) => {
  const priorityConfig = PRIORITY_CONFIG[request.priority];
  const timeAgo = formatDistanceToNow(new Date(request.created_at), { addSuffix: false });

  return (
    <Card 
      className="p-2.5 cursor-pointer hover:shadow-md transition-shadow border-l-3"
      style={{ borderLeftColor: request.type === 'bug' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
      onClick={onClick}
    >
      {/* Header Row: Type icon + Priority + Time + Comments */}
      <div className="flex items-center gap-1.5 mb-1.5">
        {request.type === 'bug' ? (
          <Bug className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
        ) : (
          <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        )}
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-1 py-0 h-4 font-medium", priorityConfig.color)}
        >
          {priorityConfig.label}
        </Badge>
        <span className="text-[10px] text-muted-foreground ml-auto">{timeAgo}</span>
        {(request.comment_count ?? 0) > 0 && (
          <div className="flex items-center gap-0.5 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span className="text-[10px]">{request.comment_count}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="font-medium text-xs line-clamp-2 mb-1.5 leading-tight">{request.title}</h4>

      {/* Footer Row: Avatar + Name + Org */}
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Avatar className="h-4 w-4">
          <AvatarImage src={request.profiles?.avatar_url || undefined} />
          <AvatarFallback className="text-[8px]">
            {request.profiles?.full_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="truncate max-w-[70px]">
          {request.profiles?.full_name?.split(' ')[0] || 'Unknown'}
        </span>
        {request.organizations?.name && (
          <>
            <span className="text-muted-foreground/50">•</span>
            <span className="truncate max-w-[60px] text-muted-foreground/70">{request.organizations.name}</span>
          </>
        )}
      </div>
    </Card>
  );
};
