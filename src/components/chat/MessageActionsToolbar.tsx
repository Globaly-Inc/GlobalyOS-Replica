import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Smile, Bookmark, BookmarkCheck, MoreHorizontal, Pencil, Trash2, Pin, PinOff, Reply, Copy, Link } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import EmojiPicker from "@/components/ui/EmojiPicker";

interface MessageActionsToolbarProps {
  messageId: string;
  messageContent: string;
  isStarred: boolean;
  isPinned: boolean;
  isOwn: boolean;
  onStar: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  className?: string;
}

const ToolbarButton = ({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = "ghost",
  destructive = false 
}: { 
  icon: React.ElementType; 
  label: string; 
  onClick?: () => void;
  variant?: "ghost" | "default";
  destructive?: boolean;
}) => (
  <TooltipProvider delayDuration={300}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="icon"
          className={cn(
            "h-7 w-7",
            destructive && "text-destructive hover:text-destructive hover:bg-destructive/10"
          )}
          onClick={onClick}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const MessageActionsToolbar = ({
  messageId,
  messageContent,
  isStarred,
  isPinned,
  isOwn,
  onStar,
  onPin,
  onEdit,
  onDelete,
  onReact,
  onReply,
  className,
}: MessageActionsToolbarProps) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleCopyText = () => {
    navigator.clipboard.writeText(messageContent);
    toast.success("Message copied to clipboard");
    setShowMoreMenu(false);
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.hash = `message-${messageId}`;
    navigator.clipboard.writeText(url.toString());
    toast.success("Link copied to clipboard");
    setShowMoreMenu(false);
  };

  return (
    <>
      <div
        className={cn(
          "absolute -top-4 right-4 z-10",
          "opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          "bg-card border border-border rounded-lg shadow-lg",
          "flex items-center gap-0.5 px-1 py-0.5",
          className
        )}
      >
        {/* Quick emoji reactions */}
        <EmojiPicker
          onSelect={(emoji) => {
            onReact(emoji);
            setShowEmojiPicker(false);
          }}
          open={showEmojiPicker}
          onOpenChange={setShowEmojiPicker}
          showSearch={true}
          showRecent={true}
          showCategories={true}
          align="center"
          side="top"
          trigger={
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Smile className="h-3.5 w-3.5" />
            </Button>
          }
        />

        {/* Reply in thread */}
        {onReply && (
          <ToolbarButton
            icon={Reply}
            label="Reply in thread"
            onClick={onReply}
          />
        )}

        {/* Star/Bookmark - Personal */}
        <ToolbarButton
          icon={isStarred ? BookmarkCheck : Bookmark}
          label={isStarred ? "Remove from starred" : "Add to starred"}
          onClick={onStar}
        />

        {/* Pin - Conversation-level (only for own messages due to RLS) */}
        {isOwn && (
          <ToolbarButton
            icon={isPinned ? PinOff : Pin}
            label={isPinned ? "Unpin from conversation" : "Pin to conversation"}
            onClick={onPin}
          />
        )}

        {/* More actions */}
        <Popover open={showMoreMenu} onOpenChange={setShowMoreMenu}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" side="top" align="end">
            {/* Copy actions - available to everyone */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8"
              onClick={handleCopyText}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy text
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8"
              onClick={handleCopyLink}
            >
              <Link className="h-3.5 w-3.5" />
              Copy link
            </Button>
            
            {isOwn && (
              <>
                <div className="border-t border-border my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-8"
                  onClick={() => {
                    onEdit();
                    setShowMoreMenu(false);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setShowDeleteDialog(true);
                    setShowMoreMenu(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageActionsToolbar;
