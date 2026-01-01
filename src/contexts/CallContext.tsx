import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { CallSession, CallParticipant } from '@/types/call';
import { useCurrentEmployee, useCallParticipants, useInitiateCall, useJoinCall, useDeclineCall, useEndCall, useCreateCallLogMessage } from '@/services/useCall';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { IncomingCallDialog } from '@/components/call/IncomingCallDialog';
import { ActiveCallWindow } from '@/components/call/ActiveCallWindow';
import { OutgoingCallDialog } from '@/components/call/OutgoingCallDialog';
import { CallOverlayPortal } from '@/components/call/CallOverlayPortal';
import { toast } from 'sonner';

type CallWindowMode = 'minimized' | 'floating' | 'fullscreen';

interface CallUiState {
  isOpen: boolean;
  windowMode: CallWindowMode;
  focusNonce: number;
}

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  outgoingCall: CallSession | null;
  isInCall: boolean;
  callDuration: number;
  callUiState: CallUiState;
  initiateCall: (params: { conversationId?: string; spaceId?: string; callType: 'audio' | 'video' }) => Promise<void>;
  openCallUI: () => void;
  minimizeCallUI: () => void;
  setCallWindowMode: (mode: CallWindowMode) => void;
  bringCallToFront: () => void;
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
  const [callDuration, setCallDuration] = useState(0);
  const { vibrate } = useHapticFeedback();
  
  // Call UI state - separate from call existence
  const [callUiState, setCallUiState] = useState<CallUiState>({
    isOpen: true,
    windowMode: 'floating',
    focusNonce: 0,
  });
  
  const { data: callParticipants = [] } = useCallParticipants(activeCall?.id || null);
  
  const initiateCallMutation = useInitiateCall();
  const joinCallMutation = useJoinCall();
  const declineCallMutation = useDeclineCall();
  const endCallMutation = useEndCall();
  const createCallLogMessage = useCreateCallLogMessage();
  
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
  
  // Call UI control functions
  const openCallUI = useCallback(() => {
    console.log('[CallContext] openCallUI called');
    setCallUiState(prev => ({ ...prev, isOpen: true, windowMode: 'floating' }));
  }, []);
  
  const minimizeCallUI = useCallback(() => {
    console.log('[CallContext] minimizeCallUI called');
    setCallUiState(prev => ({ ...prev, windowMode: 'minimized' }));
  }, []);
  
  const setCallWindowMode = useCallback((mode: CallWindowMode) => {
    console.log('[CallContext] setCallWindowMode:', mode);
    setCallUiState(prev => ({ ...prev, windowMode: mode, isOpen: true }));
  }, []);
  
  const bringCallToFront = useCallback(() => {
    console.log('[CallContext] bringCallToFront called');
    setCallUiState(prev => ({ 
      ...prev, 
      isOpen: true, 
      windowMode: prev.windowMode === 'minimized' ? 'floating' : prev.windowMode,
      focusNonce: prev.focusNonce + 1 
    }));
  }, []);
  
  // Track call duration
  useEffect(() => {
    if (!activeCall || (activeCall.status !== 'active' && activeCall.status !== 'ringing')) {
      setCallDuration(0);
      return;
    }
    
    const startTime = activeCall.started_at ? new Date(activeCall.started_at).getTime() : Date.now();
    
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [activeCall?.id, activeCall?.status, activeCall?.started_at]);
  
  // Reset UI state when call ends
  useEffect(() => {
    if (!activeCall) {
      setCallUiState({ isOpen: true, windowMode: 'floating', focusNonce: 0 });
    }
  }, [activeCall]);
  
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
          vibrate('callEnded');
          cleanup();
          setActiveCall(null);
          setOutgoingCall(null);
          toast.info('Call ended');
        } else if (updated.status === 'active') {
          console.log('[CallContext] Call is now active');
          vibrate('callConnected');
          setActiveCall(prev => prev ? { ...prev, ...updated } : null);
          setOutgoingCall(null);
          // Ensure UI is open when call becomes active
          setCallUiState(prev => ({ ...prev, isOpen: true }));
          if (activeCallStatusRef.current === 'ringing') {
            toast.success('Call connected');
          }
        } else {
          setActiveCall(prev => prev ? { ...prev, ...updated } : null);
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [activeCall?.id, cleanup, vibrate]);
  
  // Aggressive polling fallback: detect when receiver joins even if realtime fails
  useEffect(() => {
    if (!outgoingCall || !currentEmployee) return;
    
    console.log('[CallContext] Starting aggressive poll for outgoing call:', outgoingCall.id);
    
    const pollInterval = setInterval(async () => {
      // Check if any participant has joined
      const { data: participants } = await supabase
        .from('call_participants')
        .select('status, employee_id')
        .eq('call_id', outgoingCall.id);
      
      const otherJoined = participants?.some(
        p => p.employee_id !== currentEmployee.id && p.status === 'joined'
      );
      
      if (otherJoined) {
        console.log('[CallContext] Poll detected participant joined!');
        vibrate('callConnected');
        
        // Force transition to active
        const activeCallData: CallSession = {
          ...outgoingCall,
          status: 'active',
          started_at: new Date().toISOString(),
        };
        
        setActiveCall(activeCallData);
        setOutgoingCall(null);
        // Ensure UI is open
        setCallUiState(prev => ({ ...prev, isOpen: true, windowMode: 'floating' }));
        toast.success('Call connected');
      }
      
      // Also check if call was ended/declined
      const { data: callData } = await supabase
        .from('call_sessions')
        .select('status')
        .eq('id', outgoingCall.id)
        .single();
      
      if (callData?.status === 'ended' || callData?.status === 'declined') {
        console.log('[CallContext] Poll detected call ended');
        cleanup();
        setActiveCall(null);
        setOutgoingCall(null);
      }
    }, 500);
    
    return () => clearInterval(pollInterval);
  }, [outgoingCall?.id, currentEmployee?.id, cleanup, vibrate]);
  
  // Also poll for activeCall status changes (as fallback)
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
          setCallUiState(prev => ({ ...prev, isOpen: true }));
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
    
    console.log('[CallContext] Setting up outgoing call listener for:', outgoingCall.id);
    
    const channel = supabase
      .channel(`outgoing-call-${outgoingCall.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_participants',
        filter: `call_id=eq.${outgoingCall.id}`,
      }, async (payload) => {
        const updated = payload.new as any;
        console.log('[CallContext] Participant update:', updated.status, 'employee:', updated.employee_id);
        
        // If someone joined, the call is active - update local state immediately
        if (updated.status === 'joined' && updated.employee_id !== currentEmployee.id) {
          console.log('[CallContext] Receiver joined call, setting active immediately');
          vibrate('callConnected');
          
          const activeCallData: CallSession = {
            ...outgoingCall,
            status: 'active',
            started_at: new Date().toISOString(),
          };
          
          setActiveCall(activeCallData);
          setOutgoingCall(null);
          // Ensure UI is open
          setCallUiState(prev => ({ ...prev, isOpen: true, windowMode: 'floating' }));
          toast.success('Call connected');
        }
        
        // If all participants declined
        if (updated.status === 'declined' || updated.status === 'missed') {
          const { data: participants } = await supabase
            .from('call_participants')
            .select('status, employee:employees(profiles(full_name, avatar_url))')
            .eq('call_id', outgoingCall.id)
            .neq('employee_id', currentEmployee.id);
          
          const allDeclined = participants?.every(p => p.status === 'declined' || p.status === 'missed');
          if (allDeclined) {
            try {
              await createCallLogMessage.mutateAsync({
                callId: outgoingCall.id,
                conversationId: outgoingCall.conversation_id,
                spaceId: outgoingCall.space_id,
                callType: outgoingCall.call_type as 'audio' | 'video',
                status: 'declined',
                participants: participants?.map(p => ({
                  name: p.employee?.profiles?.full_name || 'Unknown',
                  avatar: p.employee?.profiles?.avatar_url || null,
                })) || [],
              });
            } catch (error) {
              console.error('Failed to create declined call log:', error);
            }
            
            cleanup();
            setActiveCall(null);
            setOutgoingCall(null);
            toast.error('No answer');
          }
        }
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [outgoingCall, currentEmployee, cleanup, createCallLogMessage, vibrate]);
  
  const initiateCall = useCallback(async ({ conversationId, spaceId, callType }: { conversationId?: string; spaceId?: string; callType: 'audio' | 'video' }) => {
    if (!currentEmployee || !currentOrg) return;
    
    let participantIds: string[] = [];
    let recipientName = '';
    let recipientAvatar: string | null = null;
    
    if (conversationId) {
      const { data } = await supabase
        .from('chat_participants')
        .select('employee_id, employee:employees(id, profiles(full_name, avatar_url))')
        .eq('conversation_id', conversationId);
      
      if (data) {
        participantIds = data
          .map(p => p.employee_id)
          .filter(id => id !== currentEmployee.id);
        
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
      // Ensure UI is open for outgoing call
      setCallUiState({ isOpen: true, windowMode: 'floating', focusNonce: 0 });
      
      // Send push notifications to all participants
      for (const participantId of participantIds) {
        const { data: employee } = await supabase
          .from('employees')
          .select('user_id')
          .eq('id', participantId)
          .single();
        
        if (employee) {
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
    
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    
    try {
      await initializeMedia(withVideo);
      await joinCallMutation.mutateAsync({ callId: incomingCall.id, withVideo });
      
      setActiveCall({
        ...incomingCall,
        status: 'active',
        started_at: new Date().toISOString(),
      });
      setIncomingCall(null);
      setIncomingParticipants([]);
      // Ensure UI is open
      setCallUiState({ isOpen: true, windowMode: 'floating', focusNonce: 0 });
      toast.success('Call connected');
      
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
    
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
    
    await declineCallMutation.mutateAsync(incomingCall.id);
    setIncomingCall(null);
    setIncomingParticipants([]);
    
    supabase.functions.invoke('dismiss-call-notification', {
      body: { call_id: incomingCall.id }
    }).catch(console.error);
  }, [incomingCall, declineCallMutation]);
  
  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;
    
    const wasActive = activeCall.status === 'active' && activeCall.started_at;
    const durationSeconds = wasActive 
      ? Math.floor((Date.now() - new Date(activeCall.started_at!).getTime()) / 1000)
      : undefined;
    
    const participantNames = callParticipants.map(p => ({
      name: p.employee?.profiles?.full_name || 'Unknown',
      avatar: p.employee?.profiles?.avatar_url || null,
    }));
    
    try {
      await createCallLogMessage.mutateAsync({
        callId: activeCall.id,
        conversationId: activeCall.conversation_id,
        spaceId: activeCall.space_id,
        callType: activeCall.call_type as 'audio' | 'video',
        status: wasActive ? 'ended' : 'missed',
        durationSeconds,
        participants: participantNames,
      });
    } catch (error) {
      console.error('Failed to create call log message:', error);
    }
    
    cleanup();
    await endCallMutation.mutateAsync(activeCall.id);
    
    setActiveCall(null);
    setOutgoingCall(null);
    toast.info('Call ended');
  }, [activeCall, callParticipants, cleanup, endCallMutation, createCallLogMessage]);
  
  const handleCancelOutgoing = useCallback(async () => {
    if (!outgoingCall) return;
    
    try {
      const { data: participants } = await supabase
        .from('call_participants')
        .select('employee:employees(profiles(full_name, avatar_url))')
        .eq('call_id', outgoingCall.id)
        .neq('employee_id', currentEmployee?.id);
      
      await createCallLogMessage.mutateAsync({
        callId: outgoingCall.id,
        conversationId: outgoingCall.conversation_id,
        spaceId: outgoingCall.space_id,
        callType: outgoingCall.call_type as 'audio' | 'video',
        status: 'missed',
        participants: participants?.map(p => ({
          name: p.employee?.profiles?.full_name || 'Unknown',
          avatar: p.employee?.profiles?.avatar_url || null,
        })) || [],
      });
    } catch (error) {
      console.error('Failed to create missed call log:', error);
    }
    
    cleanup();
    await endCallMutation.mutateAsync(outgoingCall.id);
    setActiveCall(null);
    setOutgoingCall(null);
    toast.info('Call cancelled');
  }, [outgoingCall, currentEmployee, cleanup, endCallMutation, createCallLogMessage]);
  
  const handleToggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);
  
  // Determine if we should show the active call window
  const shouldShowActiveCallWindow = activeCall && 
    currentEmployee && 
    callUiState.isOpen &&
    (activeCall.status === 'active' || 
      (activeCall.status === 'ringing' && callParticipants.some(p => 
        p.employee_id !== currentEmployee.id && p.status === 'joined'
      )));
  
  // Get participant name for the indicator
  const activeParticipants = callParticipants.filter(p => p.status === 'joined');
  const otherParticipant = activeParticipants.find(p => p.employee_id !== currentEmployee?.id);
  const participantName = otherParticipant?.employee?.profiles?.full_name || 
    (activeParticipants.length > 2 ? `Group call (${activeParticipants.length})` : undefined);
  
  console.log('[CallContext] Render state:', {
    activeCall: activeCall?.id,
    activeCallStatus: activeCall?.status,
    currentEmployee: currentEmployee?.id,
    callUiState,
    shouldShowActiveCallWindow,
    outgoingCall: outgoingCall?.id,
    incomingCall: incomingCall?.id,
  });
  
  return (
    <CallContext.Provider value={{ 
      activeCall, 
      incomingCall, 
      outgoingCall, 
      isInCall: !!activeCall,
      callDuration,
      callUiState,
      initiateCall,
      openCallUI,
      minimizeCallUI,
      setCallWindowMode,
      bringCallToFront,
    }}>
      {children}
      
      {/* Use Portal to render call UI at document.body level */}
      <CallOverlayPortal>
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
        
        {shouldShowActiveCallWindow && currentEmployee && (
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
            windowMode={callUiState.windowMode}
            onWindowModeChange={setCallWindowMode}
            focusNonce={callUiState.focusNonce}
          />
        )}
      </CallOverlayPortal>
    </CallContext.Provider>
  );
};
