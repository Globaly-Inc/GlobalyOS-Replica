/**
 * Member Mutation Hooks
 * Add, remove, update roles for space and conversation members
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useAddSpaceMembers = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeIds,
      employeeNames,
    }: {
      spaceId: string;
      employeeIds: string[];
      employeeNames?: string[];
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const members = employeeIds.map((empId) => ({
        space_id: spaceId,
        employee_id: empId,
        organization_id: currentOrg.id,
        role: 'member' as const,
        source: 'manual' as const,
      }));

      const { error } = await supabase
        .from('chat_space_members')
        .insert(members);

      if (error) throw error;

      if (employeeNames?.length) {
        const actorName = currentEmployee.profiles?.full_name || 'Someone';
        
        for (let i = 0; i < employeeIds.length; i++) {
          const empId = employeeIds[i];
          const empName = employeeNames[i] || 'Someone';

          await supabase.from('chat_messages').insert({
            organization_id: currentOrg.id,
            space_id: spaceId,
            sender_id: currentEmployee.id,
            content: `${empName} was added by ${actorName}`,
            content_type: 'system_event',
            system_event_data: {
              event_type: 'member_added',
              target_employee_id: empId,
              target_name: empName,
              actor_employee_id: currentEmployee.id,
              actor_name: actorName,
              source: 'manual'
            }
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};

export const useUpdateSpaceMemberRole = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeId,
      employeeName,
      role,
    }: {
      spaceId: string;
      employeeId: string;
      employeeName?: string;
      role: 'admin' | 'member';
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_space_members')
        .update({ role })
        .eq('space_id', spaceId)
        .eq('employee_id', employeeId);

      if (error) throw error;

      if (employeeName) {
        const eventType = role === 'admin' ? 'admin_added' : 'admin_removed';
        const actorName = currentEmployee.profiles?.full_name || 'Someone';

        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: role === 'admin' 
            ? `${employeeName} was made an admin`
            : `${employeeName} is no longer an admin`,
          content_type: 'system_event',
          system_event_data: {
            event_type: eventType,
            target_employee_id: employeeId,
            target_name: employeeName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};

export const useRemoveSpaceMember = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      employeeId,
      employeeName,
    }: {
      spaceId: string;
      employeeId: string;
      employeeName?: string;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      if (employeeName) {
        const actorName = currentEmployee.profiles?.full_name || 'Someone';

        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: `${employeeName} was removed by ${actorName}`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'member_removed',
            target_employee_id: employeeId,
            target_name: employeeName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName,
            source: 'manual'
          }
        });
      }

      const { error } = await supabase
        .from('chat_space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};

export const useAddGroupMembers = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      employeeIds,
      employeeNames
    }: { 
      conversationId: string; 
      employeeIds: string[];
      employeeNames: string[];
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_participants')
        .insert(
          employeeIds.map(empId => ({
            conversation_id: conversationId,
            employee_id: empId,
            organization_id: currentOrg.id,
            role: 'member'
          }))
        );

      if (error) throw error;

      const actorName = currentEmployee.profiles?.full_name || 'Someone';
      
      for (let i = 0; i < employeeIds.length; i++) {
        const empId = employeeIds[i];
        const empName = employeeNames[i] || 'Someone';

        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          conversation_id: conversationId,
          sender_id: currentEmployee.id,
          content: `${empName} was added by ${actorName}`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'member_added',
            target_employee_id: empId,
            target_name: empName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName,
            source: 'manual'
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};

export const useUpdateGroupMemberRole = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      employeeId,
      employeeName,
      role 
    }: { 
      conversationId: string; 
      employeeId: string;
      employeeName: string;
      role: 'admin' | 'member' 
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_participants')
        .update({ role })
        .eq('conversation_id', conversationId)
        .eq('employee_id', employeeId);

      if (error) throw error;

      const eventType = role === 'admin' ? 'admin_added' : 'admin_removed';
      const actorName = currentEmployee.profiles?.full_name || 'Someone';

      await supabase.from('chat_messages').insert({
        organization_id: currentOrg.id,
        conversation_id: conversationId,
        sender_id: currentEmployee.id,
        content: role === 'admin' 
          ? `${employeeName} was made an admin`
          : `${employeeName} is no longer an admin`,
        content_type: 'system_event',
        system_event_data: {
          event_type: eventType,
          target_employee_id: employeeId,
          target_name: employeeName,
          actor_employee_id: currentEmployee.id,
          actor_name: actorName
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      employeeId,
      employeeName
    }: { 
      conversationId: string; 
      employeeId: string;
      employeeName: string;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const actorName = currentEmployee.profiles?.full_name || 'Someone';

      await supabase.from('chat_messages').insert({
        organization_id: currentOrg.id,
        conversation_id: conversationId,
        sender_id: currentEmployee.id,
        content: `${employeeName} was removed by ${actorName}`,
        content_type: 'system_event',
        system_event_data: {
          event_type: 'member_removed',
          target_employee_id: employeeId,
          target_name: employeeName,
          actor_employee_id: currentEmployee.id,
          actor_name: actorName,
          source: 'manual'
        }
      });

      const { error } = await supabase
        .from('chat_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('employee_id', employeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};
