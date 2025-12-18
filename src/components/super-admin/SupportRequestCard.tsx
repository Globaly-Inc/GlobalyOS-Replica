import { Bug, Lightbulb, ExternalLink } from 'lucide-react';
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

  // Truncate URL for display
  const displayUrl = request.page_url.replace(/^https?:\/\/[^/]+/, '').substring(0, 30);

  return (
    <Card 
      className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{ borderLeftColor: request.type === 'bug' ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {request.type === 'bug' ? (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5">
              <Bug className="h-3 w-3 mr-1" />
              Bug
            </Badge>
          ) : (
            <Badge className="text-xs px-1.5 py-0.5 h-5 bg-primary">
              <Lightbulb className="h-3 w-3 mr-1" />
              Feature
            </Badge>
          )}
          <Badge className={cn("text-xs px-1.5 py-0.5 h-5", priorityConfig.bgColor, priorityConfig.color)}>
            {priorityConfig.label}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{timeAgo}</span>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm line-clamp-2 mb-2">{request.title}</h4>

      {/* Footer Row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={request.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {request.profiles?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="truncate max-w-[100px]">
            {request.profiles?.full_name || 'Unknown'}
          </span>
          {request.organizations?.name && (
            <>
              <span>•</span>
              <span className="truncate max-w-[80px]">{request.organizations.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground/70">
          <ExternalLink className="h-3 w-3" />
          <span className="truncate max-w-[80px]">{displayUrl || '/'}</span>
        </div>
      </div>
    </Card>
  );
};
