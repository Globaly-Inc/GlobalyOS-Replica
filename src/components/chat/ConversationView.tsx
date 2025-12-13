import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Pin,
  History,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  useMessages, 
  useTogglePinMessage, 
  useTypingUsers, 
  useMarkAsRead,
  useEditMessage,
  useDeleteMessage,
  useMessageReactions,
  useToggleReaction
} from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import MessageComposer from "./MessageComposer";
import AttachmentRenderer from "./AttachmentRenderer";
import MessageActions from "./MessageActions";
import MessageReactions from "./MessageReactions";
import EditMessageInput from "./EditMessageInput";
import ChatDropZone from "./ChatDropZone";
import type { ActiveChat, ChatMessage } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface OtherParticipant {
  id: string;
  position: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

interface ConversationViewProps {
  activeChat: ActiveChat;
  onBack: () => void;
  onToggleRightPanel: () => void;
}

const ConversationView = ({ activeChat, onBack, onToggleRightPanel }: ConversationViewProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<{ addFiles: (files: File[]) => void } | null>(null);
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const togglePin = useTogglePinMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const toggleReaction = useToggleReaction();
  const markAsRead = useMarkAsRead();
  const [otherParticipant, setOtherParticipant] = useState<OtherParticipant | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  const conversationId = activeChat.type === 'conversation' ? activeChat.id : null;
  const spaceId = activeChat.type === 'space' ? activeChat.id : null;
  
  const { data: messages = [], isLoading } = useMessages(conversationId, spaceId);
  const { data: typingUsers = [] } = useTypingUsers(conversationId, spaceId);
  const { data: reactions = {} } = useMessageReactions(conversationId, spaceId);

  const handleFilesDropped = useCallback((files: File[]) => {
    composerRef.current?.addFiles(files);
  }, []);

  // Mark as read when viewing conversation
  useEffect(() => {
    if (conversationId || spaceId) {
      markAsRead.mutate({ conversationId: conversationId || undefined, spaceId: spaceId || undefined });
    }
  }, [conversationId, spaceId]);

  // Subscribe to typing indicator changes
  useEffect(() => {
    const channel = supabase
      .channel('typing-indicators')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_presence'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['typing-users', conversationId, spaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, spaceId, queryClient]);

  // Fetch other participant details for direct chats
  useEffect(() => {
    const fetchOtherParticipant = async () => {
      if (activeChat.type !== 'conversation' || !currentEmployee?.id) return;

      // Get the other participant from chat_participants
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('employee_id')
        .eq('conversation_id', activeChat.id)
        .neq('employee_id', currentEmployee.id)
        .limit(1);

      if (!participants?.[0]) return;

      const otherEmployeeId = participants[0].employee_id;

      // Fetch employee position and profile avatar
      const { data: employee } = await supabase
        .from('employees')
        .select('id, position, user_id')
        .eq('id', otherEmployeeId)
        .single();

      if (!employee) return;

      // Fetch profile for avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', employee.user_id)
        .single();

      // Fetch presence status
      const { data: presence } = await supabase
        .from('chat_presence')
        .select('is_online, last_seen_at')
        .eq('employee_id', otherEmployeeId)
        .single();

      // Consider offline if last_seen_at is older than 60 seconds
      const isOnline = presence?.is_online && presence?.last_seen_at
        ? (new Date().getTime() - new Date(presence.last_seen_at).getTime()) < 60000
        : false;

      setOtherParticipant({
        id: employee.id,
        position: employee.position,
        avatar_url: profile?.avatar_url || null,
        is_online: isOnline,
      });
    };

    fetchOtherParticipant();
  }, [activeChat, currentEmployee?.id]);

  // Subscribe to presence changes for the other participant
  useEffect(() => {
    if (!otherParticipant?.id) return;

    const channel = supabase
      .channel(`presence-${otherParticipant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_presence',
          filter: `employee_id=eq.${otherParticipant.id}`
        },
        (payload: any) => {
          if (payload.new) {
            const lastSeen = payload.new.last_seen_at ? new Date(payload.new.last_seen_at) : null;
            const isStale = lastSeen ? (new Date().getTime() - lastSeen.getTime()) > 60000 : true;
            const isOnline = payload.new.is_online && !isStale;
            setOtherParticipant(prev => prev ? { ...prev, is_online: isOnline } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherParticipant?.id]);

  // Subscribe to real-time messages, attachments, and reactions
  useEffect(() => {
    const channel = supabase
      .channel('chat-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: conversationId 
            ? `conversation_id=eq.${conversationId}`
            : `space_id=eq.${spaceId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId, spaceId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_attachments'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', conversationId, spaceId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_message_reactions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-reactions', conversationId, spaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, spaceId, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    }
    if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.created_at), "yyyy-MM-dd");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <ChatDropZone onFilesDropped={handleFilesDropped}>
      <div className="flex flex-col h-full bg-background">
        {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {activeChat.type === 'conversation' ? (
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherParticipant?.avatar_url || undefined} alt={activeChat.name} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(activeChat.name)}
                </AvatarFallback>
              </Avatar>
              {otherParticipant?.is_online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-10 w-10 rounded bg-primary/10 text-primary font-semibold text-sm">
              {activeChat.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <div>
            <h2 className="font-semibold text-foreground">{activeChat.name}</h2>
            {activeChat.type === 'conversation' && otherParticipant?.position && (
              <p className="text-xs text-muted-foreground">{otherParticipant.position}</p>
            )}
            {activeChat.type === 'space' && (
              <p className="text-xs text-muted-foreground">
                {messages.length} messages
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onToggleRightPanel}>
            <Pin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            {activeChat.type === 'conversation' ? (
              <>
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarFallback className="text-2xl">
                    {getInitials(activeChat.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold">{activeChat.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You created this chat today
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center h-20 w-20 rounded-lg bg-primary/10 text-primary font-bold text-3xl mb-4">
                  {activeChat.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-lg font-semibold">{activeChat.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome to your new space! Start the conversation.
                </p>
              </>
            )}
            <div className="flex items-center gap-1 mt-4 text-sm text-muted-foreground">
              <History className="h-4 w-4" />
              <span>HISTORY IS ON</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Messages sent with history on are saved
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date divider */}
                <div className="flex items-center justify-center my-4">
                  <span className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted rounded-full">
                    {formatDateDivider(dateMessages[0].created_at)}
                  </span>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message) => {
                    const isOwn = message.sender_id === currentEmployee?.id;
                    const senderName = message.sender?.profiles?.full_name || "Unknown";
                    const isEditing = editingMessageId === message.id;
                    const messageReactions = reactions[message.id] || {};
                    
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3 group",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        {!isOwn && (
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(senderName)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className={cn("flex flex-col max-w-[70%]", isOwn && "items-end")}>
                          {!isOwn && (
                            <span className="text-xs font-medium text-muted-foreground mb-1">
                              {senderName}
                            </span>
                          )}
                          
                          {isEditing ? (
                            <EditMessageInput
                              initialContent={message.content}
                              onSave={(content) => {
                                editMessage.mutate({ messageId: message.id, content });
                                setEditingMessageId(null);
                              }}
                              onCancel={() => setEditingMessageId(null)}
                              isLoading={editMessage.isPending}
                            />
                          ) : (
                            <>
                              <div className="flex items-start gap-1">
                                <div
                                  className={cn(
                                    "px-3 py-2 rounded-2xl text-sm",
                                    isOwn
                                      ? "bg-primary text-primary-foreground rounded-br-md"
                                      : "bg-muted rounded-bl-md",
                                    message.is_pinned && "ring-2 ring-yellow-400"
                                  )}
                                >
                                  {message.content && (
                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                  )}
                                  {message.attachments && message.attachments.length > 0 && (
                                    <AttachmentRenderer 
                                      attachments={message.attachments} 
                                      isOwn={isOwn}
                                    />
                                  )}
                                  {message.updated_at !== message.created_at && (
                                    <span className="text-[10px] opacity-70 ml-1">(edited)</span>
                                  )}
                                </div>
                                
                                <MessageActions
                                  messageId={message.id}
                                  isPinned={message.is_pinned}
                                  isOwn={isOwn}
                                  onPin={() => togglePin.mutate({ 
                                    messageId: message.id, 
                                    isPinned: message.is_pinned 
                                  })}
                                  onEdit={() => setEditingMessageId(message.id)}
                                  onDelete={() => deleteMessage.mutate(message.id)}
                                  onReact={(emoji) => toggleReaction.mutate({ 
                                    messageId: message.id, 
                                    emoji 
                                  })}
                                />
                              </div>
                              
                              {/* Message reactions */}
                              <MessageReactions
                                reactions={messageReactions}
                                currentEmployeeId={currentEmployee?.id || ''}
                                onToggleReaction={(emoji) => toggleReaction.mutate({ 
                                  messageId: message.id, 
                                  emoji 
                                })}
                                isOwn={isOwn}
                              />
                            </>
                          )}
                          
                          <span className="text-[10px] text-muted-foreground mt-1">
                            {formatMessageTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : typingUsers.length === 2
                ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`}
            </span>
          </div>
        </div>
      )}

      {/* Message Composer */}
      <MessageComposer 
        ref={composerRef}
        conversationId={conversationId}
        spaceId={spaceId}
      />
      </div>
    </ChatDropZone>
  );
};

export default ConversationView;
