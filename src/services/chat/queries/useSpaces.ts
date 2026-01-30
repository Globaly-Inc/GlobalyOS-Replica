/**
 * Space Query Hooks
 * Fetches and caches space data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type { ChatSpace, ChatSpaceMember } from '@/types/chat';

export const useSpaces = (includeArchived = false, membersOnly = true) => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['chat-spaces', currentOrg?.id, currentEmployee?.id, includeArchived, membersOnly],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      if (membersOnly && !currentEmployee?.id) return [];

      let query = supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members${membersOnly ? '!inner' : ''} (
            id,
            employee_id
          )
        `)
        .eq('organization_id', currentOrg.id);

      if (membersOnly && currentEmployee?.id) {
        query = query.eq('chat_space_members.employee_id', currentEmployee.id);
      }

      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((space: any) => ({
        ...space,
        member_count: space.chat_space_members?.length || 0
      })) as ChatSpace[];
    },
    enabled: !!currentOrg?.id && (!membersOnly || !!currentEmployee?.id),
    staleTime: 60000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useSpaceMembers = (spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-space-members', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];

      const { data, error } = await supabase
        .from('chat_space_members')
        .select(`
          *,
          employees:employee_id (
            id,
            user_id,
            position,
            profiles:user_id (
              full_name,
              avatar_url,
              email
            )
          )
        `)
        .eq('space_id', spaceId);

      if (error) throw error;

      return (data || []).map((member: any) => ({
        ...member,
        employee: member.employees
      })) as ChatSpaceMember[];
    },
    enabled: !!spaceId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });
};

export const useSpace = (spaceId: string | null) => {
  return useQuery({
    queryKey: ['chat-space', spaceId],
    queryFn: async () => {
      if (!spaceId) return null;

      const { data, error } = await supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_offices(
            offices:office_id(id, name)
          ),
          chat_space_departments(
            departments:department_id(id, name)
          ),
          chat_space_projects(
            projects:project_id(id, name)
          )
        `)
        .eq('id', spaceId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        organization_id: data.organization_id,
        name: data.name,
        description: data.description,
        space_type: data.space_type as 'collaboration' | 'announcements',
        access_type: data.access_type as 'public' | 'private',
        access_scope: data.access_scope as 'company' | 'custom' | 'offices' | 'projects' | 'members',
        icon_url: data.icon_url,
        archived_at: data.archived_at,
        archived_by: data.archived_by,
        auto_sync_members: data.auto_sync_members ?? false,
        offices: data.chat_space_offices?.map((o: any) => o.offices).filter(Boolean) as { id: string; name: string }[] || [],
        departments: data.chat_space_departments?.map((d: any) => d.departments).filter(Boolean) as { id: string; name: string }[] || [],
        projects: data.chat_space_projects?.map((p: any) => p.projects).filter(Boolean) as { id: string; name: string }[] || [],
      };
    },
    enabled: !!spaceId,
  });
};

export const usePublicSpaces = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['public-spaces', currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data: memberSpaces } = await supabase
        .from('chat_space_members')
        .select('space_id')
        .eq('employee_id', currentEmployee.id)
        .eq('organization_id', currentOrg.id);

      const memberSpaceIds = memberSpaces?.map(s => s.space_id) || [];

      let query = supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members (
            id,
            employee_id
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('access_type', 'public');

      if (memberSpaceIds.length > 0) {
        query = query.not('id', 'in', `(${memberSpaceIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((space: any) => ({
        ...space,
        member_count: space.chat_space_members?.length || 0
      })) as ChatSpace[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

export const useAllSpaces = (includeArchived = false) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['chat-all-spaces', currentOrg?.id, includeArchived],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('chat_spaces')
        .select(`
          *,
          chat_space_members (
            id,
            employee_id,
            role
          ),
          creator:created_by (
            id,
            user_id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((space: any) => ({
        ...space,
        member_count: space.chat_space_members?.length || 0,
        creator_name: space.creator?.profiles?.full_name || 'Unknown',
        creator_avatar: space.creator?.profiles?.avatar_url || null,
      })) as (ChatSpace & { creator_name: string; creator_avatar: string | null })[];
    },
    enabled: !!currentOrg?.id,
  });
};
