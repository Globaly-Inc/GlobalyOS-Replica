import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  X,
  Pin,
  Link2,
  Plus,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { usePinnedMessages, useSpace } from "@/services/chat";
import { useSpaceMembersRealtime } from "@/services/useSpaceMembersRealtime";
import { useSpaceMemberLogs } from "@/services/useSpaceMemberLogs";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { ActiveChat } from "@/types/chat";

interface ChatRightPanelProps {
  activeChat: ActiveChat;
  onClose: () => void;
}

const ChatRightPanel = ({ activeChat, onClose }: ChatRightPanelProps) => {
  const conversationId = activeChat.type === 'conversation' ? activeChat.id : null;
  const spaceId = activeChat.type === 'space' ? activeChat.id : null;
  
  const { data: pinnedMessages = [] } = usePinnedMessages(conversationId, spaceId);
  const { data: space } = useSpace(spaceId);
  const { data: memberLogs = [] } = useSpaceMemberLogs(spaceId);
  const { getShortRelativeTime } = useRelativeTime();
  
  const [activityOpen, setActivityOpen] = useState(false);
  
  // Enable realtime updates for space members
  useSpaceMembersRealtime(spaceId);
  
  const autoSyncEnabled = space?.auto_sync_members === true;
  const autoSyncLogs = memberLogs.filter(log => log.source === 'auto_sync');

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {activeChat.type === 'conversation' ? (
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {getInitials(activeChat.name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex items-center justify-center h-8 w-8 rounded bg-primary/10 text-primary font-semibold text-sm">
              {activeChat.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="font-medium">{activeChat.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">

        {/* Pinned Messages */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Pin className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Pinned Messages</h3>
          </div>
          
          {pinnedMessages.length === 0 ? (
            <div className="text-center py-6">
              <div className="mx-auto w-24 h-24 mb-3 rounded-lg bg-muted/50 flex items-center justify-center">
                <Pin className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No pins yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your pinned messages are displayed here for everyone to access.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pinnedMessages.map((message) => (
                <div 
                  key={message.id}
                  className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={message.sender?.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(message.sender?.profiles?.full_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {message.sender?.profiles?.full_name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.content}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {format(new Date(message.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Auto-Sync Activity Logs (only for spaces with auto-sync enabled) */}
        {spaceId && autoSyncEnabled && (
          <Collapsible open={activityOpen} onOpenChange={setActivityOpen} className="border-b border-border">
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/50">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Sync Activity
                <span className="text-xs text-muted-foreground font-normal">
                  ({autoSyncLogs.length})
                </span>
              </h4>
              {activityOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {autoSyncLogs.slice(0, 20).map(log => (
                  <div key={log.id} className="flex items-center gap-2 text-xs">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={log.employee?.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {log.employee?.profiles?.full_name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate flex-1">{log.employee?.profiles?.full_name || "Unknown"}</span>
                    <Badge 
                      variant={log.action_type === 'added' ? 'default' : 'destructive'} 
                      className="text-[10px] px-1.5 py-0"
                    >
                      {log.action_type}
                    </Badge>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {getShortRelativeTime(log.created_at)}
                    </span>
                  </div>
                ))}
                {autoSyncLogs.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No auto-sync activity yet
                  </p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Pinned Resources */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Pinned Resources</h3>
          </div>
          
          <div className="text-center py-6">
            <div className="mx-auto w-24 h-24 mb-3 rounded-lg bg-muted/50 flex items-center justify-center">
              <Link2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No pinned links or uploads yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your important files, links, and media are shown here for everyone to access.
            </p>
          </div>
          
          <Button variant="ghost" className="w-full justify-start gap-2 text-primary mt-2">
            <Plus className="h-4 w-4" />
            Add Resources
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatRightPanel;
