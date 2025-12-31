import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { CallSession, CallParticipant } from '@/types/call';
import { useCurrentEmployee, useCallParticipants, useInitiateCall, useJoinCall, useDeclineCall, useEndCall, useConversationParticipants, useSpaceParticipants } from '@/services/useCall';
import { useWebRTC } from '@/hooks/useWebRTC';
import { IncomingCallDialog } from '@/components/call/IncomingCallDialog';
import { ActiveCallWindow } from '@/components/call/ActiveCallWindow';

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  isInCall: boolean;
  initiateCall: (params: { conversationId?: string; spaceId?: string; callType: 'audio' | 'video' }) => Promise<void>;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [incomingParticipants, setIncomingParticipants] = useState<CallParticipant[]>([]);
  
  const { data: callParticipants = [] } = useCallParticipants(activeCall?.id || null);
  const { data: convParticipants } = useConversationParticipants(activeCall?.conversation_id || null);
  const { data: spaceParticipants } = useSpaceParticipants(activeCall?.space_id || null);
  
  const initiateCallMutation = useInitiateCall();
  const joinCallMutation = useJoinCall();
  const declineCallMutation = useDeclineCall();
  const endCallMutation = useEndCall();
  
  const {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    initializeMedia,
    toggleMute,
    toggleVideo,
    cleanup,
  } = useWebRTC(activeCall?.id || null, callParticipants);
  
  // Listen for incoming calls
  useEffect(() => {
    if (!currentEmployee || !currentOrg) return;
    
    const channel = supabase
      .channel('incoming-calls')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_participants',
        filter: `employee_id=eq.${currentEmployee.id}`,
      }, async (payload) => {
        const participant = payload.new as any;
        if (participant.status !== 'ringing') return;
        if (activeCall) return; // Already in a call
        
        // Fetch call details
        const { data: call } = await supabase
          .from('call_sessions')
          .select('*')
          .eq('id', participant.call_id)
          .single();
        
        if (call && call.initiated_by !== currentEmployee.id) {
          // Fetch participants
          const { data: participants } = await supabase
            .from('call_participants')
            .select('*, employee:employees(id, user_id, position, profiles(full_name, avatar_url))')
            .eq('call_id', call.id);
          
          setIncomingCall(call as CallSession);
          setIncomingParticipants(participants as CallParticipant[] || []);
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [currentEmployee, currentOrg, activeCall]);
  
  // Listen for call status changes
  useEffect(() => {
    if (!activeCall) return;
    
    const channel = supabase
      .channel(`call-status-${activeCall.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_sessions',
        filter: `id=eq.${activeCall.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'ended' || updated.status === 'declined' || updated.status === 'missed') {
          cleanup();
          setActiveCall(null);
        } else {
          setActiveCall(prev => prev ? { ...prev, ...updated } : null);
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [activeCall, cleanup]);
  
  const initiateCall = useCallback(async ({ conversationId, spaceId, callType }: { conversationId?: string; spaceId?: string; callType: 'audio' | 'video' }) => {
    if (!currentEmployee) return;
    
    let participantIds: string[] = [];
    if (conversationId && convParticipants) {
      participantIds = convParticipants.map(p => p.employee_id).filter(id => id !== currentEmployee.id);
    } else if (spaceId && spaceParticipants) {
      participantIds = spaceParticipants.map(p => p.employee_id).filter(id => id !== currentEmployee.id);
    }
    
    const stream = await initializeMedia(callType === 'video');
    const call = await initiateCallMutation.mutateAsync({ conversationId, spaceId, callType, participantIds });
    setActiveCall(call);
  }, [currentEmployee, convParticipants, spaceParticipants, initializeMedia, initiateCallMutation]);
  
  const handleAcceptCall = useCallback(async (withVideo: boolean) => {
    if (!incomingCall) return;
    await initializeMedia(withVideo);
    await joinCallMutation.mutateAsync({ callId: incomingCall.id, withVideo });
    setActiveCall(incomingCall);
    setIncomingCall(null);
    setIncomingParticipants([]);
  }, [incomingCall, initializeMedia, joinCallMutation]);
  
  const handleDeclineCall = useCallback(async () => {
    if (!incomingCall) return;
    await declineCallMutation.mutateAsync(incomingCall.id);
    setIncomingCall(null);
    setIncomingParticipants([]);
  }, [incomingCall, declineCallMutation]);
  
  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;
    cleanup();
    await endCallMutation.mutateAsync(activeCall.id);
    setActiveCall(null);
  }, [activeCall, cleanup, endCallMutation]);
  
  return (
    <CallContext.Provider value={{ activeCall, incomingCall, isInCall: !!activeCall, initiateCall }}>
      {children}
      
      {incomingCall && (
        <IncomingCallDialog
          call={incomingCall}
          participants={incomingParticipants}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}
      
      {activeCall && currentEmployee && (
        <ActiveCallWindow
          call={activeCall}
          participants={callParticipants}
          currentEmployeeId={currentEmployee.id}
          localStream={localStream}
          remoteStreams={remoteStreams}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onEndCall={handleEndCall}
        />
      )}
    </CallContext.Provider>
  );
};
