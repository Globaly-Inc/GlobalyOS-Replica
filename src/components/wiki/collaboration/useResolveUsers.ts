import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@blocknote/core/comments';

/**
 * Hook that provides a resolveUsers function for BlockNote's CommentsExtension.
 * Caches resolved users to avoid repeated DB queries.
 */
export const useResolveUsers = (organizationId: string | undefined) => {
  const cache = useRef<Map<string, User>>(new Map());

  const resolveUsers = useCallback(
    async (userIds: string[]): Promise<User[]> => {
      if (!organizationId) return [];

      // Find IDs not in cache
      const uncached = userIds.filter((id) => !cache.current.has(id));

      if (uncached.length > 0) {
        const { data } = await supabase
          .from('employees')
          .select('id, profiles!inner(full_name, avatar_url)')
          .eq('organization_id', organizationId)
          .in('id', uncached);

        if (data) {
          for (const emp of data) {
            const profile = emp.profiles as unknown as {
              full_name: string;
              avatar_url: string | null;
            };
            cache.current.set(emp.id, {
              id: emp.id,
              username: profile.full_name || 'Unknown',
              avatarUrl: profile.avatar_url || '',
            });
          }
        }
      }

      return userIds.map(
        (id) =>
          cache.current.get(id) || {
            id,
            username: 'Unknown',
            avatarUrl: '',
          },
      );
    },
    [organizationId],
  );

  return resolveUsers;
};
