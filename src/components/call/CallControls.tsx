import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users, Maximize2, Minimize2, Monitor, MonitorOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  isExpanded?: boolean;
  isScreenSharing?: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onToggleExpand?: () => void;
  onToggleParticipants?: () => void;
  onToggleScreenShare?: () => void;
  showExpandButton?: boolean;
  className?: string;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isVideoOff,
  isExpanded,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  onToggleExpand,
  onToggleParticipants,
  onToggleScreenShare,
  showExpandButton = true,
  className,
}) => {
  return (
    <TooltipProvider>
      <div className={cn("flex items-center justify-center gap-2", className)}>
        {/* Mute toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? "destructive" : "secondary"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={onToggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
        </Tooltip>
        
        {/* Video toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isVideoOff ? "destructive" : "secondary"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={onToggleVideo}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isVideoOff ? 'Turn on camera' : 'Turn off camera'}</TooltipContent>
        </Tooltip>
        
        {/* Screen share toggle */}
        {onToggleScreenShare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isScreenSharing ? "default" : "secondary"}
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full",
                  isScreenSharing && "bg-primary text-primary-foreground"
                )}
                onClick={onToggleScreenShare}
              >
                {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isScreenSharing ? 'Stop sharing' : 'Share screen'}</TooltipContent>
          </Tooltip>
        )}
        
        {/* End call */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={onEndCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>End call</TooltipContent>
        </Tooltip>
        
        {/* Participants toggle */}
        {onToggleParticipants && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={onToggleParticipants}
              >
                <Users className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Participants</TooltipContent>
          </Tooltip>
        )}
        
        {/* Expand/Minimize toggle */}
        {showExpandButton && onToggleExpand && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={onToggleExpand}
              >
                {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isExpanded ? 'Minimize' : 'Expand'}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
