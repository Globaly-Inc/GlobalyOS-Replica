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
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Search,
  MoreVertical,
  Pin,
  History,
  Users,
  Settings,
  UserPlus,
  Camera,
  Pencil,
  BellOff,
  Bell,
  LogOut,
  Info,
} from "lucide-react";
import { format, isToday, isYesterday, differenceInMinutes } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { 
  useMessages, 
  useLoadOlderMessages,
  useTypingUsers, 
  useMarkAsRead,
  useEditMessage,
  useDeleteMessage,
  useMessageReactions,
  useToggleReaction,
  useSpace,
  useSpaceMembers,
  useConversationParticipants,
  useMessageReplyCounts,
  useMuteConversation,
  useLeaveConversation,
  useLeaveSpace,
  useUpdateSpaceNotification,
} from "@/services/useChat";
import { useMessageStars, useToggleMessageStar } from "@/hooks/useMessageStars";
import { useChatInfiniteScroll } from "@/hooks/useChatInfiniteScroll";

import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useChatNotificationPreferences } from "@/hooks/useChatNotificationPreferences";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import MessageComposer from "./MessageComposer";
import MessageBubble from "./MessageBubble";
import DateSeparator from "./DateSeparator";
import ScrollToBottom from "./ScrollToBottom";
import ThreadView from "./ThreadView";
import MessageSearch from "./MessageSearch";
import ChatDropZone from "./ChatDropZone";
import SpaceMembersDialog from "./SpaceMembersDialog";
import AddSpaceMembersDialog from "./AddSpaceMembersDialog";
import SpaceSettingsDialog from "./SpaceSettingsDialog";
import EditGroupChatDialog from "./EditGroupChatDialog";
import TransferAdminDialog from "./TransferAdminDialog";
import type { ActiveChat, ChatMessage, ChatSpaceMember } from "@/types/chat";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { showErrorToast } from "@/lib/errorUtils";

interface OtherParticipant {
  id: string;
  position: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

interface ConversationViewProps {
  activeChat: ActiveChat;
  onBack: () => void;
  onToggleRightPanel: () => void;
  highlightMessageId?: string;
  onOpenThread?: (message: ChatMessage) => void;
  activeThreadMessage?: ChatMessage | null;
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

const ConversationView = ({ 
  activeChat, 
  onBack, 
  onToggleRightPanel, 
  highlightMessageId,
  onOpenThread,
  activeThreadMessage: externalActiveThreadMessage,
}: ConversationViewProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<{ addFiles: (files: File[]) => void } | null>(null);
  const initialScrollDoneRef = useRef(false);
  const { data: currentEmployee } = useCurrentEmployee();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Chat notification sound hooks
  const { shouldPlayChatSound, preferences: chatPreferences } = useChatNotificationPreferences();
  const { playNotificationSound } = useNotificationSound();
  
  const { data: messageStars = [] } = useMessageStars();
  const toggleStar = useToggleMessageStar();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const toggleReaction = useToggleReaction();
  const markAsRead = useMarkAsRead();
  const muteConversation = useMuteConversation();
  const leaveConversation = useLeaveConversation();
  const leaveSpace = useLeaveSpace();
  const updateSpaceNotification = useUpdateSpaceNotification();
  const loadOlderMessages = useLoadOlderMessages();
  
  const [otherParticipant, setOtherParticipant] = useState<OtherParticipant | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [groupIconUrl, setGroupIconUrl] = useState<string | null>(activeChat.iconUrl || null);
  const [groupName, setGroupName] = useState(activeChat.name);
  // Use internal state for mobile, external for desktop
  const [internalActiveThreadMessage, setInternalActiveThreadMessage] = useState<ChatMessage | null>(null);
  const activeThreadMessage = isMobile ? internalActiveThreadMessage : externalActiveThreadMessage;
  const setActiveThreadMessage = isMobile ? setInternalActiveThreadMessage : (onOpenThread || (() => {}));
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showTransferAdminDialog, setShowTransferAdminDialog] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  
  const conversationId = activeChat.type === 'conversation' ? activeChat.id : null;
  const spaceId = activeChat.type === 'space' ? activeChat.id : null;
  
  const { data: messages = [], isLoading } = useMessages(conversationId, spaceId);
  const { data: typingUsers = [] } = useTypingUsers(conversationId, spaceId);
  const { data: reactions = {} } = useMessageReactions(conversationId, spaceId);
  const { data: space } = useSpace(spaceId);
  const { data: spaceMembers = [] } = useSpaceMembers(spaceId);
  const { data: conversationParticipants = [] } = useConversationParticipants(activeChat.isGroup ? conversationId : null);
  const { data: replyCounts = {} } = useMessageReplyCounts(conversationId, spaceId);

  // Load older messages callback
  const handleLoadOlderMessages = useCallback(() => {
    if (messages.length > 0 && hasMoreMessages && !loadOlderMessages.isPending) {
      const oldestMessage = messages[0];
      loadOlderMessages.mutate(
        { 
          conversationId: conversationId || undefined, 
          spaceId: spaceId || undefined, 
          beforeDate: oldestMessage.created_at 
        },
        {
          onSuccess: (result) => {
            setHasMoreMessages(result.hasMore);
            preserveScrollPosition();
          }
        }
      );
    }
  }, [messages, hasMoreMessages, loadOlderMessages, conversationId, spaceId]);

  // Infinite scroll hook
  const {
    scrollContainerRef,
    scrollToBottom,
    preserveScrollPosition,
    isAtBottom,
    showScrollToBottom,
    handleScroll,
  } = useChatInfiniteScroll({
    onLoadMore: handleLoadOlderMessages,
    hasMore: hasMoreMessages,
    isLoading: loadOlderMessages.isPending,
    threshold: 200,
  });
  
  // Check if current user is a space admin and calculate admin count
  const currentMembership = spaceMembers.find(m => m.employee_id === currentEmployee?.id);
  const isSpaceAdmin = currentMembership?.role === 'admin';
  const spaceNotificationSetting = currentMembership?.notification_setting || 'all';
  
  // Count admins and get non-admin members for transfer
  const adminCount = spaceMembers.filter(m => m.role === 'admin').length;
  const nonAdminMembers = spaceMembers.filter(m => 
    m.role !== 'admin' && m.employee_id !== currentEmployee?.id
  ) as ChatSpaceMember[];
  
  // Can admin leave: either there are 2+ admins, or they transfer first
  const canAdminLeaveDirectly = adminCount >= 2;

  // Handle mute toggle for conversations
  const handleToggleMute = async () => {
    if (conversationId) {
      await muteConversation.mutateAsync({ conversationId, mute: !isMuted });
      setIsMuted(!isMuted);
    }
  };

  // Handle space notification toggle (mute = 'mute', unmute = 'all')
  const handleToggleSpaceMute = async () => {
    if (spaceId) {
      const newSetting = spaceNotificationSetting === 'mute' ? 'all' : 'mute';
      await updateSpaceNotification.mutateAsync({ spaceId, setting: newSetting });
    }
  };

  // Handle leave conversation/space
  const handleLeave = async () => {
    try {
      if (conversationId) {
        await leaveConversation.mutateAsync(conversationId);
        onBack();
      } else if (spaceId) {
        await leaveSpace.mutateAsync(spaceId);
        onBack();
      }
      setShowLeaveConfirm(false);
    } catch (error) {
      showErrorToast(error, "Failed to leave chat", {
        componentName: "ConversationView",
        actionAttempted: activeChat.type === 'space' ? "Leave space" : "Leave conversation",
        errorType: "database",
      });
    }
  };

  const handleFilesDropped = useCallback((files: File[]) => {
    composerRef.current?.addFiles(files);
  }, []);

  // Mark as read when viewing conversation - immediate execution
  useEffect(() => {
    if (conversationId || spaceId) {
      markAsRead.mutate({ conversationId: conversationId || undefined, spaceId: spaceId || undefined });
    }
    // Reset scroll tracking for new conversations
    initialScrollDoneRef.current = false;
    setHasMoreMessages(true);
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
        .select('full_name, avatar_url')
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
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        is_online: isOnline,
      });
    };

    fetchOtherParticipant();
  }, [activeChat, currentEmployee?.id]);

  // Update local state when activeChat changes
  useEffect(() => {
    setGroupIconUrl(activeChat.iconUrl || null);
    setGroupName(activeChat.name);
  }, [activeChat.id, activeChat.iconUrl, activeChat.name]);

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

  // Subscribe to real-time messages with delta sync (merge instead of refetch)
  useEffect(() => {
    const filter = conversationId 
      ? `conversation_id=eq.${conversationId}`
      : `space_id=eq.${spaceId}`;

    const channel = supabase
      .channel(`chat-messages-${conversationId || spaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Skip if it's our own optimistic message (temp id)
          if (newMessage.sender_id === currentEmployee?.id) {
            // Just remove temp messages and let the real one through
            queryClient.setQueryData<ChatMessage[]>(
              ['chat-messages', conversationId, spaceId],
              (old) => old?.filter(m => !m.id.startsWith('temp-')) || []
            );
          } else {
            // Play sound for incoming messages from others
            const messageType = conversationId ? 'dm' : 'space';
            if (shouldPlayChatSound(messageType)) {
              playNotificationSound(chatPreferences.soundType, chatPreferences.soundVolume);
            }
          }
          
          // Fetch sender info for the new message
          const { data: senderData } = await supabase
            .from('employees')
            .select(`
              id,
              user_id,
              position,
              profiles:user_id (
                full_name,
                avatar_url
              )
            `)
            .eq('id', newMessage.sender_id)
            .single();

          // Merge new message into cache
          queryClient.setQueryData<ChatMessage[]>(
            ['chat-messages', conversationId, spaceId],
            (old) => {
              if (!old) return [{ ...newMessage, sender: senderData, attachments: [] }];
              // Check if message already exists
              const exists = old.some(m => m.id === newMessage.id);
              if (exists) return old;
              // Remove any temp messages and add real one
              const filtered = old.filter(m => !m.id.startsWith('temp-'));
              return [...filtered, { ...newMessage, sender: senderData, attachments: [] }];
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter
        },
        (payload) => {
          const updatedMessage = payload.new as any;
          // Merge update into cache
          queryClient.setQueryData<ChatMessage[]>(
            ['chat-messages', conversationId, spaceId],
            (old) => old?.map(m => m.id === updatedMessage.id 
              ? { ...m, ...updatedMessage } 
              : m
            ) || []
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter
        },
        (payload) => {
          const deletedMessage = payload.old as any;
          // Remove from cache
          queryClient.setQueryData<ChatMessage[]>(
            ['chat-messages', conversationId, spaceId],
            (old) => old?.filter(m => m.id !== deletedMessage.id) || []
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_attachments'
        },
        (payload) => {
          const newAttachment = payload.new as any;
          // Add attachment to the message in cache
          queryClient.setQueryData<ChatMessage[]>(
            ['chat-messages', conversationId, spaceId],
            (old) => old?.map(m => m.id === newAttachment.message_id 
              ? { ...m, attachments: [...(m.attachments || []), newAttachment] }
              : m
            ) || []
          );
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
          // For reactions, still use invalidate as it's complex to merge
          queryClient.invalidateQueries({ queryKey: ['chat-reactions', conversationId, spaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, spaceId, queryClient, currentEmployee?.id]);

  // Auto-scroll to bottom on new messages only if already at bottom
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  // Initial scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0 && !initialScrollDoneRef.current && !isLoading) {
      if (highlightMessageId) {
        // Wait for messages to render, then scroll to the highlighted message
        setTimeout(() => {
          const messageElement = document.getElementById(`message-${highlightMessageId}`);
          if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messageElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
            setTimeout(() => {
              messageElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
            }, 2500);
          }
        }, 100);
      } else {
        // Scroll to bottom on initial load
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }
      initialScrollDoneRef.current = true;
    }
  }, [messages.length, isLoading, highlightMessageId, scrollToBottom]);

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
      <div className="flex h-full bg-background overflow-hidden">
        {/* Main conversation area */}
        <div className={cn(
          "flex flex-col h-full bg-background overflow-hidden",
          activeThreadMessage ? "flex-1" : "w-full"
        )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden h-9 w-9 flex-shrink-0"
              onClick={onBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {activeChat.type === 'conversation' && !activeChat.isGroup ? (
              // Direct message - show other participant
              <div className="relative flex-shrink-0">
                <Avatar className="h-9 w-9 md:h-10 md:w-10">
                  <AvatarImage src={otherParticipant?.avatar_url || undefined} alt={activeChat.name} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {getInitials(activeChat.name)}
                  </AvatarFallback>
                </Avatar>
                {otherParticipant?.is_online && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 md:h-3 md:w-3 rounded-full bg-green-500 border-2 border-card" />
                )}
              </div>
            ) : activeChat.type === 'conversation' && activeChat.isGroup ? (
              // Group chat - show group icon with edit option
              <div 
                className="relative h-9 w-9 md:h-10 md:w-10 rounded-full cursor-pointer group flex-shrink-0"
                onClick={() => !isMobile && setShowEditGroupDialog(true)}
              >
                {groupIconUrl ? (
                  <img 
                    src={groupIconUrl} 
                    alt={groupName} 
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full w-full rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(groupName || "GC")}
                  </div>
                )}
                {!isMobile && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ) : (
              // Space
              <div className="flex items-center justify-center h-9 w-9 md:h-10 md:w-10 rounded bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
                {space?.icon_url ? (
                  <img src={space.icon_url} alt={activeChat.name} className="h-full w-full object-cover" />
                ) : (
                  activeChat.name.charAt(0).toUpperCase()
                )}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              {activeChat.type === 'conversation' && activeChat.isGroup ? (
                // Group chat info
                <div 
                  className={!isMobile ? "cursor-pointer hover:opacity-80" : ""}
                  onClick={() => !isMobile && setShowEditGroupDialog(true)}
                >
                  <h2 className="font-semibold text-foreground text-sm md:text-base flex items-center gap-1 truncate">
                    {groupName}
                    {!isMobile && <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                  </h2>
                  {!isMobile && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conversationParticipants
                        .filter(p => p.employee_id !== currentEmployee?.id)
                        .map(p => p.employee?.profiles?.full_name?.split(' ')[0])
                        .filter(Boolean)
                        .join(', ') || 'Group members'}
                    </p>
                  )}
                </div>
              ) : activeChat.type === 'conversation' ? (
                // Direct message info
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-semibold text-foreground text-sm md:text-base truncate">{activeChat.name}</h2>
                    {isMobile && otherParticipant?.is_online && (
                      <span className="text-xs text-green-500">• Online</span>
                    )}
                  </div>
                  {!isMobile && otherParticipant?.position && (
                    <p className="text-xs text-muted-foreground">{otherParticipant.position}</p>
                  )}
                </div>
              ) : (
                // Space info
                <div>
                  <h2 className="font-semibold text-foreground text-sm md:text-base truncate">{activeChat.name}</h2>
                  {!isMobile && (
                    <p className="text-xs text-muted-foreground">
                      {spaceMembers.length} member{spaceMembers.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowSearch(!showSearch)}
              className={`h-9 w-9 ${showSearch ? "bg-accent" : ""}`}
            >
              <Search className="h-4 w-4" />
            </Button>
            
            {/* Mobile: Show info button and more menu button */}
            {isMobile && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onToggleRightPanel}
                  className="h-9 w-9"
                >
                  <Info className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowMobileMenu(true)}
                  className="h-9 w-9"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </>
            )}
            
            
            {/* Desktop: No dropdown - moved to right sidebar */}
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
            className="absolute inset-0 overflow-y-auto px-1 md:px-4 py-4"
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
                {/* Loading older messages indicator */}
                {loadOlderMessages.isPending && (
                  <div className="flex justify-center py-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Loading older messages...
                    </div>
                  </div>
                )}
                {!hasMoreMessages && messages.length > 0 && (
                  <div className="flex justify-center py-4">
                    <span className="text-xs text-muted-foreground">Beginning of conversation</span>
                  </div>
                )}
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

                        // Check if this message is starred by current user
                        const isStarred = messageStars.some(s => s.message_id === message.id);

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
                            onPin={() => toggleStar.mutate(message.id)}
                            isPinned={isStarred}
                            onReact={(emoji) => toggleReaction.mutate({ 
                              messageId: message.id, 
                              emoji 
                            })}
                            onReply={() => setActiveThreadMessage(message)}
                            replyCount={replyCounts[message.id]}
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

        {/* Typing Indicator - Improved animation */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 bg-muted/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '200ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" style={{ animationDelay: '400ms' }} />
              </div>
              <span className="text-xs">
                {typingUsers.length === 1
                  ? `${typingUsers[0].name} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                  : `${typingUsers[0].name} and ${typingUsers.length - 1} others are typing...`}
              </span>
            </div>
          </div>
        )}

        {/* Message Composer with safe area and bottom nav clearance */}
        <div className="pb-16 md:pb-0 safe-area-bottom">
          <MessageComposer 
            ref={composerRef}
            conversationId={conversationId}
            spaceId={spaceId}
          />
        </div>
        
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
        
        {/* Edit Group Chat Dialog */}
        {activeChat.type === 'conversation' && activeChat.isGroup && conversationId && (
          <EditGroupChatDialog
            open={showEditGroupDialog}
            onOpenChange={setShowEditGroupDialog}
            conversationId={conversationId}
            currentName={groupName}
            currentIconUrl={groupIconUrl}
            onUpdated={(name, iconUrl) => {
              setGroupName(name);
              setGroupIconUrl(iconUrl);
            }}
          />
        )}
        </div>
        
        {/* Thread View Panel - Desktop: Now rendered in parent Chat.tsx */}
        
        {/* Thread View Sheet - Mobile */}
        <Sheet open={!!activeThreadMessage && isMobile} onOpenChange={(open) => !open && setActiveThreadMessage(null)}>
          <SheetContent side="right" className="w-full sm:max-w-full p-0 border-0">
            {activeThreadMessage && (
              <ThreadView
                parentMessage={activeThreadMessage}
                conversationId={conversationId}
                spaceId={spaceId}
                onClose={() => setActiveThreadMessage(null)}
              />
            )}
          </SheetContent>
        </Sheet>
        
        {/* Mobile Actions Menu Sheet */}
        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
          <SheetContent side="bottom" className="rounded-t-2xl px-0 pb-8">
            {/* Header with chat info */}
            <div className="flex items-center gap-3 px-4 pb-4 border-b mb-2">
              {activeChat.type === 'conversation' && !activeChat.isGroup ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={otherParticipant?.avatar_url || undefined} alt={activeChat.name} />
                  <AvatarFallback className="text-sm bg-primary/10 text-primary">
                    {getInitials(activeChat.name)}
                  </AvatarFallback>
                </Avatar>
              ) : activeChat.type === 'conversation' && activeChat.isGroup ? (
                groupIconUrl ? (
                  <img src={groupIconUrl} alt={groupName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(groupName || "GC")}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-10 w-10 rounded bg-primary/10 text-primary font-semibold text-sm">
                  {activeChat.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{activeChat.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {activeChat.type === 'space' 
                    ? `${spaceMembers.length} member${spaceMembers.length !== 1 ? 's' : ''}`
                    : activeChat.isGroup 
                      ? `${conversationParticipants.length} members`
                      : otherParticipant?.position || 'Direct message'
                  }
                </p>
              </div>
            </div>
            
            {/* Action items */}
            <div className="py-2 space-y-1">
              
              {/* Pinned messages */}
              <button 
                onClick={() => { 
                  onToggleRightPanel(); 
                  setShowMobileMenu(false); 
                }}
                className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left"
              >
                <Pin className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Pinned messages</span>
              </button>
              
              {/* Edit group option */}
              {activeChat.type === 'conversation' && activeChat.isGroup && (
                <button 
                  onClick={() => { 
                    setShowEditGroupDialog(true); 
                    setShowMobileMenu(false); 
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left"
                >
                  <Pencil className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Edit group</span>
                </button>
              )}
              
              {/* Space management options */}
              {activeChat.type === 'space' && (
                <>
                  <button 
                    onClick={() => { 
                      setShowMembersDialog(true); 
                      setShowMobileMenu(false); 
                    }}
                    className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left"
                  >
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">View members</span>
                  </button>
                  
                  {isSpaceAdmin && (
                    <>
                      <button 
                        onClick={() => { 
                          setShowAddMembersDialog(true); 
                          setShowMobileMenu(false); 
                        }}
                        className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left"
                      >
                        <UserPlus className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Add members</span>
                      </button>
                      
                      <div className="border-t my-2 mx-4" />
                      
                      <button 
                        onClick={() => { 
                          setShowSettingsDialog(true); 
                          setShowMobileMenu(false); 
                        }}
                        className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left"
                      >
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Space settings</span>
                      </button>
                    </>
                  )}
                </>
              )}
              
              {/* Mute/Leave options */}
              <div className="border-t my-2 mx-4" />
              
              {activeChat.type === 'conversation' && (
                <button 
                  onClick={() => { 
                    handleToggleMute(); 
                    setShowMobileMenu(false); 
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left"
                >
                  {isMuted ? (
                    <>
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Unmute chat</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Mute chat</span>
                    </>
                  )}
                </button>
              )}
              
              {activeChat.type === 'space' && (
                <button 
                  onClick={() => { 
                    handleToggleSpaceMute(); 
                    setShowMobileMenu(false); 
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left"
                >
                  {spaceNotificationSetting === 'mute' ? (
                    <>
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Unmute notifications</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Mute notifications</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Leave option for group chats and space members */}
              {activeChat.isGroup && (
                <button 
                  onClick={() => { 
                    setShowLeaveConfirm(true); 
                    setShowMobileMenu(false); 
                  }}
                  className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium">Leave group</span>
                </button>
              )}
              
              {activeChat.type === 'space' && (
                isSpaceAdmin ? (
                  canAdminLeaveDirectly ? (
                    <button 
                      onClick={() => { 
                        setShowLeaveConfirm(true); 
                        setShowMobileMenu(false); 
                      }}
                      className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left text-destructive"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Leave space</span>
                    </button>
                  ) : nonAdminMembers.length > 0 ? (
                    <button 
                      onClick={() => { 
                        setShowTransferAdminDialog(true); 
                        setShowMobileMenu(false); 
                      }}
                      className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left text-destructive"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Leave space (transfer admin)</span>
                    </button>
                  ) : (
                    <button 
                      disabled
                      className="flex items-center gap-4 w-full px-4 py-3 text-left text-muted-foreground cursor-not-allowed"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Cannot leave (only member)</span>
                    </button>
                  )
                ) : (
                  <button 
                    onClick={() => { 
                      setShowLeaveConfirm(true); 
                      setShowMobileMenu(false); 
                    }}
                    className="flex items-center gap-4 w-full px-4 py-3 hover:bg-muted active:bg-muted text-left text-destructive"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Leave space</span>
                  </button>
                )
              )}
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Leave Confirmation Dialog */}
        <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Leave {activeChat.type === 'space' ? 'space' : 'group'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You won't receive any more messages from this {activeChat.type === 'space' ? 'space' : 'group'}. 
                {activeChat.type === 'space' && " You can rejoin later if it's a public space."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleLeave}
                disabled={leaveConversation.isPending || leaveSpace.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {(leaveConversation.isPending || leaveSpace.isPending) ? "Leaving..." : "Leave"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Transfer Admin Dialog */}
        {spaceId && (
          <TransferAdminDialog
            open={showTransferAdminDialog}
            onOpenChange={setShowTransferAdminDialog}
            spaceId={spaceId}
            spaceName={activeChat.name}
            members={nonAdminMembers}
            onTransferComplete={() => {
              setShowTransferAdminDialog(false);
              onBack();
            }}
          />
        )}
      </div>
    </ChatDropZone>
  );
};

export default ConversationView;
