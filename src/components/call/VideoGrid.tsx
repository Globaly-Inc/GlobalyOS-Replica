import React from 'react';
import { ParticipantTile } from './ParticipantTile';
import { CallParticipant } from '@/types/call';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  participants: CallParticipant[];
  currentEmployeeId: string;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  className?: string;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  remoteStreams,
  participants,
  currentEmployeeId,
  isMuted,
  isVideoOff,
  isScreenSharing,
  className,
}) => {
  const activeParticipants = participants.filter(p => p.status === 'joined');
  const totalParticipants = activeParticipants.length;
  
  const localParticipant = activeParticipants.find(p => p.employee_id === currentEmployeeId);
  const remoteParticipants = activeParticipants.filter(p => p.employee_id !== currentEmployeeId);
  
  // For 1:1 calls, show remote as main with local as PiP (Google Meet style)
  if (totalParticipants === 2 && remoteParticipants.length === 1) {
    const remoteParticipant = remoteParticipants[0];
    const remoteStream = remoteStreams.get(remoteParticipant.employee_id);
    
    return (
      <div className={cn("relative h-full w-full", className)}>
        {/* Remote participant - main view */}
        <ParticipantTile
          name={remoteParticipant.employee?.profiles?.full_name || 'Participant'}
          avatarUrl={remoteParticipant.employee?.profiles?.avatar_url}
          stream={remoteStream || null}
          isMuted={remoteParticipant.is_muted}
          isVideoOff={remoteParticipant.is_video_off}
          className="w-full h-full"
        />
        
        {/* Local participant - PiP in bottom-right corner */}
        {localParticipant && (
          <div className="absolute bottom-4 right-4 w-48 h-36 z-10">
            <ParticipantTile
              name={localParticipant.employee?.profiles?.full_name || 'You'}
              avatarUrl={localParticipant.employee?.profiles?.avatar_url}
              stream={localStream}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isLocal
              isScreenSharing={isScreenSharing}
              isPiP
              className="w-full h-full rounded-xl shadow-2xl border-2 border-background"
            />
          </div>
        )}
      </div>
    );
  }
  
  // For 1 participant (waiting for others to join)
  if (totalParticipants === 1) {
    return (
      <div className={cn("flex items-center justify-center h-full w-full p-4", className)}>
        <div className="w-full max-w-2xl aspect-video">
          <ParticipantTile
            name={localParticipant?.employee?.profiles?.full_name || 'You'}
            avatarUrl={localParticipant?.employee?.profiles?.avatar_url}
            stream={localStream}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isLocal
            isScreenSharing={isScreenSharing}
            className="w-full h-full"
          />
        </div>
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-center">
          <p className="text-muted-foreground text-sm animate-pulse">
            Waiting for others to join...
          </p>
        </div>
      </div>
    );
  }
  
  // For group calls (3+), use grid layout
  const getGridClass = () => {
    switch (totalParticipants) {
      case 3:
        return 'grid-cols-2 grid-rows-2';
      case 4:
        return 'grid-cols-2 grid-rows-2';
      case 5:
      case 6:
        return 'grid-cols-3 grid-rows-2';
      default:
        return 'grid-cols-3 grid-rows-3';
    }
  };
  
  return (
    <div className={cn("grid gap-2 p-4 h-full", getGridClass(), className)}>
      {/* Remote participants first in group calls */}
      {remoteParticipants.map((participant) => (
        <ParticipantTile
          key={participant.id}
          name={participant.employee?.profiles?.full_name || 'Participant'}
          avatarUrl={participant.employee?.profiles?.avatar_url}
          stream={remoteStreams.get(participant.employee_id) || null}
          isMuted={participant.is_muted}
          isVideoOff={participant.is_video_off}
          className="aspect-video"
        />
      ))}
      
      {/* Local participant last in group calls */}
      {localParticipant && (
        <ParticipantTile
          name={localParticipant.employee?.profiles?.full_name || 'You'}
          avatarUrl={localParticipant.employee?.profiles?.avatar_url}
          stream={localStream}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isLocal
          isScreenSharing={isScreenSharing}
          className="aspect-video"
        />
      )}
    </div>
  );
};
