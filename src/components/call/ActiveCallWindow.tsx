import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Video, GripHorizontal, Monitor, Maximize2, Minimize2, X, Circle } from 'lucide-react';
import { CallSession, CallParticipant } from '@/types/call';
import { CallControls } from './CallControls';
import { VideoGrid } from './VideoGrid';
import { RecordingControls } from './RecordingControls';
import { useCallRecording } from '@/hooks/useCallRecording';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type WindowMode = 'minimized' | 'floating' | 'fullscreen';

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface ActiveCallWindowProps {
  call: CallSession;
  participants: CallParticipant[];
  currentEmployeeId: string;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export const ActiveCallWindow: React.FC<ActiveCallWindowProps> = ({
  call,
  participants,
  currentEmployeeId,
  localStream,
  remoteStreams,
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}) => {
  const [windowMode, setWindowMode] = useState<WindowMode>('floating');
  const [callDuration, setCallDuration] = useState(0);
  const [position, setPosition] = useState<Position>({ x: 20, y: 20 });
  const [size, setSize] = useState<Size>({ width: 400, height: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  const windowRef = useRef<HTMLDivElement>(null);
  
  // Recording hook
  const recording = useCallRecording(call.id);
  
  // Create combined stream for recording (local + remote)
  const getCombinedStream = useCallback(() => {
    // For now, just use local stream - in production you'd combine audio tracks
    return localStream;
  }, [localStream]);
  
  const handleStartRecording = useCallback(() => {
    const stream = getCombinedStream();
    if (stream) {
      recording.startRecording(stream);
    }
  }, [getCombinedStream, recording]);
  
  // Track call duration
  useEffect(() => {
    if (call.status !== 'active' && call.status !== 'ringing') return;
    
    const startTime = call.started_at ? new Date(call.started_at).getTime() : Date.now();
    
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [call.status, call.started_at]);
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const activeParticipants = participants.filter(p => p.status === 'joined');
  const otherParticipant = activeParticipants.find(p => p.employee_id !== currentEmployeeId);
  const callName = otherParticipant?.employee?.profiles?.full_name || 
    (activeParticipants.length > 2 ? `Group call (${activeParticipants.length})` : 'Call');
  
  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (windowMode !== 'floating' || isResizing) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.resize-handle')) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [windowMode, position, isResizing]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      // Use requestAnimationFrame for smoother performance
      requestAnimationFrame(() => {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      });
    }
  }, [isDragging, dragOffset, size]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);
  
  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    
    const handleResize = (moveEvent: MouseEvent) => {
      requestAnimationFrame(() => {
        const newWidth = Math.max(320, Math.min(window.innerWidth * 0.8, startWidth + (moveEvent.clientX - startX)));
        const newHeight = Math.max(240, Math.min(window.innerHeight * 0.8, startHeight + (moveEvent.clientY - startY)));
        setSize({ width: newWidth, height: newHeight });
      });
    };
    
    const handleResizeEnd = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
    
    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', handleResizeEnd);
  }, [size]);
  
  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  // Fullscreen mode
  if (windowMode === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-[150] bg-background flex flex-col">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-card/95 backdrop-blur">
          <div className="flex items-center gap-3">
            {isScreenSharing ? (
              <Monitor className="h-5 w-5 text-primary" />
            ) : call.call_type === 'video' ? (
              <Video className="h-5 w-5 text-primary" />
            ) : (
              <Phone className="h-5 w-5 text-primary" />
            )}
            <div>
              <h2 className="font-semibold">{callName}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDuration(callDuration)}</span>
                <span>•</span>
                <span>{activeParticipants.length} participant{activeParticipants.length !== 1 ? 's' : ''}</span>
                {isScreenSharing && (
                  <>
                    <span>•</span>
                    <span className="text-primary">Screen sharing</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setWindowMode('floating')}
            className="hover:bg-muted"
          >
            <Minimize2 className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Video grid */}
        <div className="flex-1 bg-muted/30">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            currentEmployeeId={currentEmployeeId}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
          />
        </div>
        
        {/* Controls - floating at bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
          {/* Recording controls */}
          <div className="bg-card/90 backdrop-blur-lg rounded-full shadow-2xl border px-4 py-2">
            <RecordingControls
              isRecording={recording.isRecording}
              isPaused={recording.isPaused}
              duration={recording.duration}
              onStartRecording={handleStartRecording}
              onPauseRecording={recording.pauseRecording}
              onResumeRecording={recording.resumeRecording}
              onStopRecording={recording.stopRecording}
            />
          </div>
          
          {/* Main call controls */}
          <div className="bg-card/90 backdrop-blur-lg rounded-full shadow-2xl border px-6 py-3">
            <CallControls
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isExpanded={true}
              isScreenSharing={isScreenSharing}
              onToggleMute={onToggleMute}
              onToggleVideo={onToggleVideo}
              onToggleScreenShare={onToggleScreenShare}
              onEndCall={onEndCall}
              onToggleExpand={() => setWindowMode('floating')}
            />
          </div>
        </div>
      </div>
    );
  }
  
  // Minimized mode - small pill
  if (windowMode === 'minimized') {
    return (
      <div 
        className="fixed bottom-4 right-4 z-[150] bg-card rounded-full shadow-2xl border px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-card/90 transition-colors"
        onClick={() => setWindowMode('floating')}
      >
        <div className="flex items-center gap-2">
          {call.call_type === 'video' ? (
            <Video className="h-4 w-4 text-primary" />
          ) : (
            <Phone className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium">{callName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">{formatDuration(callDuration)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onEndCall();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  
  // Floating/resizable mode
  return (
    <div 
      ref={windowRef}
      className={cn(
        "fixed z-[150] rounded-xl shadow-2xl overflow-hidden border bg-card",
        "animate-in slide-in-from-bottom-2 duration-200",
        isDragging && "cursor-grabbing select-none",
        isResizing && "select-none",
        !isDragging && !isResizing && "cursor-grab transition-shadow hover:shadow-xl"
      )}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: size.width,
        height: size.height,
        willChange: isDragging || isResizing ? 'transform' : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header / Drag handle */}
      <div className="h-10 bg-muted/50 flex items-center justify-between px-3 cursor-grab">
        <div className="flex items-center gap-2">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{callName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded-full">
            {formatDuration(callDuration)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            onClick={() => setWindowMode('minimized')}
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full"
            onClick={() => setWindowMode('fullscreen')}
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      {/* Video area */}
      <div 
        className="bg-muted/30"
        style={{ height: `calc(100% - 100px)` }}
      >
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          participants={participants}
          currentEmployeeId={currentEmployeeId}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
        />
      </div>
      
      {/* Controls */}
      <div className="h-[60px] border-t flex items-center justify-center gap-2 bg-card/95 px-2">
        {/* Recording indicator/controls */}
        <RecordingControls
          isRecording={recording.isRecording}
          isPaused={recording.isPaused}
          duration={recording.duration}
          onStartRecording={handleStartRecording}
          onPauseRecording={recording.pauseRecording}
          onResumeRecording={recording.resumeRecording}
          onStopRecording={recording.stopRecording}
          className="scale-75"
        />
        
        <CallControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isExpanded={false}
          isScreenSharing={isScreenSharing}
          onToggleMute={onToggleMute}
          onToggleVideo={onToggleVideo}
          onToggleScreenShare={onToggleScreenShare}
          onEndCall={onEndCall}
          showExpandButton={false}
          className="scale-90"
        />
      </div>
      
      {/* Resize handle */}
      <div 
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <svg 
          className="absolute bottom-1 right-1 h-3 w-3 text-muted-foreground/50"
          viewBox="0 0 24 24"
        >
          <path 
            fill="currentColor" 
            d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z"
          />
        </svg>
      </div>
    </div>
  );
};
