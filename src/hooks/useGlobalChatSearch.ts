import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";

export interface GlobalSearchResult {
  id: string;
  type: 'message' | 'conversation' | 'space' | 'member';
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  conversationId?: string | null;
  spaceId?: string | null;
  messageId?: string;
  highlight?: string;
  createdAt?: string;
}

export function useGlobalChatSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-chat-search', currentOrg?.id, debouncedQuery],
    queryFn: async (): Promise<GlobalSearchResult[]> => {
      if (!currentOrg?.id || !currentEmployee?.id || debouncedQuery.length < 2) {
        return [];
      }

      const searchTerm = `%${debouncedQuery}%`;
      const allResults: GlobalSearchResult[] = [];

      // 1. Search messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select(`
          id,
          content,
          created_at,
          conversation_id,
          space_id,
          sender:sender_id (
            id,
            position,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('organization_id', currentOrg.id)
        .ilike('content', searchTerm)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messages) {
        messages.forEach((msg: any) => {
          const senderName = msg.sender?.profiles?.full_name || 'Unknown';
          allResults.push({
            id: `msg-${msg.id}`,
            type: 'message',
            title: msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content,
            subtitle: senderName,
            avatarUrl: msg.sender?.profiles?.avatar_url,
            conversationId: msg.conversation_id,
            spaceId: msg.space_id,
            messageId: msg.id,
            highlight: msg.content,
            createdAt: msg.created_at,
          });
        });
      }

      // 2. Search conversations (group names)
      const { data: conversations } = await supabase
        .from('chat_participants')
        .select(`
          conversation_id,
          chat_conversations:conversation_id (
            id,
            name,
            icon_url,
            is_group
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id);

      if (conversations) {
        const uniqueConversations = new Map();
        conversations.forEach((p: any) => {
          const conv = p.chat_conversations;
          if (conv && conv.name && conv.name.toLowerCase().includes(debouncedQuery.toLowerCase())) {
            if (!uniqueConversations.has(conv.id)) {
              uniqueConversations.set(conv.id, conv);
            }
          }
        });

        uniqueConversations.forEach((conv) => {
          allResults.push({
            id: `conv-${conv.id}`,
            type: 'conversation',
            title: conv.name,
            subtitle: conv.is_group ? 'Group chat' : 'Direct message',
            avatarUrl: conv.icon_url,
            conversationId: conv.id,
          });
        });
      }

      // 3. Search spaces
      const { data: spaces } = await supabase
        .from('chat_space_members')
        .select(`
          space_id,
          chat_spaces:space_id (
            id,
            name,
            description,
            space_type
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('employee_id', currentEmployee.id);

      if (spaces) {
        const uniqueSpaces = new Map();
        spaces.forEach((m: any) => {
          const space = m.chat_spaces;
          if (space && space.name.toLowerCase().includes(debouncedQuery.toLowerCase())) {
            if (!uniqueSpaces.has(space.id)) {
              uniqueSpaces.set(space.id, space);
            }
          }
        });

        uniqueSpaces.forEach((space) => {
          allResults.push({
            id: `space-${space.id}`,
            type: 'space',
            title: space.name,
            subtitle: space.space_type === 'announcements' ? 'Announcements' : 'Collaboration',
            spaceId: space.id,
          });
        });
      }

      // 4. Search members (for starting DMs)
      const { data: members } = await supabase
        .from('employees')
        .select(`
          id,
          position,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('organization_id', currentOrg.id)
        .neq('id', currentEmployee.id)
        .eq('status', 'active');

      if (members) {
        members.forEach((emp: any) => {
          const name = emp.profiles?.full_name || '';
          if (name.toLowerCase().includes(debouncedQuery.toLowerCase())) {
            allResults.push({
              id: `member-${emp.id}`,
              type: 'member',
              title: name,
              subtitle: emp.position || 'Team member',
              avatarUrl: emp.profiles?.avatar_url,
            });
          }
        });
      }

      return allResults;
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id && debouncedQuery.length >= 2,
  });

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<GlobalSearchResult['type'], GlobalSearchResult[]> = {
      message: [],
      conversation: [],
      space: [],
      member: [],
    };

    results.forEach(result => {
      groups[result.type].push(result);
    });

    return groups;
  }, [results]);

  return {
    results,
    groupedResults,
    isLoading,
    hasResults: results.length > 0,
    query: debouncedQuery,
  };
}
