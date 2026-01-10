import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { MoreVertical, Pin, Pencil, Trash2, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import EmojiPicker from "@/components/ui/EmojiPicker";

interface MessageActionsProps {
  messageId: string;
  isPinned: boolean;
  isOwn: boolean;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

const MessageActions = ({
  messageId,
  isPinned,
  isOwn,
  onPin,
  onEdit,
  onDelete,
  onReact,
}: MessageActionsProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <>
      <div className={cn(
        "flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
        isOwn ? "flex-row-reverse" : ""
      )}>
        {/* Quick emoji picker */}
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
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Smile className="h-3 w-3" />
            </Button>
          }
        />

        {/* More options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isOwn ? "end" : "start"}>
            <DropdownMenuItem onClick={onPin}>
              <Pin className="h-4 w-4 mr-2" />
              {isPinned ? "Unpin" : "Pin"} message
            </DropdownMenuItem>
            
            {isOwn && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit message
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete message
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

export default MessageActions;
