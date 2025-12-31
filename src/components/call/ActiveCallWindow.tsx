import React, { useState, useEffect } from 'react';
import { Phone, Video, GripHorizontal, Monitor } from 'lucide-react';
import { CallSession, CallParticipant } from '@/types/call';
import { CallControls } from './CallControls';
import { VideoGrid } from './VideoGrid';
import { cn } from '@/lib/utils';

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // Track call duration
  useEffect(() => {
    if (call.status !== 'active') return;
    
    const startTime = call.started_at ? new Date(call.started_at).getTime() : Date.now();
    
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [call.status, call.started_at]);
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const activeParticipants = participants.filter(p => p.status === 'joined');
  const otherParticipant = activeParticipants.find(p => p.employee_id !== currentEmployeeId);
  const callName = otherParticipant?.employee?.profiles?.full_name || 
    (activeParticipants.length > 2 ? `Group call (${activeParticipants.length})` : 'Call');
  
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-[150] bg-background flex flex-col">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 bg-card">
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
              <p className="text-xs text-muted-foreground">
                {formatDuration(callDuration)} • {activeParticipants.length} participant{activeParticipants.length !== 1 ? 's' : ''}
                {isScreenSharing && ' • Screen sharing'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Video grid */}
        <div className="flex-1 bg-muted/50">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            participants={participants}
            currentEmployeeId={currentEmployeeId}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
          />
        </div>
        
        {/* Controls */}
        <div className="h-20 border-t bg-card flex items-center justify-center">
          <CallControls
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isExpanded={isExpanded}
            isScreenSharing={isScreenSharing}
            onToggleMute={onToggleMute}
            onToggleVideo={onToggleVideo}
            onToggleScreenShare={onToggleScreenShare}
            onEndCall={onEndCall}
            onToggleExpand={() => setIsExpanded(false)}
          />
        </div>
      </div>
    );
  }
  
  // Minimized floating window
  return (
    <div 
      className={cn(
        "fixed top-4 right-4 z-[150] w-72 rounded-xl shadow-2xl overflow-hidden",
        "border bg-card animate-in slide-in-from-top-2 duration-300"
      )}
    >
      {/* Drag handle */}
      <div className="h-8 bg-muted/50 flex items-center justify-center cursor-move">
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Preview */}
      <div className="aspect-video bg-muted relative">
        {/* Show local video or avatar */}
        {localStream && !isVideoOff && !isScreenSharing ? (
          <video
            autoPlay
            playsInline
            muted
            ref={(el) => {
              if (el) el.srcObject = localStream;
            }}
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              {isScreenSharing ? (
                <Monitor className="h-8 w-8 mx-auto mb-2 text-primary" />
              ) : call.call_type === 'video' ? (
                <Video className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              ) : (
                <Phone className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {isScreenSharing ? 'Sharing screen' : callName}
              </p>
            </div>
          </div>
        )}
        
        {/* Remote participant PiP */}
        {remoteStreams.size > 0 && (
          <div className="absolute bottom-2 right-2 w-16 h-12 rounded-lg overflow-hidden border-2 border-background shadow-lg bg-muted">
            {Array.from(remoteStreams.values())[0] ? (
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el) el.srcObject = Array.from(remoteStreams.values())[0];
                }}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
        )}
        
        {/* Duration overlay */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 text-xs text-white">
          {formatDuration(callDuration)}
        </div>
        
        {/* Screen share indicator */}
        {isScreenSharing && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-primary/80 text-xs text-white flex items-center gap-1">
            <Monitor className="h-3 w-3" />
            Sharing
          </div>
        )}
        
        {/* Status indicators */}
        {!isScreenSharing && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className={cn(
              "w-2 h-2 rounded-full",
              call.status === 'active' ? "bg-green-500" : "bg-yellow-500 animate-pulse"
            )} />
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="p-3 flex items-center justify-center gap-2">
        <CallControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isExpanded={isExpanded}
          isScreenSharing={isScreenSharing}
          onToggleMute={onToggleMute}
          onToggleVideo={onToggleVideo}
          onToggleScreenShare={onToggleScreenShare}
          onEndCall={onEndCall}
          onToggleExpand={() => setIsExpanded(true)}
          showExpandButton
          className="scale-90"
        />
      </div>
    </div>
  );
};
