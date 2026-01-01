import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CallSession } from '@/types/call';
import { cn } from '@/lib/utils';
import { useRingbackTone } from '@/hooks/useRingbackTone';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface OutgoingCallDialogProps {
  call: CallSession;
  recipientName: string;
  recipientAvatar: string | null;
  onCancel: () => void;
}

export const OutgoingCallDialog: React.FC<OutgoingCallDialogProps> = ({
  call,
  recipientName,
  recipientAvatar,
  onCancel,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [dots, setDots] = useState('');
  const { play: playRingback, stop: stopRingback } = useRingbackTone();
  const { vibrate, stop: stopVibration } = useHapticFeedback();
  
  const recipientInitials = recipientName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2);
  
  // Play ringback tone and haptic pulse
  useEffect(() => {
    playRingback();
    
    // Subtle vibration pulse every 3 seconds while calling
    const vibrationInterval = setInterval(() => {
      vibrate('outgoingPulse');
    }, 3000);
    
    return () => {
      stopRingback();
      stopVibration();
      clearInterval(vibrationInterval);
    };
  }, [playRingback, stopRingback, vibrate, stopVibration]);
  
  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  // Track duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Auto-cancel after 30 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      stopRingback();
      stopVibration();
      onCancel();
    }, 30000);
    return () => clearTimeout(timeout);
  }, [onCancel, stopRingback, stopVibration]);
  
  const handleCancel = () => {
    stopRingback();
    stopVibration();
    onCancel();
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm mx-4 bg-card border rounded-2xl shadow-2xl overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent animate-pulse" />
        
        {/* Animated rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-32 h-32 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute w-48 h-48 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        </div>
        
        {/* Content */}
        <div className="relative p-8 flex flex-col items-center text-center">
          {/* Call type indicator */}
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            {call.call_type === 'video' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Phone className="h-4 w-4" />
            )}
            <span>Outgoing {call.call_type} call</span>
          </div>
          
          {/* Caller avatar with pulse animation */}
          <div className="relative mb-6">
            <div className="absolute -inset-2 rounded-full bg-primary/30 animate-pulse" />
            <Avatar className="h-28 w-28 border-4 border-background shadow-xl relative">
              <AvatarImage src={recipientAvatar || undefined} alt={recipientName} />
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                {recipientInitials}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Calling text */}
          <h2 className="text-xl font-semibold mb-1">
            Calling{dots}
          </h2>
          <p className="text-lg text-foreground mb-2">{recipientName}</p>
          
          {/* Duration */}
          <p className="text-sm text-muted-foreground mb-6">
            {formatDuration(callDuration)}
          </p>
          
          {/* Cancel button */}
          <Button
            variant="destructive"
            size="lg"
            className="h-16 w-16 rounded-full p-0 shadow-lg"
            onClick={handleCancel}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
          
          <p className="text-xs text-muted-foreground mt-3">
            Cancel
          </p>
        </div>
      </div>
    </div>
  );
};
