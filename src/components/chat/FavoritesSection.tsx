import { Star, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useChatFavorites, useToggleFavorite } from "@/hooks/useChatFavorites";
import { useConversations, useSpaces } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import type { ActiveChat, ChatConversation, ChatSpace } from "@/types/chat";
import { useState } from "react";

interface FavoritesSectionProps {
  activeChat: ActiveChat | null;
  onSelectChat: (chat: ActiveChat) => void;
  onlineStatuses: Record<string, boolean>;
}

const FavoritesSection = ({ activeChat, onSelectChat, onlineStatuses }: FavoritesSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: favorites = [] } = useChatFavorites();
  const { data: conversations = [] } = useConversations();
  const { data: spaces = [] } = useSpaces();
  const { data: currentEmployee } = useCurrentEmployee();
  const toggleFavorite = useToggleFavorite();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getOtherParticipantId = (conv: ChatConversation) => {
    return conv.participants?.find(p => p.employee_id !== currentEmployee?.id)?.employee_id;
  };

  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name;
    if (conv.is_group) return "Group Chat";
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.full_name || "Unknown";
  };

  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.icon_url) return conv.icon_url;
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.avatar_url || null;
  };

  // Build list of favorited items
  const favoriteItems: Array<{ type: 'conversation' | 'space'; item: ChatConversation | ChatSpace }> = [];

  favorites.forEach(fav => {
    if (fav.conversation_id) {
      const conv = conversations.find(c => c.id === fav.conversation_id);
      if (conv) {
        favoriteItems.push({ type: 'conversation', item: conv });
      }
    } else if (fav.space_id) {
      const space = spaces.find(s => s.id === fav.space_id);
      if (space) {
        favoriteItems.push({ type: 'space', item: space });
      }
    }
  });

  if (favoriteItems.length === 0) {
    return null; // Don't show section if no favorites
  }

  return (
    <div className="px-3 py-3">
      <button 
        className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 hover:text-foreground transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronRight 
          className={cn(
            "h-3 w-3 transition-transform",
            isExpanded && "rotate-90"
          )} 
        />
        <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
        Favorites
      </button>
      
      {isExpanded && (
        <div className="space-y-0.5">
          {favoriteItems.map(({ type, item }) => {
            const isConversation = type === 'conversation';
            const conv = isConversation ? item as ChatConversation : null;
            const space = !isConversation ? item as ChatSpace : null;

            const isActive = activeChat?.id === item.id && 
              ((isConversation && activeChat?.type === 'conversation') || 
               (!isConversation && activeChat?.type === 'space'));

            const name = isConversation ? getConversationName(conv!) : space!.name;
            const avatarUrl = isConversation ? getConversationAvatar(conv!) : space!.icon_url;
            
            const otherParticipantId = isConversation && !conv!.is_group 
              ? getOtherParticipantId(conv!) 
              : undefined;
            const isOnline = otherParticipantId ? onlineStatuses[otherParticipantId] : false;

            return (
              <button
                key={item.id}
                onClick={() => onSelectChat({
                  type: isConversation ? 'conversation' : 'space',
                  id: item.id,
                  name,
                  isGroup: isConversation ? conv!.is_group : undefined,
                  iconUrl: avatarUrl,
                })}
                className={cn(
                  "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors group",
                  isActive 
                    ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                    : "hover:bg-muted/60"
                )}
              >
                <div className="relative flex-shrink-0">
                  {isConversation ? (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={avatarUrl || undefined} alt={name} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex items-center justify-center h-6 w-6 rounded bg-muted text-muted-foreground font-medium text-[10px]">
                      {space?.icon_url ? (
                        <img src={space.icon_url} alt={name} className="h-6 w-6 rounded object-cover" />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                  )}
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border-[1.5px] border-card" />
                  )}
                </div>

                <span className="truncate flex-1 text-left">
                  {name}
                </span>

                <Star 
                  className="h-3 w-3 text-orange-500 fill-orange-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite.mutate({
                      conversationId: isConversation ? item.id : undefined,
                      spaceId: !isConversation ? item.id : undefined,
                    });
                  }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FavoritesSection;
