import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { CallSession, CallParticipant } from '@/types/call';
import { useCurrentEmployee, useCallParticipants, useInitiateCall, useJoinCall, useDeclineCall, useEndCall } from '@/services/useCall';
import { useWebRTC } from '@/hooks/useWebRTC';
import { IncomingCallDialog } from '@/components/call/IncomingCallDialog';
import { ActiveCallWindow } from '@/components/call/ActiveCallWindow';
import { OutgoingCallDialog } from '@/components/call/OutgoingCallDialog';
import { toast } from 'sonner';

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  outgoingCall: CallSession | null;
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
  const [outgoingCall, setOutgoingCall] = useState<CallSession | null>(null);
  const [incomingParticipants, setIncomingParticipants] = useState<CallParticipant[]>([]);
  const [outgoingRecipientName, setOutgoingRecipientName] = useState<string>('');
  const [outgoingRecipientAvatar, setOutgoingRecipientAvatar] = useState<string | null>(null);
  
  const { data: callParticipants = [] } = useCallParticipants(activeCall?.id || null);
  
  const initiateCallMutation = useInitiateCall();
  const joinCallMutation = useJoinCall();
  const declineCallMutation = useDeclineCall();
  const endCallMutation = useEndCall();
  
  const {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOff,
    isScreenSharing,
    initializeMedia,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
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
          
          // Trigger mobile vibration if supported
          if ('vibrate' in navigator) {
            navigator.vibrate([300, 100, 300, 100, 300, 100, 300]);
          }
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [currentEmployee, currentOrg, activeCall]);
  
  // Listen for call status changes (for active calls)
  // Use a ref to track the current status to avoid stale closure issues
  const activeCallStatusRef = useRef<string | null>(null);
  
  useEffect(() => {
    activeCallStatusRef.current = activeCall?.status || null;
  }, [activeCall?.status]);
  
  useEffect(() => {
    if (!activeCall) return;
    
    console.log('[CallContext] Setting up call status listener for:', activeCall.id, 'status:', activeCall.status);
    
    const channel = supabase
      .channel(`call-status-${activeCall.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_sessions',
        filter: `id=eq.${activeCall.id}`,
      }, (payload) => {
        const updated = payload.new as any;
        console.log('[CallContext] Call status update received:', updated.status, 'previous:', activeCallStatusRef.current);
        
        if (updated.status === 'ended' || updated.status === 'declined' || updated.status === 'missed') {
          cleanup();
          setActiveCall(null);
          setOutgoingCall(null);
          toast.info('Call ended');
        } else if (updated.status === 'active') {
          // Always update to active, regardless of previous state
          console.log('[CallContext] Call is now active');
          setActiveCall(prev => prev ? { ...prev, ...updated } : null);
          setOutgoingCall(null);
          if (activeCallStatusRef.current === 'ringing') {
            toast.success('Call connected');
          }
        } else {
          setActiveCall(prev => prev ? { ...prev, ...updated } : null);
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [activeCall?.id, cleanup]);
  
  // Polling fallback: ensure activeCall status is synced with DB
  useEffect(() => {
    if (!activeCall || activeCall.status === 'active') return;
    
    console.log('[CallContext] Starting poll for call status, current:', activeCall.status);
    
    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', activeCall.id)
        .single();
      
      if (data && data.status !== activeCall.status) {
        console.log('[CallContext] Poll detected status change:', data.status);
        if (data.status === 'active') {
          setActiveCall({ ...activeCall, ...data } as CallSession);
          setOutgoingCall(null);
        } else if (data.status === 'ended' || data.status === 'declined') {
          cleanup();
          setActiveCall(null);
          setOutgoingCall(null);
        }
      }
    }, 1000);
    
    return () => clearInterval(pollInterval);
  }, [activeCall?.id, activeCall?.status, cleanup]);
  
  // Listen for participant status changes (for outgoing calls)
  useEffect(() => {
    if (!outgoingCall || !currentEmployee) return;
    
    const channel = supabase
      .channel(`outgoing-call-${outgoingCall.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_participants',
        filter: `call_id=eq.${outgoingCall.id}`,
      }, async (payload) => {
        const updated = payload.new as any;
        
        // If someone joined, the call is active
        if (updated.status === 'joined' && updated.employee_id !== currentEmployee.id) {
          setOutgoingCall(null);
        }
        
        // If all participants declined
        if (updated.status === 'declined' || updated.status === 'missed') {
          const { data: participants } = await supabase
            .from('call_participants')
            .select('status')
            .eq('call_id', outgoingCall.id)
            .neq('employee_id', currentEmployee.id);
          
          const allDeclined = participants?.every(p => p.status === 'declined' || p.status === 'missed');
          if (allDeclined) {
            cleanup();
            setActiveCall(null);
            setOutgoingCall(null);
            toast.error('No answer');
          }
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [outgoingCall, currentEmployee, cleanup]);
  
  // FIX: Fetch participants directly instead of using hooks that depend on activeCall
  const initiateCall = useCallback(async ({ conversationId, spaceId, callType }: { conversationId?: string; spaceId?: string; callType: 'audio' | 'video' }) => {
    if (!currentEmployee || !currentOrg) return;
    
    let participantIds: string[] = [];
    let recipientName = '';
    let recipientAvatar: string | null = null;
    
    // Fetch participants directly from database
    if (conversationId) {
      const { data } = await supabase
        .from('chat_participants')
        .select('employee_id, employee:employees(id, profiles(full_name, avatar_url))')
        .eq('conversation_id', conversationId);
      
      if (data) {
        participantIds = data
          .map(p => p.employee_id)
          .filter(id => id !== currentEmployee.id);
        
        // Get recipient info for outgoing call UI
        const recipient = data.find(p => p.employee_id !== currentEmployee.id);
        if (recipient?.employee?.profiles) {
          recipientName = recipient.employee.profiles.full_name || 'Unknown';
          recipientAvatar = recipient.employee.profiles.avatar_url || null;
        }
      }
    } else if (spaceId) {
      const { data } = await supabase
        .from('chat_space_members')
        .select('employee_id, employee:employees(id, profiles(full_name, avatar_url))')
        .eq('space_id', spaceId);
      
      if (data) {
        participantIds = data
          .map(p => p.employee_id)
          .filter(id => id !== currentEmployee.id);
        
        recipientName = `Group call (${participantIds.length + 1} participants)`;
      }
    }
    
    if (participantIds.length === 0) {
      toast.error('No participants to call');
      return;
    }
    
    try {
      toast.loading(`Starting ${callType} call...`, { id: 'call-init' });
      
      const stream = await initializeMedia(callType === 'video');
      const call = await initiateCallMutation.mutateAsync({ conversationId, spaceId, callType, participantIds });
      
      toast.dismiss('call-init');
      toast.info(`Calling ${recipientName || 'participants'}...`);
      
      setActiveCall(call);
      setOutgoingCall(call);
      setOutgoingRecipientName(recipientName);
      setOutgoingRecipientAvatar(recipientAvatar);
      
      // Send push notifications to all participants
      for (const participantId of participantIds) {
        const { data: employee } = await supabase
          .from('employees')
          .select('user_id')
          .eq('id', participantId)
          .single();
        
        if (employee) {
          // Call the push notification function
          supabase.functions.invoke('send-call-notification', {
            body: {
              to_user_id: employee.user_id,
              caller_name: currentEmployee.profiles?.full_name || 'Someone',
              caller_avatar: currentEmployee.profiles?.avatar_url,
              call_type: callType,
              call_id: call.id,
              organization_slug: currentOrg.slug
            }
          }).catch(console.error);
        }
      }
    } catch (error) {
      toast.dismiss('call-init');
      toast.error('Failed to start call');
      console.error('Error initiating call:', error);
    }
  }, [currentEmployee, currentOrg, initializeMedia, initiateCallMutation]);
  
  const handleAcceptCall = useCallback(async (withVideo: boolean) => {
    if (!incomingCall) return;
    
    // Stop vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    
    try {
      await initializeMedia(withVideo);
      await joinCallMutation.mutateAsync({ callId: incomingCall.id, withVideo });
      
      // FIX: Set activeCall with 'active' status immediately so ActiveCallWindow renders
      setActiveCall({
        ...incomingCall,
        status: 'active',
        started_at: new Date().toISOString(),
      });
      setIncomingCall(null);
      setIncomingParticipants([]);
      toast.success('Call connected');
      
      // Dismiss the push notification
      supabase.functions.invoke('dismiss-call-notification', {
        body: { call_id: incomingCall.id }
      }).catch(console.error);
    } catch (error) {
      toast.error('Failed to join call');
      console.error('Error accepting call:', error);
    }
  }, [incomingCall, initializeMedia, joinCallMutation]);
  
  const handleDeclineCall = useCallback(async () => {
    if (!incomingCall) return;
    
    // Stop vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    
    await declineCallMutation.mutateAsync(incomingCall.id);
    setIncomingCall(null);
    setIncomingParticipants([]);
    
    // Dismiss the push notification
    supabase.functions.invoke('dismiss-call-notification', {
      body: { call_id: incomingCall.id }
    }).catch(console.error);
  }, [incomingCall, declineCallMutation]);
  
  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;
    cleanup();
    await endCallMutation.mutateAsync(activeCall.id);
    setActiveCall(null);
    setOutgoingCall(null);
    toast.info('Call ended');
  }, [activeCall, cleanup, endCallMutation]);
  
  const handleCancelOutgoing = useCallback(async () => {
    if (!outgoingCall) return;
    cleanup();
    await endCallMutation.mutateAsync(outgoingCall.id);
    setActiveCall(null);
    setOutgoingCall(null);
    toast.info('Call cancelled');
  }, [outgoingCall, cleanup, endCallMutation]);
  
  const handleToggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);
  
  return (
    <CallContext.Provider value={{ activeCall, incomingCall, outgoingCall, isInCall: !!activeCall, initiateCall }}>
      {children}
      
      {incomingCall && (
        <IncomingCallDialog
          call={incomingCall}
          participants={incomingParticipants}
          onAccept={handleAcceptCall}
          onDecline={handleDeclineCall}
        />
      )}
      
      {outgoingCall && activeCall?.status === 'ringing' && (
        <OutgoingCallDialog
          call={outgoingCall}
          recipientName={outgoingRecipientName}
          recipientAvatar={outgoingRecipientAvatar}
          onCancel={handleCancelOutgoing}
        />
      )}
      
      {activeCall && currentEmployee && activeCall.status === 'active' && (
        <ActiveCallWindow
          call={activeCall}
          participants={callParticipants}
          currentEmployeeId={currentEmployee.id}
          localStream={localStream}
          remoteStreams={remoteStreams}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onEndCall={handleEndCall}
        />
      )}
    </CallContext.Provider>
  );
};
