import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  const [hasVideo, setHasVideo] = useState(false);
  const [streamKey, setStreamKey] = useState<string>('');
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  // Check if stream has active video
  const checkVideoStatus = useCallback(() => {
    if (!stream) {
      setHasVideo(false);
      return;
    }
    
    const videoTracks = stream.getVideoTracks();
    const activeVideo = videoTracks.some(t => t.enabled && t.readyState === 'live');
    console.log(`[ParticipantTile] ${name} - Video tracks:`, videoTracks.length, 'Active:', activeVideo, 'isVideoOff:', isVideoOff);
    setHasVideo(activeVideo && !isVideoOff);
  }, [stream, isVideoOff, name]);

  // Attach stream to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const newStreamKey = stream?.id ?? '';
    
    // Only update if stream changed
    if (newStreamKey !== streamKey) {
      console.log(`[ParticipantTile] ${name} - Attaching stream:`, newStreamKey);
      video.srcObject = stream ?? null;
      setStreamKey(newStreamKey);
    }
  }, [stream, streamKey, name]);

  // Play video when stream is attached
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    
    const handlePlay = async () => {
      try {
        await video.play();
        console.log(`[ParticipantTile] ${name} - Video playing`);
      } catch (error) {
        console.log(`[ParticipantTile] ${name} - Autoplay prevented`);
      }
    };
    
    if (video.srcObject) {
      handlePlay();
    }
  }, [stream, name]);

  // Listen for track changes on the stream
  useEffect(() => {
    if (!stream) {
      setHasVideo(false);
      return;
    }

    // Initial check
    checkVideoStatus();

    // Listen for track events
    const handleTrackChange = () => {
      console.log(`[ParticipantTile] ${name} - Track change detected`);
      checkVideoStatus();
    };

    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);

    // Also listen to individual track state changes
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach(track => {
      track.addEventListener('ended', handleTrackChange);
      track.addEventListener('mute', handleTrackChange);
      track.addEventListener('unmute', handleTrackChange);
    });

    // Periodic check as fallback (every 500ms)
    const interval = setInterval(checkVideoStatus, 500);

    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
      videoTracks.forEach(track => {
        track.removeEventListener('ended', handleTrackChange);
        track.removeEventListener('mute', handleTrackChange);
        track.removeEventListener('unmute', handleTrackChange);
      });
      clearInterval(interval);
    };
  }, [stream, checkVideoStatus, name]);

  // Update when isVideoOff prop changes
  useEffect(() => {
    checkVideoStatus();
  }, [isVideoOff, checkVideoStatus]);
  
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
      
      {/* Video element - always render but control visibility */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          "w-full h-full object-cover transition-transform duration-200",
          isLocal && !isScreenSharing && "scale-x-[-1]",
          !hasVideo && "hidden"
        )}
      />
      
      {/* Avatar fallback when no video */}
      {!hasVideo && (
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
