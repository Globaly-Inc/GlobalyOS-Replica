import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Reply, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { RichTextContent } from "@/components/ui/rich-text-editor";
import type { StageNote } from "@/services/useWorkflowStageNotes";
import { cn } from "@/lib/utils";

interface StageNoteItemProps {
  note: StageNote;
  currentEmployeeId: string | undefined;
  onReply: (parentId: string) => void;
  onEdit: (noteId: string, content: string) => void;
  onDelete: (noteId: string) => void;
  isReply?: boolean;
}

export function StageNoteItem({
  note,
  currentEmployeeId,
  onReply,
  onEdit,
  onDelete,
  isReply = false,
}: StageNoteItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  const authorName = note.employee?.profiles?.full_name || "Unknown";
  const authorAvatar = note.employee?.profiles?.avatar_url;
  const isOwnNote = note.employee_id === currentEmployeeId;

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEdit(note.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(note.content);
    setIsEditing(false);
  };

  return (
    <div className={cn("flex gap-3", isReply && "ml-10 pt-2")}>
      <Avatar className={cn("shrink-0", isReply ? "h-7 w-7" : "h-8 w-8")}>
        <AvatarImage src={authorAvatar || undefined} />
        <AvatarFallback className="text-xs bg-primary/10">
          {authorName.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium", isReply ? "text-xs" : "text-sm")}>
            {authorName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(note.created_at)}
          </span>
          {note.updated_at !== note.created_at && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[60px] text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" variant="default" onClick={handleSaveEdit}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className={cn("mt-1", isReply ? "text-xs" : "text-sm")}>
            <RichTextContent content={note.content} className="text-foreground" />
          </div>
        )}

        {!isEditing && (
          <div className="flex items-center gap-2 mt-2">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onReply(note.id)}
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}

            {isOwnNote && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-3 w-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Nested Replies */}
        {note.replies && note.replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-muted">
            {note.replies.map((reply) => (
              <StageNoteItem
                key={reply.id}
                note={reply}
                currentEmployeeId={currentEmployeeId}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
