/**
 * Consolidated realtime subscription hook for chat
 * Manages a single Supabase channel for all chat-related tables
 * to reduce connection overhead and improve performance
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import type { ChatMessage, ChatConversation, ChatSpace } from '@/types/chat';

export const useChatRealtime = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!currentOrg?.id || !currentEmployee?.id) return;

    // Single consolidated channel for all chat-related tables
    const channel = supabase
      .channel(`chat-realtime-${currentOrg.id}`)
      // Conversations - invalidate on changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg.id, currentEmployee.id] });
        }
      )
      // Participants - invalidate conversations on changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg.id, currentEmployee.id] });
          queryClient.invalidateQueries({ queryKey: ['chat-conversation-participants'] });
        }
      )
      // Messages - delta update for last_message preview in conversation list
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        (payload) => {
          const msg = payload.new as any;
          
          // Update last_message in conversations list (delta update)
          queryClient.setQueryData<ChatConversation[]>(
            ['chat-conversations', currentOrg.id, currentEmployee.id],
            (old) => old?.map(c => 
              c.id === msg.conversation_id 
                ? { 
                    ...c, 
                    last_message: {
                      id: msg.id,
                      content: msg.content,
                      content_type: msg.content_type,
                      created_at: msg.created_at,
                      sender_id: msg.sender_id,
                    } as ChatMessage
                  } 
                : c
            )
          );
          
          // Update last_message in spaces list (delta update)
          queryClient.setQueryData<ChatSpace[]>(
            ['chat-spaces', currentOrg.id, currentEmployee.id, false, true],
            (old) => old?.map(s => 
              s.id === msg.space_id 
                ? { 
                    ...s, 
                    last_message: {
                      id: msg.id,
                      content: msg.content,
                      content_type: msg.content_type,
                      created_at: msg.created_at,
                      sender_id: msg.sender_id,
                    } as ChatMessage
                  } 
                : s
            )
          );

          // Increment unread count for messages from others
          if (msg.sender_id !== currentEmployee.id) {
            queryClient.setQueryData(
              ['unread-counts', currentOrg.id], 
              (old: any) => {
                if (!old) return { 
                  conversations: msg.conversation_id ? { [msg.conversation_id]: 1 } : {},
                  spaces: msg.space_id ? { [msg.space_id]: 1 } : {}
                };
                return {
                  conversations: msg.conversation_id 
                    ? { 
                        ...old.conversations, 
                        [msg.conversation_id]: (old.conversations?.[msg.conversation_id] || 0) + 1 
                      }
                    : old.conversations,
                  spaces: msg.space_id
                    ? { 
                        ...old.spaces, 
                        [msg.space_id]: (old.spaces?.[msg.space_id] || 0) + 1 
                      }
                    : old.spaces,
                };
              }
            );
          }
        }
      )
      // Presence updates for online status and typing
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_presence',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        (payload) => {
          // Update online presence cache
          queryClient.setQueryData(
            ['online-presence', currentOrg.id], 
            (old: any[]) => {
              if (!old) return payload.new ? [payload.new] : [];
              const filtered = old.filter(p => p.employee_id !== (payload.new as any)?.employee_id);
              if (payload.eventType === 'DELETE') return filtered;
              return payload.new ? [...filtered, payload.new] : filtered;
            }
          );
          // Invalidate typing users (they're ephemeral)
          queryClient.invalidateQueries({ queryKey: ['typing-users'] });
        }
      )
      // Spaces changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_spaces',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
          queryClient.invalidateQueries({ queryKey: ['chat-space'] });
        }
      )
      // Space members changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_space_members',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-spaces'] });
          queryClient.invalidateQueries({ queryKey: ['chat-space-members'] });
        }
      )
      // Favorites changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_favorites',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-favorites'] });
        }
      )
      // Message stars
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_message_stars',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['message-stars'] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, currentEmployee?.id, queryClient]);

  return null;
};

export default useChatRealtime;
