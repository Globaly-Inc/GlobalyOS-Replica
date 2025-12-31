import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MicOff, VideoOff, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParticipantTileProps {
  name: string;
  avatarUrl?: string | null;
  stream?: MediaStream | null;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isLocal?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
  className?: string;
}

export const ParticipantTile: React.FC<ParticipantTileProps> = ({
  name,
  avatarUrl,
  stream,
  isMuted,
  isVideoOff,
  isLocal,
  isSpeaking,
  isScreenSharing,
  className,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  
  React.useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  const hasVideo = stream?.getVideoTracks().some(t => t.enabled) && !isVideoOff;
  
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-muted flex items-center justify-center",
        isSpeaking && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Screen share indicator */}
      {isScreenSharing && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-primary/90 text-xs text-white flex items-center gap-1 shadow-lg">
          <Monitor className="h-3 w-3" />
          Screen Share
        </div>
      )}
      
      {/* Video element */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={cn(
            "w-full h-full object-cover",
            isLocal && !isScreenSharing && "scale-x-[-1]" // Mirror local video, but not screen share
          )}
        />
      ) : (
        /* Avatar fallback */
        <div className="flex flex-col items-center justify-center gap-2">
          <Avatar className="h-20 w-20 border-2 border-background">
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback className="text-2xl bg-primary/20 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground/80">{name}</span>
        </div>
      )}
      
      {/* Name overlay (when video is on) */}
      {hasVideo && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">
              {name} {isLocal && '(You)'}
            </span>
            <div className="flex items-center gap-1">
              {isMuted && (
                <div className="p-1 rounded-full bg-destructive/80">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Status indicators (when video is off) */}
      {!hasVideo && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
          {isMuted && (
            <div className="p-1.5 rounded-full bg-destructive/80">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {isVideoOff && (
            <div className="p-1.5 rounded-full bg-muted-foreground/50">
              <VideoOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      )}
      
      {/* Local indicator */}
      {isLocal && hasVideo && !isScreenSharing && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-xs text-white">
          You
        </div>
      )}
    </div>
  );
};
