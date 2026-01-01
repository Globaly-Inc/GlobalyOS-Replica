import React from 'react';
import { Phone, Video, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ActiveCallIndicatorProps {
  callType: 'audio' | 'video';
  duration: number;
  participantName?: string;
  onClick: () => void;
  className?: string;
}

export const ActiveCallIndicator: React.FC<ActiveCallIndicatorProps> = ({
  callType,
  duration,
  participantName,
  onClick,
  className,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          className={cn(
            "h-10 gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700",
            "dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-green-800 dark:text-green-400",
            className
          )}
        >
          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
          {callType === 'video' ? (
            <Video className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          <span className="font-medium text-sm">{formatDuration(duration)}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Return to {participantName ? `call with ${participantName}` : 'active call'}</p>
      </TooltipContent>
    </Tooltip>
  );
};
