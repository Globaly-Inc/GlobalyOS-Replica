import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CallSession, CallParticipant } from '@/types/call';
import { useRingtone } from '@/hooks/useRingtone';
import { cn } from '@/lib/utils';

interface IncomingCallDialogProps {
  call: CallSession;
  participants: CallParticipant[];
  onAccept: (withVideo: boolean) => void;
  onDecline: () => void;
}

export const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  call,
  participants,
  onAccept,
  onDecline,
}) => {
  const { play, stop } = useRingtone();
  
  // Get caller info
  const caller = participants.find(p => p.employee_id === call.initiated_by);
  const callerName = caller?.employee?.profiles?.full_name || 'Unknown';
  const callerAvatar = caller?.employee?.profiles?.avatar_url;
  const callerInitials = callerName.split(' ').map(n => n[0]).join('').slice(0, 2);
  
  const isGroupCall = participants.length > 2;
  const otherParticipants = participants.filter(p => p.employee_id !== call.initiated_by);
  
  // Play ringtone
  useEffect(() => {
    play();
    return () => stop();
  }, [play, stop]);
  
  // Auto-decline after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      onDecline();
    }, 30000);
    
    return () => clearTimeout(timeout);
  }, [onDecline]);
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm mx-4 bg-card border rounded-2xl shadow-2xl overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        
        {/* Content */}
        <div className="relative p-8 flex flex-col items-center text-center">
          {/* Call type indicator */}
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            {call.call_type === 'video' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span>Incoming {call.call_type} call</span>
          </div>
          
          {/* Caller avatar with pulse animation */}
          <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={callerAvatar || undefined} alt={callerName} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {callerInitials}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Caller name */}
          <h2 className="text-xl font-semibold mb-1">{callerName}</h2>
          <p className="text-sm text-muted-foreground mb-2">
            {caller?.employee?.position || 'Team Member'}
          </p>
          
          {/* Group call info */}
          {isGroupCall && (
            <div className="flex items-center gap-1 mb-4">
              <div className="flex -space-x-2">
                {otherParticipants.slice(0, 3).map((p) => (
                  <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={p.employee?.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {p.employee?.profiles?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                +{otherParticipants.length} others
              </span>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex items-center gap-4 mt-4">
            {/* Decline */}
            <Button
              variant="destructive"
              size="lg"
              className="h-14 w-14 rounded-full p-0"
              onClick={onDecline}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
            
            {/* Accept audio only */}
            <Button
              variant="default"
              size="lg"
              className={cn(
                "h-14 w-14 rounded-full p-0 bg-green-600 hover:bg-green-700",
                call.call_type === 'video' && "h-12 w-12"
              )}
              onClick={() => onAccept(false)}
            >
              <Phone className="h-6 w-6" />
            </Button>
            
            {/* Accept with video (only for video calls) */}
            {call.call_type === 'video' && (
              <Button
                variant="default"
                size="lg"
                className="h-14 w-14 rounded-full p-0 bg-green-600 hover:bg-green-700"
                onClick={() => onAccept(true)}
              >
                <Video className="h-6 w-6" />
              </Button>
            )}
          </div>
          
          {/* Button labels */}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="w-14 text-center">Decline</span>
            <span className={cn("text-center", call.call_type === 'video' ? "w-12" : "w-14")}>
              Audio
            </span>
            {call.call_type === 'video' && (
              <span className="w-14 text-center">Video</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
