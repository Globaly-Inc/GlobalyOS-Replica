import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquarePlus,
  Home,
  AtSign,
  Star,
  Hash,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversations, useSpaces } from "@/services/useChat";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import type { ChatConversation, ChatSpace, ActiveChat } from "@/types/chat";

interface ChatSidebarProps {
  activeChat: ActiveChat | null;
  onSelectChat: (chat: ActiveChat) => void;
  onNewChat: () => void;
  onNewSpace: () => void;
}

const ChatSidebar = ({ activeChat, onSelectChat, onNewChat, onNewSpace }: ChatSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [dmExpanded, setDmExpanded] = useState(true);
  const [spacesExpanded, setSpacesExpanded] = useState(true);
  
  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: spaces = [], isLoading: loadingSpaces } = useSpaces();
  const { data: currentEmployee } = useCurrentEmployee();

  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name;
    if (conv.is_group) return "Group Chat";
    
    // For DMs, show the other person's name
    const otherParticipant = conv.participants?.find(
      p => p.employee_id !== currentEmployee?.id
    );
    return otherParticipant?.employee?.profiles?.full_name || "Unknown";
  };

  const getConversationAvatar = (conv: ChatConversation) => {
    if (conv.is_group) return null;
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

  const filteredConversations = conversations.filter(conv => 
    getConversationName(conv).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSpaces = spaces.filter(space => 
    space.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* New Chat Button */}
      <div className="p-3 border-b border-border">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2"
          onClick={onNewChat}
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chat"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Shortcuts */}
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Shortcuts
          </p>
          <div className="space-y-1">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <Home className="h-4 w-4" />
              Home
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <AtSign className="h-4 w-4" />
              Mentions
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <Star className="h-4 w-4" />
              Starred
            </Button>
          </div>
        </div>

        {/* Direct Messages */}
        <div className="px-3 py-2">
          <button 
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground"
            onClick={() => setDmExpanded(!dmExpanded)}
          >
            {dmExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Direct messages
          </button>
          
          {dmExpanded && (
            <div className="space-y-1">
              {loadingConversations ? (
                <p className="text-sm text-muted-foreground px-2">Loading...</p>
              ) : filteredConversations.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">No conversations yet</p>
              ) : (
                filteredConversations.map((conv) => {
                  const name = getConversationName(conv);
                  const avatar = getConversationAvatar(conv);
                  const isActive = activeChat?.type === 'conversation' && activeChat.id === conv.id;
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => onSelectChat({ 
                        type: 'conversation', 
                        id: conv.id, 
                        name,
                        isGroup: conv.is_group 
                      })}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={avatar || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {conv.is_group ? <Users className="h-3 w-3" /> : getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate flex-1 text-left">{name}</span>
                      {conv.unread_count && conv.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Spaces */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <button 
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
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
            <div className="space-y-1">
              {loadingSpaces ? (
                <p className="text-sm text-muted-foreground px-2">Loading...</p>
              ) : filteredSpaces.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2">No spaces yet</p>
              ) : (
                filteredSpaces.map((space) => {
                  const isActive = activeChat?.type === 'space' && activeChat.id === space.id;
                  
                  return (
                    <button
                      key={space.id}
                      onClick={() => onSelectChat({ 
                        type: 'space', 
                        id: space.id, 
                        name: space.name 
                      })}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                        isActive 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center h-6 w-6 rounded text-[10px] font-semibold",
                        isActive 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {space.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate flex-1 text-left">{space.name}</span>
                      {space.unread_count && space.unread_count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5">
                          {space.unread_count}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2 text-primary"
                onClick={onNewSpace}
              >
                <Hash className="h-4 w-4" />
                Browse spaces
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatSidebar;
