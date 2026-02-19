import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import SendBirdCall, { DirectCall, Room, RoomType } from 'sendbird-calls';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

interface IncomingCallInfo {
  call: DirectCall;
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
}

interface SendbirdCallsContextType {
  isReady: boolean;
  isInitializing: boolean;
  activeCall: DirectCall | null;
  activeRoom: Room | null;
  incomingCall: IncomingCallInfo | null;
  startDirectCall: (calleeId: string, isVideoCall: boolean) => Promise<DirectCall | null>;
  createRoom: (roomType: 'small_room_for_video' | 'large_room_for_audio_only') => Promise<Room | null>;
  joinRoom: (roomId: string, audioEnabled: boolean, videoEnabled: boolean) => Promise<Room | null>;
  acceptIncomingCall: (videoEnabled: boolean) => void;
  declineIncomingCall: () => void;
  endCall: () => void;
  clearActiveCall: () => void;
  clearActiveRoom: () => void;
}

const SendbirdCallsContext = createContext<SendbirdCallsContextType | undefined>(undefined);

export const useSendbirdCalls = () => {
  const ctx = useContext(SendbirdCallsContext);
  if (!ctx) {
    throw new Error('useSendbirdCalls must be used within SendbirdCallsProvider');
  }
  return ctx;
};

export const SendbirdCallsProvider = ({ children }: { children: ReactNode }) => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { isEnabled } = useFeatureFlags();
  const callsEnabled = isEnabled('calls');

  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [activeCall, setActiveCall] = useState<DirectCall | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!callsEnabled || !currentEmployee?.id || initializedRef.current) return;

    const init = async () => {
      setIsInitializing(true);
      try {
        // Get session token from edge function
        const { data: sessionData, error } = await supabase.functions.invoke('sb-auth');

        if (error || !sessionData?.app_id || !sessionData?.session_token) {
          console.error('Failed to get Sendbird auth:', error || sessionData);
          return;
        }

        // Initialize SDK
        SendBirdCall.init(sessionData.app_id);

        // Authenticate
        await new Promise<void>((resolve, reject) => {
          SendBirdCall.authenticate(
            { userId: sessionData.user_id, accessToken: sessionData.session_token },
            (result, error) => {
              if (error) reject(error);
              else resolve();
            }
          );
        });

        // Connect WebSocket for incoming calls
        SendBirdCall.connectWebSocket();

        // Register incoming call listener
        SendBirdCall.addListener('GLOBAL_LISTENER', {
          onRinging: (call: DirectCall) => {
            const callerName = call.remoteUser?.nickname || 'Unknown';
            const callerAvatar = call.remoteUser?.profileUrl || undefined;
            const isVideoCall = call.isVideoCall;

            setIncomingCall({
              call,
              callerName,
              callerAvatar,
              isVideoCall,
            });
          },
        });

        initializedRef.current = true;
        setIsReady(true);
      } catch (err) {
        console.error('Sendbird Calls init error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      if (initializedRef.current) {
        SendBirdCall.removeListener('GLOBAL_LISTENER');
        SendBirdCall.deauthenticate();
        initializedRef.current = false;
        setIsReady(false);
      }
    };
  }, [callsEnabled, currentEmployee?.id]);

  const setupCallListeners = useCallback((call: DirectCall) => {
    call.onEstablished = () => {
      setActiveCall(call);
    };
    call.onConnected = () => {
      setActiveCall(call);
    };
    call.onEnded = () => {
      setActiveCall(null);
    };
    call.onRemoteAudioSettingsChanged = () => {
      setActiveCall({ ...call } as DirectCall);
    };
    call.onRemoteVideoSettingsChanged = () => {
      setActiveCall({ ...call } as DirectCall);
    };
  }, []);

  const startDirectCall = useCallback(async (calleeId: string, isVideoCall: boolean): Promise<DirectCall | null> => {
    if (!isReady) return null;

    try {
      const callOption = {
        localMediaView: undefined,
        remoteMediaView: undefined,
        audioEnabled: true,
        videoEnabled: isVideoCall,
      };

      const call = SendBirdCall.dial({
        userId: calleeId,
        isVideoCall,
        callOption,
      }, (call, error) => {
        if (error) {
          console.error('Dial error:', error);
          return;
        }
      });

      setupCallListeners(call);
      setActiveCall(call);
      return call;
    } catch (err) {
      console.error('startDirectCall error:', err);
      return null;
    }
  }, [isReady, setupCallListeners]);

  const createRoom = useCallback(async (roomType: 'small_room_for_video' | 'large_room_for_audio_only'): Promise<Room | null> => {
    if (!isReady) return null;

    try {
      const sbRoomType = roomType === 'small_room_for_video'
        ? RoomType.SMALL_ROOM_FOR_VIDEO
        : RoomType.LARGE_ROOM_FOR_AUDIO_ONLY;

      const room = await SendBirdCall.createRoom({ roomType: sbRoomType });
      return room;
    } catch (err) {
      console.error('createRoom error:', err);
      return null;
    }
  }, [isReady]);

  const joinRoom = useCallback(async (roomId: string, audioEnabled: boolean, videoEnabled: boolean): Promise<Room | null> => {
    if (!isReady) return null;

    try {
      const room = await SendBirdCall.fetchRoomById(roomId);
      await room.enter({
        audioEnabled,
        videoEnabled,
      });
      setActiveRoom(room);
      return room;
    } catch (err) {
      console.error('joinRoom error:', err);
      return null;
    }
  }, [isReady]);

  const acceptIncomingCall = useCallback((videoEnabled: boolean) => {
    if (!incomingCall) return;

    const { call } = incomingCall;
    setupCallListeners(call);
    call.accept({
      callOption: {
        audioEnabled: true,
        videoEnabled,
      },
    });
    setActiveCall(call);
    setIncomingCall(null);
  }, [incomingCall, setupCallListeners]);

  const declineIncomingCall = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.call.end();
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(() => {
    if (activeCall) {
      activeCall.end();
      setActiveCall(null);
    }
    if (activeRoom) {
      activeRoom.exit();
      setActiveRoom(null);
    }
  }, [activeCall, activeRoom]);

  const clearActiveCall = useCallback(() => setActiveCall(null), []);
  const clearActiveRoom = useCallback(() => setActiveRoom(null), []);

  return (
    <SendbirdCallsContext.Provider
      value={{
        isReady,
        isInitializing,
        activeCall,
        activeRoom,
        incomingCall,
        startDirectCall,
        createRoom,
        joinRoom,
        acceptIncomingCall,
        declineIncomingCall,
        endCall,
        clearActiveCall,
        clearActiveRoom,
      }}
    >
      {children}
    </SendbirdCallsContext.Provider>
  );
};
