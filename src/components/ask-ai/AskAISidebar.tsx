import { useState, useMemo } from "react";
import { Plus, Search, Pin, MoreHorizontal, Pencil, Trash2, Archive, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  AIConversation,
  useAIConversations,
  useRenameConversation,
  usePinConversation,
  useDeleteConversation,
  useArchiveConversation,
} from "@/services/useAIConversations";
import { Skeleton } from "@/components/ui/skeleton";

interface AskAISidebarProps {
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onNewChat: () => void;
  isMobile?: boolean;
}

type GroupedConversations = {
  pinned: AIConversation[];
  today: AIConversation[];
  yesterday: AIConversation[];
  thisWeek: AIConversation[];
  thisMonth: AIConversation[];
  older: AIConversation[];
};

function groupConversations(conversations: AIConversation[]): GroupedConversations {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: GroupedConversations = {
    pinned: [],
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    older: [],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.last_message_at);
    if (conv.is_pinned) {
      groups.pinned.push(conv);
    } else if (date >= today) {
      groups.today.push(conv);
    } else if (date >= yesterday) {
      groups.yesterday.push(conv);
    } else if (date >= weekAgo) {
      groups.thisWeek.push(conv);
    } else if (date >= monthAgo) {
      groups.thisMonth.push(conv);
    } else {
      groups.older.push(conv);
    }
  });

  return groups;
}

export const AskAISidebar = ({
  activeId,
  onSelect,
  onNewChat,
  isMobile,
}: AskAISidebarProps) => {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useAIConversations();
  const renameConversation = useRenameConversation();
  const pinConversation = usePinConversation();
  const deleteConversation = useDeleteConversation();
  const archiveConversation = useArchiveConversation();

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const query = search.toLowerCase();
    return conversations.filter((c) =>
      c.title.toLowerCase().includes(query)
    );
  }, [conversations, search]);

  const grouped = useMemo(
    () => groupConversations(filteredConversations),
    [filteredConversations]
  );

  const handleRename = (conv: AIConversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = () => {
    if (editingId && editTitle.trim()) {
      renameConversation.mutate({ id: editingId, title: editTitle.trim() });
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteConversation.mutate(deleteId);
      if (activeId === deleteId) {
        onSelect(null);
      }
      setDeleteId(null);
    }
  };

  const renderGroup = (title: string, items: AIConversation[], icon?: React.ReactNode) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {icon}
          {title}
        </div>
        <div className="space-y-0.5">
          {items.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={activeId === conv.id}
              isEditing={editingId === conv.id}
              editTitle={editTitle}
              onEditTitleChange={setEditTitle}
              onSaveRename={saveRename}
              onSelect={() => onSelect(conv.id)}
              onRename={() => handleRename(conv)}
              onPin={() =>
                pinConversation.mutate({
                  id: conv.id,
                  isPinned: !conv.is_pinned,
                })
              }
              onArchive={() => archiveConversation.mutate(conv.id)}
              onDelete={() => setDeleteId(conv.id)}
            />
          ))}
        </div>
      </div>
    );
  };


  return (
    <>
      <div
        className={cn(
          "flex flex-col bg-sidebar border-r",
          isMobile ? "w-full" : "w-72"
        )}
      >
        {/* Header */}
        <div className="p-3 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-ai" />
              <span className="font-semibold">Ask AI</span>
            </div>
            <Button onClick={onNewChat} className="gap-1.5" size="sm">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No conversations yet</p>
                <p className="text-xs mt-1">Start a new chat to begin</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No matching conversations</p>
              </div>
            ) : (
              <>
                {renderGroup("Pinned", grouped.pinned, <Pin className="h-3 w-3" />)}
                {renderGroup("Today", grouped.today)}
                {renderGroup("Yesterday", grouped.yesterday)}
                {renderGroup("This Week", grouped.thisWeek)}
                {renderGroup("This Month", grouped.thisMonth)}
                {renderGroup("Older", grouped.older)}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface ConversationItemProps {
  conversation: AIConversation;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  onEditTitleChange: (title: string) => void;
  onSaveRename: () => void;
  onSelect: () => void;
  onRename: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

const ConversationItem = ({
  conversation,
  isActive,
  isEditing,
  editTitle,
  onEditTitleChange,
  onSaveRename,
  onSelect,
  onRename,
  onPin,
  onArchive,
  onDelete,
}: ConversationItemProps) => {
  if (isEditing) {
    return (
      <div className="px-2">
        <Input
          value={editTitle}
          onChange={(e) => onEditTitleChange(e.target.value)}
          onBlur={onSaveRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveRename();
            if (e.key === "Escape") onSaveRename();
          }}
          autoFocus
          className="h-8 text-sm"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50"
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {conversation.is_pinned && (
            <Pin className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{conversation.title}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(conversation.last_message_at)}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPin}>
            <Pin className="h-4 w-4 mr-2" />
            {conversation.is_pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
