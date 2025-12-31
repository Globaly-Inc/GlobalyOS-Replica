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
  className?: string;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  remoteStreams,
  participants,
  currentEmployeeId,
  isMuted,
  isVideoOff,
  className,
}) => {
  const activeParticipants = participants.filter(p => p.status === 'joined');
  const totalParticipants = activeParticipants.length;
  
  // Determine grid layout based on participant count
  const getGridClass = () => {
    switch (totalParticipants) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
      case 4:
        return 'grid-cols-2 grid-rows-2';
      default:
        return 'grid-cols-3';
    }
  };
  
  const getTileClass = () => {
    if (totalParticipants === 1) return 'aspect-video';
    if (totalParticipants === 2) return 'aspect-video';
    return 'aspect-video';
  };
  
  return (
    <div className={cn("grid gap-2 p-2 h-full", getGridClass(), className)}>
      {/* Local participant */}
      {activeParticipants
        .filter(p => p.employee_id === currentEmployeeId)
        .map((participant) => (
          <ParticipantTile
            key={participant.id}
            name={participant.employee?.profiles?.full_name || 'You'}
            avatarUrl={participant.employee?.profiles?.avatar_url}
            stream={localStream}
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isLocal
            className={getTileClass()}
          />
        ))}
      
      {/* Remote participants */}
      {activeParticipants
        .filter(p => p.employee_id !== currentEmployeeId)
        .map((participant) => (
          <ParticipantTile
            key={participant.id}
            name={participant.employee?.profiles?.full_name || 'Participant'}
            avatarUrl={participant.employee?.profiles?.avatar_url}
            stream={remoteStreams.get(participant.employee_id) || null}
            isMuted={participant.is_muted}
            isVideoOff={participant.is_video_off}
            className={getTileClass()}
          />
        ))}
    </div>
  );
};
