import React, { useEffect } from 'react';
import { Phone, PhoneOff, Video, Clock } from 'lucide-react';
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
  
  // Play ringtone and vibrate
  useEffect(() => {
    play();
    
    // Continuous vibration pattern
    let vibrationInterval: NodeJS.Timeout | null = null;
    if ('vibrate' in navigator) {
      vibrationInterval = setInterval(() => {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }, 2000);
    }
    
    // Also stop on navigation
    const handlePopState = () => {
      stop();
      if ('vibrate' in navigator) navigator.vibrate(0);
    };
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      stop();
      if (vibrationInterval) clearInterval(vibrationInterval);
      if ('vibrate' in navigator) navigator.vibrate(0);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [play, stop]);
  
  // Auto-decline after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      stop(); // Stop ringtone before declining
      onDecline();
    }, 30000);
    
    return () => clearTimeout(timeout);
  }, [onDecline, stop]);
  
  // Wrapped handlers to ensure ringtone stops FIRST
  const handleAccept = (withVideo: boolean) => {
    stop();
    if ('vibrate' in navigator) navigator.vibrate(0);
    onAccept(withVideo);
  };
  
  const handleDecline = () => {
    stop();
    if ('vibrate' in navigator) navigator.vibrate(0);
    onDecline();
  };
  
  const handleDeclineWithBusy = () => {
    stop();
    if ('vibrate' in navigator) navigator.vibrate(0);
    onDecline();
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm mx-4 bg-card border rounded-2xl shadow-2xl overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-primary/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent animate-pulse" />
        
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
          
          {/* Caller avatar with multiple rings */}
          <div className="relative mb-4">
            <div className="absolute -inset-4 rounded-full border-2 border-green-500/30 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute -inset-2 rounded-full border border-green-500/20 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
            <Avatar className="h-24 w-24 border-4 border-green-500/50 shadow-lg shadow-green-500/20 relative">
              <AvatarImage src={callerAvatar || undefined} alt={callerName} />
              <AvatarFallback className="text-2xl bg-green-600 text-white">
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
            <div className="flex flex-col items-center">
              <Button
                variant="destructive"
                size="lg"
                className="h-14 w-14 rounded-full p-0 shadow-lg"
                onClick={handleDecline}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <span className="text-xs text-muted-foreground mt-2">Decline</span>
            </div>
            
            {/* Busy option */}
            <div className="flex flex-col items-center">
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-12 rounded-full p-0"
                onClick={handleDeclineWithBusy}
              >
                <Clock className="h-5 w-5" />
              </Button>
              <span className="text-xs text-muted-foreground mt-2">Busy</span>
            </div>
            
            {/* Accept audio only */}
            <div className="flex flex-col items-center">
              <Button
                variant="default"
                size="lg"
                className={cn(
                  "rounded-full p-0 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30",
                  call.call_type === 'video' ? "h-12 w-12" : "h-14 w-14"
                )}
                onClick={() => handleAccept(false)}
              >
                <Phone className="h-6 w-6" />
              </Button>
              <span className="text-xs text-muted-foreground mt-2">Audio</span>
            </div>
            
            {/* Accept with video (only for video calls) */}
            {call.call_type === 'video' && (
              <div className="flex flex-col items-center">
                <Button
                  variant="default"
                  size="lg"
                  className="h-14 w-14 rounded-full p-0 bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/30"
                  onClick={() => handleAccept(true)}
                >
                  <Video className="h-6 w-6" />
                </Button>
                <span className="text-xs text-muted-foreground mt-2">Video</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
