import React, { useRef, useEffect, useState } from 'react';
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
  isPiP?: boolean;
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
  isPiP = false,
  className,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  // Stable stream attachment - only update when stream ID changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const newStreamId = stream?.id ?? null;
    
    // Only update srcObject if the stream actually changed
    if (newStreamId !== streamId) {
      video.srcObject = stream ?? null;
      setStreamId(newStreamId);
    }
  }, [stream, streamId]);
  
  // Separate effect for play handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    
    const handlePlay = () => {
      video.play().catch(() => {
        // Autoplay was prevented, user interaction needed
      });
    };
    
    // Try to play when stream is attached
    if (video.srcObject) {
      handlePlay();
    }
  }, [stream]);
  
  const hasVideo = stream?.getVideoTracks().some(t => t.enabled && t.readyState === 'live') && !isVideoOff;
  
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-muted/80 flex items-center justify-center transition-all duration-200",
        isSpeaking && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isPiP && "shadow-xl border-2 border-background",
        className
      )}
    >
      {/* Screen share indicator */}
      {isScreenSharing && (
        <div className="absolute top-2 left-2 z-10 px-2 py-1 rounded-full bg-primary/90 text-xs text-primary-foreground flex items-center gap-1 shadow-lg">
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
            "w-full h-full object-cover transition-transform duration-200",
            isLocal && !isScreenSharing && "scale-x-[-1]" // Mirror local video, but not screen share
          )}
        />
      ) : (
        /* Avatar fallback */
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <Avatar className={cn(
            "border-2 border-background shadow-lg",
            isPiP ? "h-12 w-12" : "h-20 w-20"
          )}>
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback className={cn(
              "bg-primary/20 text-primary font-semibold",
              isPiP ? "text-sm" : "text-2xl"
            )}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isPiP && (
            <span className="text-sm font-medium text-foreground/80 text-center truncate max-w-full px-2">
              {name}
            </span>
          )}
        </div>
      )}
      
      {/* Name overlay (when video is on) */}
      {hasVideo && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
          <div className="flex items-center justify-between">
            <span className={cn(
              "font-medium text-white truncate",
              isPiP ? "text-xs" : "text-sm"
            )}>
              {name} {isLocal && '(You)'}
            </span>
            <div className="flex items-center gap-1">
              {isMuted && (
                <div className="p-1 rounded-full bg-destructive/90">
                  <MicOff className={cn("text-white", isPiP ? "h-2 w-2" : "h-3 w-3")} />
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
            <div className="p-1.5 rounded-full bg-destructive/90">
              <MicOff className="h-3 w-3 text-white" />
            </div>
          )}
          {isVideoOff && (
            <div className="p-1.5 rounded-full bg-muted-foreground/60">
              <VideoOff className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      )}
      
      {/* Local indicator */}
      {isLocal && hasVideo && !isScreenSharing && !isPiP && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-xs text-white font-medium">
          You
        </div>
      )}
    </div>
  );
};
