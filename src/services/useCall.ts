import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { CallSession, CallParticipant, CallSignal } from '@/types/call';

// Get current employee
export const useCurrentEmployee = () => {
  const { currentOrg } = useOrganization();
  
  return useQuery({
    queryKey: ['current-employee', currentOrg?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentOrg) return null;
      
      const { data, error } = await supabase
        .from('employees')
        .select('id, user_id, position, profiles(full_name, avatar_url)')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrg.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });
};

// Get active call for current user
export const useActiveCall = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useQuery({
    queryKey: ['active-call', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg || !currentEmployee) return null;
      
      const { data, error } = await supabase
        .from('call_participants')
        .select(`
          call_id,
          status,
          call_sessions!inner(
            id,
            organization_id,
            conversation_id,
            space_id,
            call_type,
            status,
            initiated_by,
            started_at,
            created_at
          )
        `)
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id)
        .in('status', ['ringing', 'joined'])
        .in('call_sessions.status', ['ringing', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      return data.call_sessions as unknown as CallSession;
    },
    enabled: !!currentOrg && !!currentEmployee,
    refetchInterval: 5000,
  });
};

// Get participants for a call
export const useCallParticipants = (callId: string | null) => {
  return useQuery({
    queryKey: ['call-participants', callId],
    queryFn: async () => {
      if (!callId) return [];
      
      const { data, error } = await supabase
        .from('call_participants')
        .select(`
          *,
          employee:employees(
            id,
            user_id,
            position,
            profiles(full_name, avatar_url)
          )
        `)
        .eq('call_id', callId)
        .in('status', ['ringing', 'joined']);
      
      if (error) throw error;
      return data as CallParticipant[];
    },
    enabled: !!callId,
    refetchInterval: 2000,
  });
};

// Initiate a new call
export const useInitiateCall = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useMutation({
    mutationFn: async ({
      conversationId,
      spaceId,
      callType,
      participantIds,
    }: {
      conversationId?: string;
      spaceId?: string;
      callType: 'audio' | 'video';
      participantIds: string[];
    }) => {
      if (!currentOrg || !currentEmployee) throw new Error('Not authenticated');
      
      // Create call session
      const { data: callSession, error: callError } = await supabase
        .from('call_sessions')
        .insert({
          organization_id: currentOrg.id,
          conversation_id: conversationId || null,
          space_id: spaceId || null,
          call_type: callType,
          initiated_by: currentEmployee.id,
          status: 'ringing',
        })
        .select()
        .single();
      
      if (callError) throw callError;
      
      // Add all participants including initiator
      const allParticipants = [...new Set([currentEmployee.id, ...participantIds])];
      const participantInserts = allParticipants.map(empId => ({
        call_id: callSession.id,
        employee_id: empId,
        organization_id: currentOrg.id,
        status: empId === currentEmployee.id ? 'joined' : 'ringing',
        joined_at: empId === currentEmployee.id ? new Date().toISOString() : null,
      }));
      
      const { error: participantError } = await supabase
        .from('call_participants')
        .insert(participantInserts);
      
      if (participantError) throw participantError;
      
      return callSession as CallSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-call'] });
    },
  });
};

// Join a call (accept incoming)
export const useJoinCall = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useMutation({
    mutationFn: async ({ callId, withVideo }: { callId: string; withVideo: boolean }) => {
      if (!currentEmployee) throw new Error('Not authenticated');
      
      // Update participant status
      const { error: participantError } = await supabase
        .from('call_participants')
        .update({
          status: 'joined',
          joined_at: new Date().toISOString(),
          is_video_off: !withVideo,
        })
        .eq('call_id', callId)
        .eq('employee_id', currentEmployee.id);
      
      if (participantError) throw participantError;
      
      // Check if this is the first person joining after initiator
      const { data: participants } = await supabase
        .from('call_participants')
        .select('status')
        .eq('call_id', callId)
        .eq('status', 'joined');
      
      // If more than one person has joined, set call to active
      if (participants && participants.length >= 2) {
        await supabase
          .from('call_sessions')
          .update({
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .eq('id', callId);
      }
      
      return { callId, withVideo };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-call'] });
      queryClient.invalidateQueries({ queryKey: ['call-participants'] });
    },
  });
};

// Decline a call
export const useDeclineCall = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useMutation({
    mutationFn: async (callId: string) => {
      if (!currentEmployee) throw new Error('Not authenticated');
      
      // Update participant status
      await supabase
        .from('call_participants')
        .update({ status: 'declined' })
        .eq('call_id', callId)
        .eq('employee_id', currentEmployee.id);
      
      // Check if all participants declined
      const { data: ringing } = await supabase
        .from('call_participants')
        .select('id')
        .eq('call_id', callId)
        .eq('status', 'ringing');
      
      if (!ringing || ringing.length === 0) {
        await supabase
          .from('call_sessions')
          .update({ status: 'declined', ended_at: new Date().toISOString() })
          .eq('id', callId);
      }
      
      return callId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-call'] });
    },
  });
};

// End a call
export const useEndCall = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useMutation({
    mutationFn: async (callId: string) => {
      if (!currentEmployee) throw new Error('Not authenticated');
      
      // Update participant to left
      await supabase
        .from('call_participants')
        .update({
          status: 'left',
          left_at: new Date().toISOString(),
        })
        .eq('call_id', callId)
        .eq('employee_id', currentEmployee.id);
      
      // Check remaining active participants
      const { data: active } = await supabase
        .from('call_participants')
        .select('id')
        .eq('call_id', callId)
        .eq('status', 'joined');
      
      // If no one left or only one person, end the call
      if (!active || active.length <= 1) {
        await supabase
          .from('call_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString(),
          })
          .eq('id', callId);
        
        // Mark remaining as missed/left
        await supabase
          .from('call_participants')
          .update({ status: 'left', left_at: new Date().toISOString() })
          .eq('call_id', callId)
          .in('status', ['ringing', 'joined']);
      }
      
      return callId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-call'] });
      queryClient.invalidateQueries({ queryKey: ['call-participants'] });
    },
  });
};

// Toggle mute
export const useToggleMute = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useMutation({
    mutationFn: async ({ callId, isMuted }: { callId: string; isMuted: boolean }) => {
      if (!currentEmployee) throw new Error('Not authenticated');
      
      await supabase
        .from('call_participants')
        .update({ is_muted: isMuted })
        .eq('call_id', callId)
        .eq('employee_id', currentEmployee.id);
      
      return { callId, isMuted };
    },
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: ['call-participants', callId] });
    },
  });
};

// Toggle video
export const useToggleVideo = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useMutation({
    mutationFn: async ({ callId, isVideoOff }: { callId: string; isVideoOff: boolean }) => {
      if (!currentEmployee) throw new Error('Not authenticated');
      
      await supabase
        .from('call_participants')
        .update({ is_video_off: isVideoOff })
        .eq('call_id', callId)
        .eq('employee_id', currentEmployee.id);
      
      return { callId, isVideoOff };
    },
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({ queryKey: ['call-participants', callId] });
    },
  });
};

// Send signaling data
export const useSendSignal = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  
  return useMutation({
    mutationFn: async ({
      callId,
      toEmployeeId,
      signalType,
      signalData,
    }: {
      callId: string;
      toEmployeeId: string;
      signalType: 'offer' | 'answer' | 'ice-candidate';
      signalData: RTCSessionDescriptionInit | RTCIceCandidateInit;
    }) => {
      if (!currentOrg || !currentEmployee) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('call_signaling')
        .insert({
          call_id: callId,
          from_employee_id: currentEmployee.id,
          to_employee_id: toEmployeeId,
          organization_id: currentOrg.id,
          signal_type: signalType,
          signal_data: signalData as unknown as Record<string, unknown>,
        } as any);
      
      if (error) throw error;
    },
  });
};

// Get conversation participants for initiating calls
export const useConversationParticipants = (conversationId: string | null) => {
  return useQuery({
    queryKey: ['conversation-participants', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          employee_id,
          employee:employees(
            id,
            user_id,
            position,
            profiles(full_name, avatar_url)
          )
        `)
        .eq('conversation_id', conversationId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });
};

// Get space members for initiating calls
export const useSpaceParticipants = (spaceId: string | null) => {
  return useQuery({
    queryKey: ['space-participants-for-call', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      
      const { data, error } = await supabase
        .from('chat_space_members')
        .select(`
          employee_id,
          employee:employees(
            id,
            user_id,
            position,
            profiles(full_name, avatar_url)
          )
        `)
        .eq('space_id', spaceId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!spaceId,
  });
};
