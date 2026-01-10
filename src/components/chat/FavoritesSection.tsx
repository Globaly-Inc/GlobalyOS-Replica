import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useChatFavorites, useToggleFavorite } from "@/hooks/useChatFavorites";
import { useConversations, useSpaces } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import type { ActiveChat, ChatConversation, ChatSpace } from "@/types/chat";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
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
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 w-full text-left hover:bg-accent/50 transition-colors">
        <ChevronRight 
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )} 
        />
        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Favorites
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {favoriteItems.length}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-0.5 px-2">
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
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors group",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <div className="relative flex-shrink-0">
                  {isConversation ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl || undefined} alt={name} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="flex items-center justify-center h-8 w-8 rounded bg-primary/10 text-primary font-semibold text-sm">
                      {space?.icon_url ? (
                        <img src={space.icon_url} alt={name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                  )}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {!isConversation && <span className="text-muted-foreground">#</span>}
                    <span className="text-sm font-medium truncate">{name}</span>
                  </div>
                </div>

                <Star 
                  className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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
      </CollapsibleContent>
    </Collapsible>
  );
};

export default FavoritesSection;
