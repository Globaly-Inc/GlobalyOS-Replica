/**
 * Thread View Component
 * Displays message thread/replies in a right panel
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useOrganization } from "@/hooks/useOrganization";
import { useChatNotificationPreferences } from "@/hooks/useChatNotificationPreferences";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import RichTextMessage from "./RichTextMessage";
import AttachmentRenderer from "./AttachmentRenderer";
import LinkPreviewRenderer from "./LinkPreviewRenderer";
import type { ChatMessage } from "@/types/chat";

interface ThreadViewProps {
  parentMessage: ChatMessage;
  conversationId: string | null;
  spaceId: string | null;
  onClose: () => void;
}

const ThreadView = ({
  parentMessage,
  conversationId,
  spaceId,
  onClose,
}: ThreadViewProps) => {
  const [replyContent, setReplyContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  
  // Chat notification sound hooks
  const { shouldPlayChatSound, preferences: chatPreferences } = useChatNotificationPreferences();
  const { playNotificationSound } = useNotificationSound();

  // Fetch replies for this message
  const { data: replies = [], isLoading } = useQuery({
    queryKey: ['thread-replies', parentMessage.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          employees:sender_id (
            id,
            user_id,
            position,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          chat_attachments (
            id,
            file_name,
            file_path,
            file_type,
            file_size,
            created_at
          )
        `)
        .eq('reply_to_id', parentMessage.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((msg: any) => ({
        ...msg,
        sender: msg.employees,
        attachments: msg.chat_attachments || []
      })) as ChatMessage[];
    },
    enabled: !!parentMessage.id,
  });

  // Subscribe to real-time updates for replies
  useEffect(() => {
    const channel = supabase
      .channel(`thread-${parentMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `reply_to_id=eq.${parentMessage.id}`
        },
        (payload) => {
          const newReply = payload.new as any;
          
          // Play sound for incoming replies from others
          if (newReply.sender_id !== currentEmployee?.id) {
            const messageType = conversationId ? 'dm' : 'space';
            if (shouldPlayChatSound(messageType)) {
              playNotificationSound(chatPreferences.soundType, chatPreferences.soundVolume);
            }
          }
          
          queryClient.invalidateQueries({ queryKey: ['thread-replies', parentMessage.id] });
          queryClient.invalidateQueries({ queryKey: ['message-reply-counts', conversationId, spaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parentMessage.id, conversationId, spaceId, queryClient, currentEmployee?.id, shouldPlayChatSound, playNotificationSound, chatPreferences.soundType, chatPreferences.soundVolume]);

  // Auto-scroll to bottom when new replies come in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !currentEmployee?.id || !currentOrg?.id) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          organization_id: currentOrg.id,
          conversation_id: conversationId,
          space_id: spaceId,
          sender_id: currentEmployee.id,
          content: replyContent.trim(),
          content_type: 'text',
          reply_to_id: parentMessage.id,
        });

      if (error) throw error;

      setReplyContent("");
      queryClient.invalidateQueries({ queryKey: ['thread-replies', parentMessage.id] });
      queryClient.invalidateQueries({ queryKey: ['message-reply-counts', conversationId, spaceId] });
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const parentSenderName = parentMessage.sender?.profiles?.full_name || "Unknown";

  return (
    <div className="flex flex-col h-full bg-card border-l border-border w-80 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Thread</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {/* Original message */}
          <div className="pb-4 border-b border-border">
            <div className="flex gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={parentMessage.sender?.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(parentSenderName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm">{parentSenderName}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(parentMessage.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
                {parentMessage.content && (
                  <div className="text-sm text-foreground">
                    <RichTextMessage content={parentMessage.content} />
                  </div>
                )}
                {parentMessage.attachments && parentMessage.attachments.length > 0 && (
                  <div className="mt-2">
                    <AttachmentRenderer
                      attachments={parentMessage.attachments}
                      isOwn={parentMessage.sender_id === currentEmployee?.id}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reply count */}
          <div className="text-xs text-muted-foreground font-medium">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </div>

          {/* Replies */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply) => {
                const replyName = reply.sender?.profiles?.full_name || "Unknown";
                const isOwn = reply.sender_id === currentEmployee?.id;

                return (
                  <div key={reply.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={reply.sender?.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(replyName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={cn(
                          "font-medium text-sm",
                          isOwn ? "text-primary" : "text-foreground"
                        )}>
                          {replyName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(reply.created_at), "h:mm a")}
                        </span>
                      </div>
                      {reply.content && (
                        <div className="text-sm text-foreground">
                          <RichTextMessage content={reply.content} />
                        </div>
                      )}
                      {reply.content && (
                        <LinkPreviewRenderer 
                          content={reply.content} 
                          messageId={reply.id}
                          maxPreviews={2}
                        />
                      )}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-2">
                          <AttachmentRenderer
                            attachments={reply.attachments}
                            isOwn={isOwn}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reply composer - inside scroll area */}
          <div className="pt-3 mt-2">
            <div className="flex gap-2">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Reply..."
                className="min-h-[40px] max-h-[120px] resize-none text-sm"
                rows={1}
              />
              <Button
                size="icon"
                className="h-10 w-10 flex-shrink-0"
                onClick={handleSendReply}
                disabled={!replyContent.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ThreadView;