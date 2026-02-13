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

  if (viewers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center -space-x-2">
        {viewers.slice(0, 5).map((viewer) => (
          <Tooltip key={viewer.employeeId}>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border">
                <AvatarImage src={viewer.avatarUrl || undefined} alt={viewer.name} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {viewer.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {viewer.name} is viewing
            </TooltipContent>
          </Tooltip>
        ))}
        {viewers.length > 5 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                  +{viewers.length - 5}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {viewers.slice(5).map((v) => v.name).join(', ')}
            </TooltipContent>
          </Tooltip>
        )}
        <span className="text-xs text-muted-foreground pl-3">
          {viewers.length} viewing
        </span>
      </div>
    </TooltipProvider>
  );
};
