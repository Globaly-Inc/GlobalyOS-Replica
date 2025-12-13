import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Phone,
  Video,
  Pin,
  History,
  Users,
  Settings,
  UserPlus,
} from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  useMessages, 
  useTogglePinMessage, 
  useTypingUsers, 
  useMarkAsRead,
  useEditMessage,
  useDeleteMessage,
  useMessageReactions,
  useToggleReaction,
  useSpaceMembers,
} from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import MessageComposer from "./MessageComposer";
import MessageBubble from "./MessageBubble";
import DateSeparator from "./DateSeparator";
import ScrollToBottom from "./ScrollToBottom";
import MessageSearch from "./MessageSearch";
import ChatDropZone from "./ChatDropZone";
import SpaceMembersDialog from "./SpaceMembersDialog";
import AddSpaceMembersDialog from "./AddSpaceMembersDialog";
import SpaceSettingsDialog from "./SpaceSettingsDialog";
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

// Check if two messages should be grouped (same sender within 5 minutes)
const shouldGroupMessages = (currentMsg: ChatMessage, prevMsg: ChatMessage | null): boolean => {
  if (!prevMsg) return false;
  if (currentMsg.sender_id !== prevMsg.sender_id) return false;
  
  const timeDiff = differenceInMinutes(
    new Date(currentMsg.created_at),
    new Date(prevMsg.created_at)
  );
  
  return timeDiff < 5;
};

const ConversationView = ({ activeChat, onBack, onToggleRightPanel }: ConversationViewProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  
  const conversationId = activeChat.type === 'conversation' ? activeChat.id : null;
  const spaceId = activeChat.type === 'space' ? activeChat.id : null;
  
  const { data: messages = [], isLoading } = useMessages(conversationId, spaceId);
  const { data: typingUsers = [] } = useTypingUsers(conversationId, spaceId);
  const { data: reactions = {} } = useMessageReactions(conversationId, spaceId);
  const { data: spaceMembers = [] } = useSpaceMembers(spaceId);
  
  // Check if current user is a space admin
  const currentMembership = spaceMembers.find(m => m.employee_id === currentEmployee?.id);
  const isSpaceAdmin = currentMembership?.role === 'admin';

  const handleFilesDropped = useCallback((files: File[]) => {
    composerRef.current?.addFiles(files);
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  // Handle scroll events to show/hide scroll to bottom button
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceFromBottom < 100;
    
    setIsAtBottom(atBottom);
    setShowScrollToBottom(!atBottom);
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

      const { data: participants } = await supabase
        .from('chat_participants')
        .select('employee_id')
        .eq('conversation_id', activeChat.id)
        .neq('employee_id', currentEmployee.id)
        .limit(1);

      if (!participants?.[0]) return;

      const otherEmployeeId = participants[0].employee_id;

      const { data: employee } = await supabase
        .from('employees')
        .select('id, position, user_id')
        .eq('id', otherEmployeeId)
        .single();

      if (!employee) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', employee.user_id)
        .single();

      const { data: presence } = await supabase
        .from('chat_presence')
        .select('is_online, last_seen_at')
        .eq('employee_id', otherEmployeeId)
        .single();

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

  // Auto-scroll to bottom on new messages only if already at bottom
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [conversationId, spaceId]);

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
                  {spaceMembers.length} member{spaceMembers.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className={showSearch ? "bg-accent" : ""}
            >
              <Search className="h-4 w-4" />
            </Button>
            {activeChat.type === 'conversation' && (
              <>
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" onClick={onToggleRightPanel}>
              <Pin className="h-4 w-4" />
            </Button>
            
            {/* Space management menu */}
            {activeChat.type === 'space' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowMembersDialog(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    View members
                  </DropdownMenuItem>
                  {isSpaceAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => setShowAddMembersDialog(true)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add members
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Space settings
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Message Search */}
        <MessageSearch
          conversationId={conversationId}
          spaceId={spaceId}
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onResultClick={(messageId) => {
            // Scroll to the message
            const messageElement = document.getElementById(`message-${messageId}`);
            if (messageElement) {
              messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              messageElement.classList.add('ring-2', 'ring-primary');
              setTimeout(() => {
                messageElement.classList.remove('ring-2', 'ring-primary');
              }, 2000);
            }
          }}
        />

        {/* Messages */}
        <div className="flex-1 relative overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 overflow-y-auto p-4"
            onScroll={handleScroll}
          >
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
              <div className="space-y-1">
                {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date}>
                    <DateSeparator date={dateMessages[0].created_at} />

                    <div className="space-y-1">
                      {dateMessages.map((message, index) => {
                        const isOwn = message.sender_id === currentEmployee?.id;
                        const prevMessage = index > 0 ? dateMessages[index - 1] : null;
                        const nextMessage = index < dateMessages.length - 1 ? dateMessages[index + 1] : null;
                        
                        const isGrouped = shouldGroupMessages(message, prevMessage);
                        const isLastInGroup = !nextMessage || !shouldGroupMessages(nextMessage, message);
                        
                        const messageReactions = reactions[message.id] || {};

                        return (
                          <MessageBubble
                            key={message.id}
                            message={message}
                            isOwn={isOwn}
                            isGrouped={isGrouped}
                            isLastInGroup={isLastInGroup}
                            reactions={messageReactions}
                            isEditing={editingMessageId === message.id}
                            currentEmployeeId={currentEmployee?.id}
                            onEdit={() => setEditingMessageId(message.id)}
                            onCancelEdit={() => setEditingMessageId(null)}
                            onSaveEdit={(content) => {
                              editMessage.mutate({ messageId: message.id, content });
                              setEditingMessageId(null);
                            }}
                            onDelete={() => deleteMessage.mutate(message.id)}
                            onPin={() => togglePin.mutate({ 
                              messageId: message.id, 
                              isPinned: message.is_pinned 
                            })}
                            onReact={(emoji) => toggleReaction.mutate({ 
                              messageId: message.id, 
                              emoji 
                            })}
                            isEditPending={editMessage.isPending}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scroll to bottom button */}
          <ScrollToBottom 
            visible={showScrollToBottom} 
            onClick={scrollToBottom}
          />
        </div>

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
        
        {/* Space Management Dialogs */}
        {activeChat.type === 'space' && spaceId && (
          <>
            <SpaceMembersDialog
              open={showMembersDialog}
              onOpenChange={setShowMembersDialog}
              spaceId={spaceId}
              spaceName={activeChat.name}
              onAddMembers={() => {
                setShowMembersDialog(false);
                setShowAddMembersDialog(true);
              }}
            />
            <AddSpaceMembersDialog
              open={showAddMembersDialog}
              onOpenChange={setShowAddMembersDialog}
              spaceId={spaceId}
              spaceName={activeChat.name}
            />
            <SpaceSettingsDialog
              open={showSettingsDialog}
              onOpenChange={setShowSettingsDialog}
              spaceId={spaceId}
              onDeleted={onBack}
            />
          </>
        )}
      </div>
    </ChatDropZone>
  );
};

export default ConversationView;
