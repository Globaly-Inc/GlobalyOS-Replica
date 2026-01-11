import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, Reply, MoreHorizontal, Pencil, Trash2, Check, X } from "lucide-react";
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
    <div className={cn("space-y-2", isReply && "ml-6")}>
      <div
        className={cn(
          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
          "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30",
          "hover:bg-blue-100/50 dark:hover:bg-blue-950/30"
        )}
      >
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[60px] text-sm resize-none bg-background"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" variant="default" onClick={handleSaveEdit} className="h-7 gap-1">
                  <Check className="h-3 w-3" />
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-7 gap-1">
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className={cn("text-sm", isReply ? "text-xs" : "text-sm")}>
                <RichTextContent content={note.content} className="text-foreground" />
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">{authorName}</span>
                <span>·</span>
                <span>{formatRelativeTime(note.created_at)}</span>
                {note.updated_at !== note.created_at && (
                  <>
                    <span>·</span>
                    <span className="italic">edited</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-600"
                onClick={() => onReply(note.id)}
                title="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </Button>
            )}

            {isOwnNote && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {note.replies && note.replies.length > 0 && (
        <div className="space-y-2">
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
  );
}
