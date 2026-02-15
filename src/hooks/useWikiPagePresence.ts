import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface WikiViewer {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  isSelf: boolean;
}

interface UseWikiPagePresenceOptions {
  pageId: string | undefined;
  employeeId: string | undefined;
  userName: string;
  userAvatar: string | null;
}

export const useWikiPagePresence = ({
  pageId,
  employeeId,
  userName,
  userAvatar,
}: UseWikiPagePresenceOptions) => {
  const [viewers, setViewers] = useState<WikiViewer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!pageId || !employeeId) return;

    const channel = supabase.channel(`wiki-viewers-${pageId}`, {
      config: { presence: { key: employeeId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<{
          employeeId: string;
          name: string;
          avatarUrl: string | null;
        }>();

        const allViewers: WikiViewer[] = [];
        for (const [key, presences] of Object.entries(state)) {
          const p = presences[0];
          if (p) {
            allViewers.push({
              employeeId: p.employeeId,
              name: p.name,
              avatarUrl: p.avatarUrl,
              isSelf: key === employeeId,
            });
          }
        }
        // Sort so current user appears first
        allViewers.sort((a, b) => (a.isSelf ? -1 : b.isSelf ? 1 : 0));
        setViewers(allViewers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            employeeId,
            name: userName,
            avatarUrl: userAvatar,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [pageId, employeeId, userName, userAvatar]);

  return viewers;
};
