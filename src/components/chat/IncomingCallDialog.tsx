import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSendbirdCalls } from '@/providers/SendbirdCallsProvider';

const IncomingCallDialog = () => {
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useSendbirdCalls();

  if (!incomingCall) return null;

  const { callerName, callerAvatar, isVideoCall } = incomingCall;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="bg-card rounded-2xl shadow-2xl border p-8 w-[340px] text-center">
        {/* Caller info */}
        <div className="mb-6">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={callerAvatar} />
              <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                {getInitials(callerName)}
              </AvatarFallback>
            </Avatar>
            {/* Ringing animation */}
            <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">{callerName}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Incoming {isVideoCall ? 'video' : 'audio'} call...
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6">
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={declineIncomingCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          <Button
            className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-primary-foreground"
            size="icon"
            onClick={() => acceptIncomingCall(isVideoCall)}
          >
            {isVideoCall ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;
