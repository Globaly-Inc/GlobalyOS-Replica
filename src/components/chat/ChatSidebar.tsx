import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquarePlus,
  AtSign,
  Star,
  Hash,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  BellOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, useSpaces, useUnreadCounts, useCreateConversation } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatConversation, ActiveChat } from "@/types/chat";
import { ChatSettingsDialog } from "./ChatSettingsDialog";
import GlobalChatSearch from "./GlobalChatSearch";
import BrowseSpacesDialog from "./BrowseSpacesDialog";
import type { GlobalSearchResult } from "@/hooks/useGlobalChatSearch";

interface ChatSidebarProps {
  activeChat: ActiveChat | null;
  onSelectChat: (chat: ActiveChat, highlightMessageId?: string) => void;
  onNewChat: () => void;
  onNewSpace: () => void;
}

const ChatSidebar = ({ activeChat, onSelectChat, onNewChat, onNewSpace }: ChatSidebarProps) => {
  const [dmExpanded, setDmExpanded] = useState(true);
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [browseSpacesOpen, setBrowseSpacesOpen] = useState(false);
  
  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: spaces = [], isLoading: loadingSpaces } = useSpaces();
  const { data: unreadCounts } = useUnreadCounts();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();
  const createConversation = useCreateConversation();

  // Fetch online statuses for all conversation participants
  useEffect(() => {
    const fetchOnlineStatuses = async () => {
      if (!conversations.length || !currentEmployee?.id) return;

      const otherEmployeeIds = conversations
        .filter(conv => !conv.is_group)
        .map(conv => {
          const other = conv.participants?.find(p => p.employee_id !== currentEmployee.id);
          return other?.employee_id;
        })
        .filter(Boolean) as string[];

      if (!otherEmployeeIds.length) return;

      const { data: presences } = await supabase
        .from('chat_presence')
        .select('employee_id, is_online, last_seen_at')
        .in('employee_id', otherEmployeeIds);

      if (presences) {
        const statusMap: Record<string, boolean> = {};
        const now = new Date();
        presences.forEach(p => {
          const lastSeen = new Date(p.last_seen_at);
          const isStale = (now.getTime() - lastSeen.getTime()) > 60000;
          statusMap[p.employee_id] = p.is_online && !isStale;
        });
        setOnlineStatuses(statusMap);
      }
    };

    fetchOnlineStatuses();
  }, [conversations, currentEmployee?.id]);

  // Subscribe to presence changes
  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel('chat-sidebar-presence')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_presence',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        (payload: any) => {
          if (payload.new?.employee_id) {
            setOnlineStatuses(prev => ({
              ...prev,
              [payload.new.employee_id]: payload.new.is_online
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id]);

  const getOtherParticipantId = (conv: ChatConversation) => {
    if (conv.is_group) return null;
    const other = conv.participants?.find(p => p.employee_id !== currentEmployee?.id);
    return other?.employee_id || null;
  };

  // Realtime subscription for conversations, messages, and spaces
  useEffect(() => {
    if (!currentOrg?.id) return;

    const channel = supabase
      .channel('chat-sidebar-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-conversations', currentOrg.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-counts', currentOrg.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_spaces',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-spaces', currentOrg.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_space_members',
          filter: `organization_id=eq.${currentOrg.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-spaces', currentOrg.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOrg?.id, queryClient]);

  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name;
    if (conv.is_group) return "Group Chat";
    
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.full_name || "Unknown";
  };

  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.is_group) return conv.icon_url || null;
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.avatar_url;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSearchResult = (result: GlobalSearchResult, chat: ActiveChat) => {
    if (result.type === 'message' && result.messageId) {
      onSelectChat(chat, result.messageId);
    } else {
      onSelectChat(chat);
    }
  };

  const handleStartDM = async (employeeId: string, name: string) => {
    if (!currentEmployee?.id || !currentOrg?.id) return;

    const existingConv = conversations.find(conv => {
      if (conv.is_group) return false;
      return conv.participants?.some(p => p.employee_id === employeeId);
    });

    if (existingConv) {
      onSelectChat({
        type: 'conversation',
        id: existingConv.id,
        name: getConversationName(existingConv),
        isGroup: false,
      });
    } else {
      createConversation.mutate(
        {
          participantIds: [employeeId],
          isGroup: false,
        },
        {
          onSuccess: (newConv) => {
            onSelectChat({
              type: 'conversation',
              id: newConv.id,
              name,
              isGroup: false,
            });
          },
        }
      );
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header with Settings and New Chat */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 justify-start gap-2"
            onClick={onNewChat}
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
        </div>
      </div>

      <ChatSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Global Search */}
      <div className="p-3 pb-0">
        <GlobalChatSearch
          onSelectResult={handleSearchResult}
          onStartDM={handleStartDM}
        />
      </div>

      <ScrollArea className="flex-1">
        {/* Shortcuts */}
        <div className="px-3 py-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Shortcuts
          </p>
          <div className="space-y-0.5">
            <button
              onClick={() => onSelectChat({ type: 'mentions', id: 'mentions', name: 'Mentions' })}
              className={cn(
                "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                activeChat?.type === 'mentions'
                  ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                  : "hover:bg-muted/60 text-foreground/80"
              )}
            >
              <AtSign className="h-4 w-4" />
              Mentions
            </button>
            <button
              onClick={() => onSelectChat({ type: 'starred', id: 'starred', name: 'Starred' })}
              className={cn(
                "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                activeChat?.type === 'starred'
                  ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                  : "hover:bg-muted/60 text-foreground/80"
              )}
            >
              <Star className="h-4 w-4" />
              Starred
            </button>
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Direct Messages */}
        <div className="px-3 py-3">
          <button 
            className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 hover:text-foreground transition-colors"
            onClick={() => setDmExpanded(!dmExpanded)}
          >
            {dmExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Direct messages
          </button>
          
          {dmExpanded && (
            <div className="space-y-0.5">
              {loadingConversations ? (
                <p className="text-sm text-muted-foreground px-2">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">No conversations yet</p>
              ) : (
                conversations.map((conv) => {
                  const name = getConversationName(conv);
                  const avatar = getConversationAvatar(conv);
                  const isActive = activeChat?.type === 'conversation' && activeChat.id === conv.id;
                  const hasUnread = (unreadCounts?.conversations[conv.id] || 0) > 0;
                  const isMuted = (conv as any).is_muted;
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => onSelectChat({ 
                        type: 'conversation', 
                        id: conv.id, 
                        name,
                        isGroup: conv.is_group,
                        iconUrl: conv.is_group ? conv.icon_url : undefined
                      })}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-muted/60",
                        hasUnread && !isActive && "font-semibold text-foreground"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={avatar || undefined} />
                          <AvatarFallback className="text-[10px] bg-muted">
                            {conv.is_group ? <Users className="h-3 w-3" /> : getInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        {!conv.is_group && onlineStatuses[getOtherParticipantId(conv) || ''] && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border-[1.5px] border-card" />
                        )}
                      </div>
                      <span className="truncate flex-1 text-left">{name}</span>
                      {isMuted && (
                        <BellOff className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                      {hasUnread && (
                        <Badge 
                          variant="destructive" 
                          className="h-5 min-w-[20px] px-1.5 text-[10px]"
                        >
                          {unreadCounts?.conversations[conv.id]}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <Separator className="mx-3" />

        {/* Spaces */}
        <div className="px-3 py-3">
          <div className="flex items-center justify-between mb-2 px-2">
            <button 
              className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              onClick={() => setSpacesExpanded(!spacesExpanded)}
            >
              {spacesExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Spaces
            </button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5"
              onClick={onNewSpace}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          {spacesExpanded && (
            <div className="space-y-0.5">
              {loadingSpaces ? (
                <p className="text-sm text-muted-foreground px-2">Loading...</p>
              ) : spaces.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">No spaces yet</p>
              ) : (
                spaces.map((space) => {
                  const isActive = activeChat?.type === 'space' && activeChat.id === space.id;
                  const hasUnread = (unreadCounts?.spaces[space.id] || 0) > 0;
                  
                  return (
                    <button
                      key={space.id}
                      onClick={() => onSelectChat({ 
                        type: 'space', 
                        id: space.id, 
                        name: space.name 
                      })}
                      className={cn(
                        "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive 
                          ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                          : "hover:bg-muted/60",
                        hasUnread && !isActive && "font-semibold text-foreground"
                      )}
                    >
                      <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1 text-left">{space.name}</span>
                      {hasUnread && (
                        <Badge 
                          variant="destructive" 
                          className="h-5 min-w-[20px] px-1.5 text-[10px]"
                        >
                          {unreadCounts?.spaces[space.id]}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground mt-1"
                onClick={() => setBrowseSpacesOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Browse spaces
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Browse Spaces Dialog */}
      <BrowseSpacesDialog
        open={browseSpacesOpen}
        onOpenChange={setBrowseSpacesOpen}
        onSpaceJoined={onSelectChat}
      />
    </div>
  );
};

export default ChatSidebar;
