import { useWikiPagePresence, WikiViewer } from '@/hooks/useWikiPagePresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WikiPageViewersProps {
  pageId: string | undefined;
  employeeId: string | undefined;
  userName: string;
  userAvatar: string | null;
}

export const WikiPageViewers = ({
  pageId,
  employeeId,
  userName,
  userAvatar,
}: WikiPageViewersProps) => {
  const viewers = useWikiPagePresence({ pageId, employeeId, userName, userAvatar });

  // Always show at least the current user even before presence syncs
  const displayViewers: WikiViewer[] = viewers.length > 0
    ? viewers
    : employeeId
      ? [{ employeeId, name: userName, avatarUrl: userAvatar, isSelf: true }]
      : [];

  if (displayViewers.length === 0) return null;

  const visible = displayViewers.slice(0, 5);
  const overflow = displayViewers.length - 5;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {visible.map((viewer) => (
          <Tooltip key={viewer.employeeId}>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-background cursor-default">
                <AvatarImage src={viewer.avatarUrl || undefined} alt={viewer.name} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
                  {viewer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {viewer.isSelf ? 'You' : viewer.name}
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background ring-2 ring-background cursor-default">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground font-medium">
                  +{overflow}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {displayViewers.slice(5).map((v) => v.isSelf ? 'You' : v.name).join(', ')}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
