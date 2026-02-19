import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSendbirdCalls } from '@/providers/SendbirdCallsProvider';
import { toast } from 'sonner';

interface CallButtonsProps {
  /** For DMs: the other participant's employee_id */
  otherEmployeeId?: string;
  /** Whether this is a group/space context */
  isGroup?: boolean;
}

const CallButtons = ({ otherEmployeeId, isGroup }: CallButtonsProps) => {
  const { isReady, isInitializing, startDirectCall, createRoom, joinRoom } = useSendbirdCalls();

  const handleAudioCall = async () => {
    if (!isReady) {
      toast.error('Call service is not ready yet');
      return;
    }

    if (isGroup) {
      const room = await createRoom('large_room_for_audio_only');
      if (room) {
        await joinRoom(room.roomId, true, false);
        toast.success('Audio call started');
      } else {
        toast.error('Failed to start group call');
      }
    } else if (otherEmployeeId) {
      const call = await startDirectCall(otherEmployeeId, false);
      if (!call) {
        toast.error('Failed to start call');
      }
    }
  };

  const handleVideoCall = async () => {
    if (!isReady) {
      toast.error('Call service is not ready yet');
      return;
    }

    if (isGroup) {
      const room = await createRoom('small_room_for_video');
      if (room) {
        await joinRoom(room.roomId, true, true);
        toast.success('Video call started');
      } else {
        toast.error('Failed to start group call');
      }
    } else if (otherEmployeeId) {
      const call = await startDirectCall(otherEmployeeId, true);
      if (!call) {
        toast.error('Failed to start call');
      }
    }
  };

  if (isInitializing) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleAudioCall}
            disabled={!isReady}
          >
            <Phone className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isGroup ? 'Start group audio call' : 'Audio call'}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={handleVideoCall}
            disabled={!isReady}
          >
            <Video className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {isGroup ? 'Start group video call' : 'Video call'}
        </TooltipContent>
      </Tooltip>
    </>
  );
};

export default CallButtons;
