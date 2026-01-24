import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AIConversation {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  is_archived: boolean;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    sources?: {
      type: string;
      id: string;
      title: string;
      excerpt?: string;
    }[];
  };
  created_at: string;
}

export const useAIConversations = () => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["ai-conversations", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .eq("is_archived", false)
        .order("is_pinned", { ascending: false })
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      return data as AIConversation[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useAIMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["ai-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as AIMessage[];
    },
    enabled: !!conversationId,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (title: string = "New Conversation") => {
      if (!currentOrg?.id || !user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ai_conversations")
        .insert({
          organization_id: currentOrg.id,
          user_id: user.id,
          title,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
    onError: (error) => {
      console.error("Failed to create conversation:", error);
      toast.error("Failed to create conversation");
    },
  });
};

export const useAddMessage = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({
      conversationId,
      role,
      content,
      metadata,
    }: {
      conversationId: string;
      role: "user" | "assistant";
      content: string;
      metadata?: AIMessage["metadata"];
    }) => {
      if (!currentOrg?.id) throw new Error("No organization");

      const { data, error } = await supabase
        .from("ai_messages")
        .insert({
          conversation_id: conversationId,
          organization_id: currentOrg.id,
          role,
          content,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AIMessage;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ai-messages", variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });
};

export const useRenameConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("Conversation renamed");
    },
    onError: () => {
      toast.error("Failed to rename conversation");
    },
  });
};

export const usePinConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success(variables.isPinned ? "Conversation pinned" : "Conversation unpinned");
    },
    onError: () => {
      toast.error("Failed to update conversation");
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("Conversation deleted");
    },
    onError: () => {
      toast.error("Failed to delete conversation");
    },
  });
};

export const useArchiveConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
      toast.success("Conversation archived");
    },
    onError: () => {
      toast.error("Failed to archive conversation");
    },
  });
};
