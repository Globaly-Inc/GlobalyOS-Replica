import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MonitorOff,
  Maximize2, Minimize2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSendbirdCalls } from '@/providers/SendbirdCallsProvider';

const CallOverlay = () => {
  const { activeCall, activeRoom, endCall } = useSendbirdCalls();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [duration, setDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = !!activeCall || !!activeRoom;
  const isVideoCall = activeCall?.isVideoCall ?? false;

  // Duration timer
  useEffect(() => {
    if (isActive) {
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  // Set up media views for direct calls
  useEffect(() => {
    if (!activeCall) return;

    if (localVideoRef.current && isVideoCall) {
      activeCall.setLocalMediaView(localVideoRef.current);
    }
    if (remoteVideoRef.current) {
      activeCall.setRemoteMediaView(remoteVideoRef.current);
    }
  }, [activeCall, isVideoCall]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = useCallback(() => {
    if (activeCall) {
      if (isMuted) {
        activeCall.unmuteMicrophone();
      } else {
        activeCall.muteMicrophone();
      }
    }
    setIsMuted(!isMuted);
  }, [activeCall, isMuted]);

  const toggleVideo = useCallback(() => {
    if (activeCall) {
      if (isVideoEnabled) {
        activeCall.stopVideo();
      } else {
        activeCall.startVideo();
      }
    }
    setIsVideoEnabled(!isVideoEnabled);
  }, [activeCall, isVideoEnabled]);

  const handleEndCall = useCallback(() => {
    endCall();
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    setDuration(0);
  }, [endCall]);

  if (!isActive) return null;

  const callerName = activeCall?.remoteUser?.nickname || 'Participant';

  return (
    <div className={cn(
      "fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col",
      !isFullscreen && "inset-auto bottom-4 right-4 w-[360px] h-[280px] rounded-xl shadow-2xl border"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-foreground">{callerName}</span>
          <span className="text-xs text-muted-foreground">{formatDuration(duration)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Video area */}
      <div className="flex-1 relative bg-muted/30">
        {isVideoCall ? (
          <>
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Local video (PiP) */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "absolute rounded-lg border-2 border-background shadow-lg object-cover",
                isFullscreen ? "bottom-24 right-4 w-48 h-36" : "bottom-16 right-3 w-24 h-18"
              )}
            />
          </>
        ) : (
          /* Audio call - show avatar */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-semibold text-primary">
                  {callerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-lg font-semibold text-foreground">{callerName}</p>
              <p className="text-sm text-muted-foreground mt-1">{formatDuration(duration)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-card border-t border-border/50">
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        {isVideoCall && (
          <Button
            variant={!isVideoEnabled ? 'destructive' : 'secondary'}
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={toggleVideo}
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon"
          className="h-14 w-14 rounded-full"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default CallOverlay;
