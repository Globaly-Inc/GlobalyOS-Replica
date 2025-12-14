import { useState } from "react";
import { Search, Plus, AtSign, Star, Hash, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import type { ActiveChat, ChatConversation, ChatSpace } from "@/types/chat";
import { useConversations, useSpaces } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";

interface MobileChatHomeProps {
  onSelectChat: (chat: ActiveChat) => void;
  onNewChat: () => void;
  onNewSpace: () => void;
}

const MobileChatHome = ({ onSelectChat, onNewChat, onNewSpace }: MobileChatHomeProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: conversations = [] } = useConversations();
  const { data: spaces = [] } = useSpaces();
  const { data: currentEmployee } = useCurrentEmployee();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  const getConversationDisplayName = (conv: ChatConversation) => {
    if (conv.is_group && conv.name) return conv.name;
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.full_name || "Unknown";
  };

  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.is_group) return conv.icon_url;
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.avatar_url || null;
  };

  const handleSelectConversation = (conv: ChatConversation) => {
    const displayName = getConversationDisplayName(conv);
    const participantNames = conv.participants
      ?.filter(p => p.employee_id !== currentEmployee?.id)
      .map(p => p.employee?.profiles?.full_name || "")
      .filter(Boolean);

    onSelectChat({
      type: 'conversation',
      id: conv.id,
      name: displayName,
      isGroup: conv.is_group,
      iconUrl: conv.icon_url,
      participantNames,
    });
  };

  const handleSelectSpace = (space: ChatSpace) => {
    onSelectChat({
      type: 'space',
      id: space.id,
      name: space.name,
      iconUrl: space.icon_url,
    });
  };

  // Filter conversations by search
  const filteredConversations = searchQuery
    ? conversations.filter(conv => 
        getConversationDisplayName(conv).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const filteredSpaces = searchQuery
    ? spaces.filter(space => 
        space.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : spaces;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50 border-0"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onNewChat} className="h-10 w-10">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Shortcuts */}
        <div className="px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => onSelectChat({ type: 'mentions', id: 'mentions', name: 'Mentions' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
            >
              <AtSign className="h-4 w-4" />
              Mentions
            </button>
            <button
              onClick={() => onSelectChat({ type: 'starred', id: 'starred', name: 'Starred' })}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-medium"
            >
              <Star className="h-4 w-4" />
              Starred
            </button>
          </div>
        </div>

        {/* Direct Messages */}
        {filteredConversations.length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Direct Messages
            </h3>
            <div className="space-y-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={getConversationAvatar(conv) || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conv.is_group ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getInitials(getConversationDisplayName(conv))
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator would go here */}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">
                        {getConversationDisplayName(conv)}
                      </span>
                      {conv.last_message && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatMessageTime(conv.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {conv.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>
                  {conv.unread_count && conv.unread_count > 0 && (
                    <div className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                      {conv.unread_count > 99 ? "99+" : conv.unread_count}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spaces */}
        {filteredSpaces.length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Spaces
            </h3>
            <div className="space-y-1">
              {filteredSpaces.map((space) => (
                <button
                  key={space.id}
                  onClick={() => handleSelectSpace(space)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors text-left"
                >
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 text-primary">
                    {space.icon_url ? (
                      <img src={space.icon_url} alt={space.name} className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <Hash className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground truncate">
                        {space.name}
                      </span>
                      {space.last_message && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatMessageTime(space.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {space.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {space.last_message.content}
                      </p>
                    )}
                  </div>
                  {space.unread_count && space.unread_count > 0 && (
                    <div className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                      {space.unread_count > 99 ? "99+" : space.unread_count}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Empty state */}
        {filteredConversations.length === 0 && filteredSpaces.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No chats found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Start a new conversation"}
            </p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MobileChatHome;
