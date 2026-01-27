import { useState } from "react";
import { Search, Plus, AtSign, Star, Hash, Users, MessageSquarePlus, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import type { ActiveChat, ChatConversation, ChatSpace } from "@/types/chat";
import { useConversations, useSpaces, useOnlinePresence, useTotalUnreadCount } from "@/services/useChat";
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
  const { data: totalUnread = 0 } = useTotalUnreadCount();

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
      {/* Compact Sticky Header + Search */}
      <div className="sticky top-0 z-10 bg-card border-b border-border/50">
        <div className="px-3 py-2 flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">Messages</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1">
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
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/40 border-0 h-9 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Shortcuts - Compact */}
        <div className="px-3 py-2 border-b border-border/20">
          <div className="flex gap-2">
            <button
              onClick={() => onSelectChat({ type: 'unread', id: 'unread', name: 'Unread' })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/15 active:bg-destructive/20 text-destructive text-sm font-medium transition-colors relative"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Unread
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold flex items-center justify-center">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectChat({ type: 'mentions', id: 'mentions', name: 'Mentions' })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/15 active:bg-primary/20 text-primary text-sm font-medium transition-colors"
            >
              <AtSign className="h-3.5 w-3.5" />
              Mentions
            </button>
            <button
              onClick={() => onSelectChat({ type: 'starred', id: 'starred', name: 'Starred' })}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/40 active:bg-amber-300 dark:active:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-sm font-medium transition-colors"
            >
              <Star className="h-3.5 w-3.5" />
              Starred
            </button>
          </div>
        </div>

        {/* Direct Messages */}
        {sortedConversations.length > 0 && (
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
              Direct Messages
            </h3>
            <div className="space-y-0.5">
              {sortedConversations.map((conv) => {
                const otherParticipantId = getOtherParticipantId(conv);
                const isOnline = otherParticipantId ? isUserOnline(otherParticipantId) : false;
                const hasUnread = conv.unread_count && conv.unread_count > 0;
                
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={cn(
                      "flex items-center gap-2.5 w-full p-2 rounded-xl transition-colors text-left",
                      hasUnread 
                        ? "bg-primary/5 hover:bg-primary/10 active:bg-primary/15" 
                        : "hover:bg-muted/50 active:bg-muted"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={getConversationAvatar(conv) || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                          {conv.is_group ? (
                            <Users className="h-5 w-5" />
                          ) : (
                            getInitials(getConversationDisplayName(conv))
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {!conv.is_group && isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "font-semibold truncate text-sm",
                          hasUnread ? "text-foreground" : "text-foreground"
                        )}>
                          {getConversationDisplayName(conv)}
                        </span>
                        {conv.last_message && (
                          <span className={cn(
                            "text-[11px] flex-shrink-0",
                            hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                          )}>
                            {formatMessageTime(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {conv.last_message && (
                        <p className={cn(
                          "text-xs truncate leading-snug mt-0.5",
                          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>
                    {hasUnread && (
                      <div className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {conv.unread_count! > 99 ? "99+" : conv.unread_count}
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
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-0.5">
              Spaces
            </h3>
            <div className="space-y-0.5">
              {sortedSpaces.map((space) => {
                const hasUnread = space.unread_count && space.unread_count > 0;
                
                return (
                  <button
                    key={space.id}
                    onClick={() => handleSelectSpace(space)}
                    className={cn(
                      "flex items-center gap-2.5 w-full p-2 rounded-xl transition-colors text-left",
                      hasUnread 
                        ? "bg-primary/5 hover:bg-primary/10 active:bg-primary/15" 
                        : "hover:bg-muted/50 active:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10 text-primary flex-shrink-0 overflow-hidden">
                      {space.icon_url ? (
                        <img src={space.icon_url} alt={space.name} className="h-full w-full rounded-xl object-cover" loading="lazy" />
                      ) : (
                        <Hash className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn(
                          "font-semibold truncate text-sm",
                          hasUnread ? "text-foreground" : "text-foreground"
                        )}>
                          {space.name}
                        </span>
                        {space.last_message && (
                          <span className={cn(
                            "text-[11px] flex-shrink-0",
                            hasUnread ? "text-primary font-medium" : "text-muted-foreground"
                          )}>
                            {formatMessageTime(space.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      {space.last_message && (
                        <p className={cn(
                          "text-xs truncate leading-snug mt-0.5",
                          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
                        )}>
                          {space.last_message.content}
                        </p>
                      )}
                    </div>
                    {hasUnread && (
                      <div className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {space.unread_count! > 99 ? "99+" : space.unread_count}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      {/* Empty state */}
        {filteredConversations.length === 0 && filteredSpaces.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-2 text-center">
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
