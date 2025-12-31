import React, { useState } from 'react';
import { Phone, Video, PhoneMissed, PhoneOff, Play, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CallLogData {
  call_id: string;
  call_type: 'audio' | 'video';
  status: 'ended' | 'missed' | 'declined';
  duration_seconds?: number;
  initiated_by: string;
  initiator_name: string;
  initiator_avatar?: string;
  participants: Array<{
    name: string;
    avatar?: string;
  }>;
  recording_url?: string;
  has_transcript?: boolean;
  ai_summary?: string;
}

interface CallLogMessageProps {
  data: CallLogData;
  timestamp: string;
  isOwn: boolean;
}

const CallLogMessage: React.FC<CallLogMessageProps> = ({
  data,
  timestamp,
  isOwn,
}) => {
  const [showSummary, setShowSummary] = useState(false);
  
  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };
  
  const getCallIcon = () => {
    if (data.status === 'missed') {
      return <PhoneMissed className="h-5 w-5 text-destructive" />;
    }
    if (data.status === 'declined') {
      return <PhoneOff className="h-5 w-5 text-muted-foreground" />;
    }
    if (data.call_type === 'video') {
      return <Video className="h-5 w-5 text-primary" />;
    }
    return <Phone className="h-5 w-5 text-primary" />;
  };
  
  const getStatusText = () => {
    switch (data.status) {
      case 'missed':
        return 'Missed call';
      case 'declined':
        return 'Call declined';
      case 'ended':
        return data.call_type === 'video' ? 'Video call' : 'Voice call';
      default:
        return 'Call';
    }
  };
  
  const duration = formatDuration(data.duration_seconds);
  
  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 transition-colors",
      "hover:bg-muted/40"
    )}>
      {/* Call icon */}
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
        data.status === 'missed' && "bg-destructive/10",
        data.status === 'declined' && "bg-muted",
        data.status === 'ended' && "bg-primary/10"
      )}>
        {getCallIcon()}
      </div>
      
      {/* Call details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {getStatusText()}
          </span>
          {duration && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {duration}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(timestamp), 'h:mm a')}
          </span>
        </div>
        
        {/* Participants */}
        {data.participants.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground">with</span>
            <div className="flex -space-x-2">
              {data.participants.slice(0, 3).map((p, i) => (
                <Avatar key={i} className="h-5 w-5 border-2 border-background">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback className="text-[8px]">
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {data.participants.map(p => p.name.split(' ')[0]).join(', ')}
            </span>
          </div>
        )}
        
        {/* Actions */}
        {(data.recording_url || data.ai_summary) && (
          <div className="flex items-center gap-2 mt-2">
            {data.recording_url && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => window.open(data.recording_url, '_blank')}
              >
                <Play className="h-3 w-3" />
                Play recording
              </Button>
            )}
            {data.ai_summary && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowSummary(!showSummary)}
              >
                <FileText className="h-3 w-3" />
                Summary
                {showSummary ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        )}
        
        {/* AI Summary */}
        {showSummary && data.ai_summary && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              <FileText className="h-3 w-3" />
              AI Summary
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {data.ai_summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallLogMessage;
