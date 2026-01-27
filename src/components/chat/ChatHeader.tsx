import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Search,
  Bell,
  BellOff,
  Star,
  Pencil,
  Camera,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useChatFavorites, useToggleFavorite } from "@/hooks/useChatFavorites";
import { 
  useSpace,
  useSpaceMembers,
  useConversationParticipants,
  useMuteConversation,
  useUpdateSpaceNotification,
} from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { supabase } from "@/integrations/supabase/client";
import MessageSearch from "./MessageSearch";
import EditGroupChatDialog from "./EditGroupChatDialog";
import type { ActiveChat } from "@/types/chat";

interface OtherParticipant {
  id: string;
  position: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_online: boolean;
}

interface ChatHeaderProps {
  activeChat: ActiveChat;
  onSearchResultClick?: (messageId: string) => void;
}

const ChatHeader = ({ activeChat, onSearchResultClick }: ChatHeaderProps) => {
  const { data: currentEmployee } = useCurrentEmployee();
  const { data: favorites = [] } = useChatFavorites();
  const toggleFavorite = useToggleFavorite();
  const muteConversation = useMuteConversation();
  const updateSpaceNotification = useUpdateSpaceNotification();
  
  const [otherParticipant, setOtherParticipant] = useState<OtherParticipant | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showEditGroupDialog, setShowEditGroupDialog] = useState(false);
  const [groupIconUrl, setGroupIconUrl] = useState<string | null>(activeChat.iconUrl || null);
  const [groupName, setGroupName] = useState(activeChat.name);
  const [isMuted, setIsMuted] = useState(false);

  const conversationId = activeChat.type === 'conversation' ? activeChat.id : null;
  const spaceId = activeChat.type === 'space' ? activeChat.id : null;

  const { data: space } = useSpace(spaceId);
  const { data: spaceMembers = [] } = useSpaceMembers(spaceId);
  const { data: conversationParticipants = [] } = useConversationParticipants(activeChat.isGroup ? conversationId : null);

  // Check space notification setting
  const currentMembership = spaceMembers.find(m => m.employee_id === currentEmployee?.id);
  const spaceNotificationSetting = currentMembership?.notification_setting || 'all';

  // Check if favorited
  const isFavorited = favorites.some(f => 
    (conversationId && f.conversation_id === conversationId) || 
    (spaceId && f.space_id === spaceId)
  );

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle mute toggle for conversations
  const handleToggleMute = async () => {
    if (conversationId) {
      await muteConversation.mutateAsync({ conversationId, mute: !isMuted });
      setIsMuted(!isMuted);
    }
  };

  // Handle space notification toggle
  const handleToggleSpaceMute = async () => {
    if (spaceId) {
      const newSetting = spaceNotificationSetting === 'mute' ? 'all' : 'mute';
      await updateSpaceNotification.mutateAsync({ spaceId, setting: newSetting });
    }
  };

  // Update local state when activeChat changes
  useEffect(() => {
    setGroupIconUrl(activeChat.iconUrl || null);
    setGroupName(activeChat.name);
  }, [activeChat.id, activeChat.iconUrl, activeChat.name]);

  // Fetch other participant details for direct chats
  useEffect(() => {
    const fetchOtherParticipant = async () => {
      if (activeChat.type !== 'conversation' || activeChat.isGroup || !currentEmployee?.id) {
        setOtherParticipant(null);
        return;
      }

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

  // Subscribe to presence changes
  useEffect(() => {
    if (!otherParticipant?.id) return;

    const channel = supabase
      .channel(`presence-header-${otherParticipant.id}`)
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

  const handleSearchResultClick = (messageId: string) => {
    // Scroll to the message
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.classList.add('ring-2', 'ring-primary');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-primary');
      }, 2000);
    }
    onSearchResultClick?.(messageId);
  };

  return (
    <>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {activeChat.type === 'conversation' && !activeChat.isGroup ? (
            // Direct message - show other participant
            <div className="relative flex-shrink-0">
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
          ) : activeChat.type === 'conversation' && activeChat.isGroup ? (
            // Group chat - show group icon with edit option
            <div 
              className="relative h-10 w-10 rounded-full cursor-pointer group flex-shrink-0"
              onClick={() => setShowEditGroupDialog(true)}
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
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </div>
          ) : (
            // Space
            <div className="flex items-center justify-center h-10 w-10 rounded bg-primary/10 text-primary font-semibold text-sm flex-shrink-0 overflow-hidden">
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
                className="cursor-pointer hover:opacity-80"
                onClick={() => setShowEditGroupDialog(true)}
              >
                <h2 className="font-semibold text-foreground text-base flex items-center gap-1 truncate">
                  {groupName}
                  <Pencil className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {conversationParticipants
                    .filter(p => p.employee_id !== currentEmployee?.id)
                    .map(p => p.employee?.profiles?.full_name?.split(' ')[0])
                    .filter(Boolean)
                    .join(', ') || 'Group members'}
                </p>
              </div>
            ) : activeChat.type === 'conversation' ? (
              // Direct message info
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-semibold text-foreground text-base truncate">{activeChat.name}</h2>
                </div>
                {otherParticipant?.position && (
                  <p className="text-xs text-muted-foreground">{otherParticipant.position}</p>
                )}
              </div>
            ) : (
              // Space info
              <div>
                <h2 className="font-semibold text-foreground text-base truncate">{activeChat.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {spaceMembers.length} member{spaceMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={activeChat.type === 'space' ? handleToggleSpaceMute : handleToggleMute}
              >
                {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted) ? (
                  <BellOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {(activeChat.type === 'space' ? spaceNotificationSetting === 'mute' : isMuted)
                ? 'Unmute notifications'
                : 'Mute notifications'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => toggleFavorite.mutate({
                  conversationId: conversationId || undefined,
                  spaceId: spaceId || undefined,
                })}
              >
                <Star className={cn("h-4 w-4", isFavorited && "fill-orange-500 text-orange-500")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFavorited ? 'Remove from favorites' : 'Add to favorites'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-9 w-9", showSearch && "bg-accent")}
                onClick={() => setShowSearch(!showSearch)}
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search messages</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Message Search */}
      <MessageSearch
        conversationId={conversationId}
        spaceId={spaceId}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onResultClick={handleSearchResultClick}
      />

      {/* Edit Group Chat Dialog */}
      {activeChat.type === 'conversation' && activeChat.isGroup && (
        <EditGroupChatDialog
          open={showEditGroupDialog}
          onOpenChange={setShowEditGroupDialog}
          conversationId={activeChat.id}
          currentName={groupName}
          currentIconUrl={groupIconUrl}
          onUpdated={(newName, newIconUrl) => {
            setGroupName(newName);
            setGroupIconUrl(newIconUrl);
          }}
        />
      )}
    </>
  );
};

export default ChatHeader;
