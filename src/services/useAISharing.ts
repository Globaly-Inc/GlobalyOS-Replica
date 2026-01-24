import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AIParticipant {
  id: string;
  conversation_id: string;
  employee_id: string;
  role: "owner" | "member";
  added_at: string;
  employee?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface AIInternalNote {
  id: string;
  conversation_id: string;
  organization_id: string;
  author_employee_id: string;
  content: string;
  mentioned_employee_ids: string[];
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

// Fetch participants for a conversation
export const useAIParticipants = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["ai-participants", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("ai_conversation_participants")
        .select(`
          id,
          conversation_id,
          employee_id,
          role,
          added_at,
          employee:employees(
            id,
            user_id,
            profiles(full_name, avatar_url)
          )
        `)
        .eq("conversation_id", conversationId);

      if (error) throw error;
      return data as unknown as AIParticipant[];
    },
    enabled: !!conversationId,
  });
};

// Fetch internal notes for a conversation
export const useAIInternalNotes = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["ai-internal-notes", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("ai_internal_notes")
        .select(`
          id,
          conversation_id,
          organization_id,
          author_employee_id,
          content,
          mentioned_employee_ids,
          created_at,
          updated_at,
          author:employees!author_employee_id(
            id,
            profiles(full_name, avatar_url)
          )
        `)
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as unknown as AIInternalNote[];
    },
    enabled: !!conversationId,
  });
};

// Add internal note
export const useAddInternalNote = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      mentionedEmployeeIds = [],
      authorEmployeeId,
    }: {
      conversationId: string;
      content: string;
      mentionedEmployeeIds?: string[];
      authorEmployeeId: string;
    }) => {
      if (!currentOrg?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("ai_internal_notes")
        .insert({
          conversation_id: conversationId,
          organization_id: currentOrg.id,
          author_employee_id: authorEmployeeId,
          content,
          mentioned_employee_ids: mentionedEmployeeIds,
        })
        .select()
        .single();

      if (error) throw error;

      // Note: Notifications for mentions would be handled separately
      // via the existing notification system when needed

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ai-internal-notes", variables.conversationId],
      });
      toast.success("Note added");
    },
    onError: (error) => {
      console.error("Failed to add note:", error);
      toast.error("Failed to add note");
    },
  });
};

// Update conversation sharing
export const useUpdateConversationSharing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      isShared,
      visibility,
    }: {
      conversationId: string;
      isShared: boolean;
      visibility: "private" | "team" | "specific";
    }) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({
          is_shared: isShared,
          visibility,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
    onError: () => {
      toast.error("Failed to update sharing settings");
    },
  });
};

// Fetch shared conversations (where user is participant but not owner)
export const useSharedAIConversations = () => {
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["ai-shared-conversations", currentOrg?.id, user?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !user?.id) return [];

      // First get the employee ID
      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("organization_id", currentOrg.id)
        .eq("user_id", user.id)
        .single();

      if (!employee) return [];

      // Get conversations where user is a participant
      const { data: participants } = await supabase
        .from("ai_conversation_participants")
        .select("conversation_id")
        .eq("employee_id", employee.id);

      if (!participants || participants.length === 0) return [];

      const conversationIds = participants.map((p) => p.conversation_id);

      // Fetch those conversations (excluding ones user owns)
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .in("id", conversationIds)
        .neq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .eq("is_archived", false)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && !!user?.id,
  });
};
