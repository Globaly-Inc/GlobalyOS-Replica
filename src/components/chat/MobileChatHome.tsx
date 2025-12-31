import { useState } from "react";
import { Search, Plus, AtSign, Star, Hash, Users, MessageSquarePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import type { ActiveChat, ChatConversation, ChatSpace } from "@/types/chat";
import { useConversations, useSpaces, useOnlinePresence } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const { data: onlineUsers = [] } = useOnlinePresence();

  const isUserOnline = (employeeId: string) => {
    return onlineUsers.some(u => u.employee_id === employeeId && u.is_online);
  };

  const getOtherParticipantId = (conv: ChatConversation) => {
    if (conv.is_group) return null;
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee_id || null;
  };

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

  // Sort conversations by last message time (most recent first)
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at || '';
    const bTime = b.last_message?.created_at || b.created_at || '';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const sortedSpaces = [...filteredSpaces].sort((a, b) => {
    const aTime = a.last_message?.created_at || a.created_at || '';
    const bTime = b.last_message?.created_at || b.created_at || '';
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-foreground">Messages</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onNewChat}>
                <Users className="h-4 w-4 mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onNewSpace}>
                <Hash className="h-4 w-4 mr-2" />
                New Space
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 border-0 h-10"
          />
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
        {sortedConversations.length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Direct Messages
            </h3>
            <div className="space-y-1">
              {sortedConversations.map((conv) => {
                const otherParticipantId = getOtherParticipantId(conv);
                const isOnline = otherParticipantId ? isUserOnline(otherParticipantId) : false;
                
                return (
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
                      {!conv.is_group && isOnline && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "font-medium truncate",
                          conv.unread_count && conv.unread_count > 0 ? "text-foreground" : "text-foreground"
                        )}>
                          {getConversationDisplayName(conv)}
                        </span>
                        {conv.last_message && (
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {formatMessageTime(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className={cn(
                          "text-sm truncate",
                          conv.unread_count && conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
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
                );
              })}
            </div>
          </div>
        )}

        {/* Spaces */}
        {sortedSpaces.length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Spaces
            </h3>
            <div className="space-y-1">
              {sortedSpaces.map((space) => (
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
                      <span className={cn(
                        "font-medium truncate",
                        space.unread_count && space.unread_count > 0 ? "text-foreground" : "text-foreground"
                      )}>
                        {space.name}
                      </span>
                      {space.last_message && (
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatMessageTime(space.last_message.created_at)}
                        </span>
                      )}
                    </div>
                    {space.last_message && (
                      <p className={cn(
                        "text-sm truncate",
                        space.unread_count && space.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
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
