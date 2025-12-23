import { APP_VERSION, BUILD_TIME } from '@/lib/version';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AppVersionBadgeProps {
  className?: string;
}

export const AppVersionBadge = ({ className = '' }: AppVersionBadgeProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className={`text-[10px] text-muted-foreground/50 font-mono cursor-help select-none ${className}`}
        >
          v{APP_VERSION}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p>Build: {BUILD_TIME}</p>
      </TooltipContent>
    </Tooltip>
  );
};
