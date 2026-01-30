/**
 * Space Mutation Hooks
 * Create, update, archive, delete, join, leave spaces
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';

export const useCreateSpace = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      name, 
      description,
      iconUrl,
      spaceType = 'collaboration',
      accessScope = 'company',
      officeIds,
      departmentIds,
      projectIds,
      memberIds,
      addAllMembers = false,
      autoSync = false,
    }: { 
      name: string; 
      description?: string;
      iconUrl?: string;
      spaceType?: 'collaboration' | 'announcements';
      accessScope?: 'company' | 'custom' | 'offices' | 'projects' | 'members';
      officeIds?: string[];
      departmentIds?: string[];
      projectIds?: string[];
      memberIds?: string[];
      addAllMembers?: boolean;
      autoSync?: boolean;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { data: { user } } = await supabase.auth.getUser();
      const { data: verifyEmployee, error: verifyError } = await supabase
        .from('employees')
        .select('id, status')
        .eq('user_id', user?.id)
        .eq('organization_id', currentOrg.id)
        .single();

      if (verifyError || !verifyEmployee) {
        throw new Error('Your employee profile was not found in this organization');
      }
      
      if (verifyEmployee.status !== 'active') {
        throw new Error('Your employee profile is not active in this organization');
      }

      const employeeId = verifyEmployee.id;
      const accessType = accessScope === 'company' ? 'public' : 'private';

      const { data: space, error: spaceError } = await supabase
        .from('chat_spaces')
        .insert({
          organization_id: currentOrg.id,
          name,
          description: description || null,
          icon_url: iconUrl || null,
          space_type: spaceType,
          access_type: accessType,
          access_scope: accessScope,
          created_by: employeeId,
          auto_sync_members: autoSync && accessScope !== 'members'
        })
        .select()
        .single();

      if (spaceError) throw spaceError;

      // Add associations based on scope
      if ((accessScope === 'custom' || accessScope === 'offices') && officeIds && officeIds.length > 0) {
        await supabase.from('chat_space_offices').insert(
          officeIds.map(officeId => ({
            space_id: space.id,
            office_id: officeId,
            organization_id: currentOrg.id,
          }))
        );
      }

      if (accessScope === 'custom' && departmentIds && departmentIds.length > 0) {
        await supabase.from('chat_space_departments').insert(
          departmentIds.map(departmentId => ({
            space_id: space.id,
            department_id: departmentId,
            organization_id: currentOrg.id,
          }))
        );
      }

      if ((accessScope === 'custom' || accessScope === 'projects') && projectIds && projectIds.length > 0) {
        await supabase.from('chat_space_projects').insert(
          projectIds.map(projectId => ({
            space_id: space.id,
            project_id: projectId,
            organization_id: currentOrg.id,
          }))
        );
      }

      if (accessScope === 'members' && memberIds && memberIds.length > 0) {
        await supabase.from('chat_space_members').insert(
          memberIds.map(empId => ({
            space_id: space.id,
            employee_id: empId,
            organization_id: currentOrg.id,
            role: 'member'
          }))
        );
      }

      return space;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

export const useJoinSpace = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_space_members')
        .insert({
          space_id: spaceId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          role: 'member'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
    },
  });
};

export const useLeaveSpace = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentEmployee?.id || !currentOrg?.id) throw new Error('Not authenticated');

      const leavingEmployeeName = currentEmployee.profiles?.full_name || 'Someone';

      await supabase.from('chat_messages').insert({
        organization_id: currentOrg.id,
        space_id: spaceId,
        sender_id: currentEmployee.id,
        content: `${leavingEmployeeName} left the space`,
        content_type: 'system_event',
        system_event_data: {
          event_type: 'member_left',
          target_employee_id: currentEmployee.id,
          target_name: leavingEmployeeName
        }
      });

      const { error } = await supabase
        .from('chat_space_members')
        .delete()
        .eq('space_id', spaceId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces', currentOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
  });
};

export const useUpdateSpaceNotification = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      spaceId, 
      setting 
    }: { 
      spaceId: string; 
      setting: 'all' | 'mentions' | 'mute' 
    }) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_space_members')
        .update({ notification_setting: setting })
        .eq('space_id', spaceId)
        .eq('employee_id', currentEmployee.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
    },
  });
};

export const useArchiveSpace = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentEmployee?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('chat_spaces')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: currentEmployee.id,
        })
        .eq('id', spaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space'] });
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
    },
  });
};

export const useRestoreSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await supabase
        .from('chat_spaces')
        .update({
          archived_at: null,
          archived_by: null,
        })
        .eq('id', spaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space'] });
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
    },
  });
};

export const useDeleteSpace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await supabase
        .from('chat_spaces')
        .delete()
        .eq('id', spaceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
    },
  });
};

export const useJoinSpaceAsAdmin = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (spaceId: string) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const { data: existing } = await supabase
        .from('chat_space_members')
        .select('id')
        .eq('space_id', spaceId)
        .eq('employee_id', currentEmployee.id)
        .maybeSingle();

      if (existing) {
        return { alreadyMember: true };
      }

      const { error } = await supabase
        .from('chat_space_members')
        .insert({
          space_id: spaceId,
          employee_id: currentEmployee.id,
          organization_id: currentOrg.id,
          role: 'admin'
        });

      if (error) throw error;
      return { alreadyMember: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
      queryClient.invalidateQueries({ queryKey: ['chat-all-spaces'] });
    },
  });
};

export const useUpdateSpace = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      spaceId,
      name,
      description,
      spaceType,
      iconUrl,
      autoSyncMembers,
      accessScope,
      officeIds,
      departmentIds,
      projectIds,
      memberIds,
      oldName,
      oldIconUrl,
    }: {
      spaceId: string;
      name?: string;
      description?: string | null;
      spaceType?: 'collaboration' | 'announcements';
      iconUrl?: string | null;
      autoSyncMembers?: boolean;
      accessScope?: 'company' | 'custom' | 'members';
      officeIds?: string[];
      departmentIds?: string[];
      projectIds?: string[];
      memberIds?: string[];
      oldName?: string;
      oldIconUrl?: string | null;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error('Not authenticated');

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (spaceType !== undefined) updateData.space_type = spaceType;
      if (iconUrl !== undefined) updateData.icon_url = iconUrl;
      if (autoSyncMembers !== undefined) updateData.auto_sync_members = autoSyncMembers;
      
      if (accessScope !== undefined) {
        updateData.access_scope = accessScope;
        updateData.access_type = accessScope === 'company' ? 'public' : 'private';
        updateData.auto_sync_members = accessScope !== 'members';
      }

      const { error } = await supabase
        .from('chat_spaces')
        .update(updateData)
        .eq('id', spaceId);

      if (error) throw error;

      // Log name change
      if (name !== undefined && oldName !== undefined && name !== oldName) {
        const actorName = currentEmployee.profiles?.full_name || 'Someone';
        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: `${actorName} changed the space name`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'space_name_changed',
            target_employee_id: currentEmployee.id,
            target_name: actorName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName,
            old_value: oldName,
            new_value: name
          }
        });
      }

      // Log photo change
      if (iconUrl !== undefined && oldIconUrl !== iconUrl) {
        const actorName = currentEmployee.profiles?.full_name || 'Someone';
        await supabase.from('chat_messages').insert({
          organization_id: currentOrg.id,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: `${actorName} updated the space photo`,
          content_type: 'system_event',
          system_event_data: {
            event_type: 'space_photo_changed',
            target_employee_id: currentEmployee.id,
            target_name: actorName,
            actor_employee_id: currentEmployee.id,
            actor_name: actorName
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space'] });
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
    },
  });
};
