import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface WikiViewer {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
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

        const otherViewers: WikiViewer[] = [];
        for (const [key, presences] of Object.entries(state)) {
          if (key === employeeId) continue;
          const p = presences[0];
          if (p) {
            otherViewers.push({
              employeeId: p.employeeId,
              name: p.name,
              avatarUrl: p.avatarUrl,
            });
          }
        }
        setViewers(otherViewers);
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
