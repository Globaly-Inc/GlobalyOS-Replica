import { Phone, Video, PhoneMissed, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CallLogData } from '@/types/chat';

interface CallLogMessageProps {
  data: CallLogData;
  isOwn: boolean;
}

const CallLogMessage = ({ data, isOwn }: CallLogMessageProps) => {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getIcon = () => {
    if (data.status === 'missed') return <PhoneMissed className="h-4 w-4 text-destructive" />;
    if (data.status === 'declined') return <PhoneOff className="h-4 w-4 text-muted-foreground" />;
    return data.call_type === 'video'
      ? <Video className="h-4 w-4 text-primary" />
      : <Phone className="h-4 w-4 text-primary" />;
  };

  const getLabel = () => {
    if (data.status === 'missed') return 'Missed call';
    if (data.status === 'declined') return 'Call declined';
    return data.call_type === 'video' ? 'Video call' : 'Voice call';
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 w-fit max-w-[260px]",
      data.status === 'missed' && "border-destructive/20 bg-destructive/5"
    )}>
      {getIcon()}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{getLabel()}</span>
        {data.duration_seconds != null && data.status === 'ended' && (
          <span className="text-xs text-muted-foreground">
            {formatDuration(data.duration_seconds)}
          </span>
        )}
      </div>
    </div>
  );
};

export default CallLogMessage;
