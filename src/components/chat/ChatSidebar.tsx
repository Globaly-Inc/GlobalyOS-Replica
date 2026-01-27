import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MessageSquarePlus,
  AtSign,
  Bookmark,
  Hash,
  Users,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Settings,
  BellOff,
  FolderCog,
  MoreVertical,
  Archive,
  Trash2,
  Megaphone,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, useSpaces, useUnreadCounts, useCreateConversation, useArchiveSpace, useDeleteSpace, useLeaveSpace, useTotalUnreadCount } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatConversation, ActiveChat, ChatSpace } from "@/types/chat";
import { ChatSettingsDialog } from "./ChatSettingsDialog";
import GlobalChatSearch from "./GlobalChatSearch";
import BrowseSpacesDialog from "./BrowseSpacesDialog";
import FavoritesSection from "./FavoritesSection";
import ManageSpacesDialog from "./ManageSpacesDialog";
import type { GlobalSearchResult } from "@/hooks/useGlobalChatSearch";
import { toast } from "sonner";

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
  const [manageSpacesOpen, setManageSpacesOpen] = useState(false);
  const [deleteConfirmSpace, setDeleteConfirmSpace] = useState<ChatSpace | null>(null);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  
  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: spaces = [], isLoading: loadingSpaces, error: spacesError } = useSpaces();
  const { data: unreadCounts } = useUnreadCounts();
  const { data: currentEmployee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  const { isOwner, isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const createConversation = useCreateConversation();
  const archiveSpace = useArchiveSpace();
  const deleteSpace = useDeleteSpace();
  const leaveSpaceMutation = useLeaveSpace();
  const { data: totalUnread = 0 } = useTotalUnreadCount();

  // Detect when new messages arrive for pulsing effect
  useEffect(() => {
    if (totalUnread > prevUnreadCount && prevUnreadCount > 0) {
      setHasNewMessages(true);
      const timer = setTimeout(() => setHasNewMessages(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevUnreadCount(totalUnread);
  }, [totalUnread, prevUnreadCount]);

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
              onClick={() => onSelectChat({ type: 'unread', id: 'unread', name: 'Unread' })}
              className={cn(
                "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                activeChat?.type === 'unread'
                  ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
                  : "hover:bg-muted/60 text-foreground/80"
              )}
            >
              <div className="relative">
                <MessageCircle className="h-4 w-4" />
                {hasNewMessages && totalUnread > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive animate-pulse-dot" />
                )}
              </div>
              Unread
              {totalUnread > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-[10px]">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </Badge>
              )}
            </button>
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
              <Bookmark className="h-4 w-4" />
              Starred
            </button>
          </div>
        </div>

        <Separator className="mx-3" />

        {/* Favorites Section */}
        <FavoritesSection
          activeChat={activeChat}
          onSelectChat={onSelectChat}
          onlineStatuses={onlineStatuses}
        />

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
                <div className="space-y-1 px-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 bg-muted/50 rounded-md animate-pulse" />
                  ))}
                </div>
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
            <div className="flex items-center gap-0.5">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => setBrowseSpacesOpen(true)}
                title="Browse spaces"
              >
                <Search className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={onNewSpace}
                title="Create space"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {spacesExpanded && (
            <div className="space-y-0.5">
              {spacesError ? (
                <div className="text-sm text-destructive px-2 py-2">
                  Failed to load spaces
                </div>
              ) : loadingSpaces ? (
                <div className="space-y-1 px-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 bg-muted/50 rounded-md animate-pulse" />
                  ))}
                </div>
              ) : spaces.length === 0 ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <Hash className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No spaces yet</p>
                  <Button variant="link" size="sm" onClick={onNewSpace}>
                    Create your first space
                  </Button>
                </div>
              ) : (
                spaces.map((space) => {
                  const isActive = activeChat?.type === 'space' && activeChat.id === space.id;
                  const hasUnread = (unreadCounts?.spaces[space.id] || 0) > 0;
                  const canManage = isOwner || isAdmin || 
                    (space as any).chat_space_members?.some(
                      (m: any) => m.employee_id === currentEmployee?.id && m.role === 'admin'
                    );
                  
                  return (
                    <div key={space.id} className="group relative flex items-center">
                      <button
                        onClick={() => onSelectChat({ 
                          type: 'space', 
                          id: space.id, 
                          name: space.name,
                          iconUrl: space.icon_url 
                        })}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors pr-8",
                          isActive 
                            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                            : "hover:bg-muted/60",
                          hasUnread && !isActive && "font-semibold text-foreground"
                        )}
                      >
                        {space.icon_url ? (
                          <img 
                            src={space.icon_url} 
                            alt="" 
                            className="h-4 w-4 rounded flex-shrink-0" 
                          />
                        ) : (
                          <Hash className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate flex-1 text-left">{space.name}</span>
                        {space.space_type === 'announcements' && (
                          <Megaphone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                        {hasUnread && (
                          <Badge 
                            variant="destructive" 
                            className="h-5 min-w-[20px] px-1.5 text-[10px]"
                          >
                            {unreadCounts?.spaces[space.id]}
                          </Badge>
                        )}
                      </button>
                      
                      {/* Quick Actions - visible on hover */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {canManage ? (
                            <>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveSpace.mutate(space.id, {
                                    onSuccess: () => toast.success("Space archived"),
                                    onError: () => toast.error("Failed to archive space")
                                  });
                                }}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmSpace(space);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                leaveSpaceMutation.mutate(space.id, {
                                  onSuccess: () => {
                                    toast.success("Left space");
                                    // If we left the active chat, clear selection
                                    if (activeChat?.type === 'space' && activeChat.id === space.id) {
                                      onSelectChat({ type: 'mentions', id: 'mentions', name: 'Mentions' });
                                    }
                                  },
                                  onError: () => toast.error("Failed to leave space")
                                });
                              }}
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Leave space
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })
              )}

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

      {/* Manage All Spaces Dialog - Owner/Admin only */}
      {(isOwner || isAdmin) && (
        <ManageSpacesDialog
          open={manageSpacesOpen}
          onOpenChange={setManageSpacesOpen}
          onSelectChat={onSelectChat}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmSpace} onOpenChange={() => setDeleteConfirmSpace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteConfirmSpace?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All messages, files, and members will be permanently removed from this space.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmSpace) {
                  deleteSpace.mutate(deleteConfirmSpace.id, {
                    onSuccess: () => {
                      toast.success("Space deleted");
                      setDeleteConfirmSpace(null);
                      // If we deleted the active chat, clear selection
                      if (activeChat?.type === 'space' && activeChat.id === deleteConfirmSpace.id) {
                        onSelectChat({ type: 'mentions', id: 'mentions', name: 'Mentions' });
                      }
                    },
                    onError: () => toast.error("Failed to delete space")
                  });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChatSidebar;
