import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MessageSquare, Paperclip, ChevronDown, Send, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import MentionAutocomplete from "@/components/chat/MentionAutocomplete";
import { StageNoteItem } from "./StageNoteItem";
import { StageAttachmentList } from "./StageAttachmentList";
import {
  useStageNotes,
  useAddStageNote,
  useUpdateStageNote,
  useDeleteStageNote,
  useStageAttachments,
  useUploadStageAttachment,
  useDeleteStageAttachment,
  useStageNotesRealtime,
} from "@/services/useWorkflowStageNotes";

interface StageNotesPanelProps {
  workflowId: string;
  stageId: string;
  organizationId: string;
  currentEmployeeId: string | undefined;
  noteCount?: number;
  attachmentCount?: number;
}

export function StageNotesPanel({
  workflowId,
  stageId,
  organizationId,
  currentEmployeeId,
  noteCount = 0,
  attachmentCount = 0,
}: StageNotesPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [mentionState, setMentionState] = useState({ isOpen: false, searchText: "" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enable realtime updates
  useStageNotesRealtime(workflowId, stageId);

  // Fetch data
  const { data: notes, isLoading: notesLoading } = useStageNotes(workflowId, stageId);
  const { data: attachments, isLoading: attachmentsLoading } = useStageAttachments(workflowId, stageId);

  // Mutations
  const addNote = useAddStageNote();
  const updateNote = useUpdateStageNote();
  const deleteNote = useDeleteStageNote();
  const uploadAttachment = useUploadStageAttachment();
  const deleteAttachment = useDeleteStageAttachment();

  const totalCount = (notes?.length || 0) + (attachments?.length || 0);

  const handleAddNote = useCallback(() => {
    if (!noteContent.trim() || !currentEmployeeId) return;

    const mentionPattern = /data-mention-id="([^"]+)"/g;
    const mentionedIds: string[] = [];
    let match;
    while ((match = mentionPattern.exec(noteContent)) !== null) {
      mentionedIds.push(match[1]);
    }

    addNote.mutate(
      {
        workflowId,
        stageId,
        organizationId,
        employeeId: currentEmployeeId,
        content: noteContent,
        parentId: replyingTo,
        mentionedEmployeeIds: mentionedIds,
      },
      {
        onSuccess: () => {
          setNoteContent("");
          setReplyingTo(null);
        },
      }
    );
  }, [noteContent, currentEmployeeId, workflowId, stageId, organizationId, replyingTo, addNote]);

  const handleEditNote = useCallback(
    (noteId: string, content: string) => {
      updateNote.mutate({ noteId, content, workflowId, stageId });
    },
    [updateNote, workflowId, stageId]
  );

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteNote.mutate({ noteId, workflowId, stageId });
    },
    [deleteNote, workflowId, stageId]
  );

  const handleReply = useCallback((parentId: string) => {
    setReplyingTo(parentId);
    editorRef.current?.focus();
  }, []);

  const handleMentionSelect = useCallback(
    (member: { id: string; name: string }) => {
      const lastAtIndex = noteContent.lastIndexOf("@");
      if (lastAtIndex !== -1) {
        const newContent = noteContent.slice(0, lastAtIndex) + `@${member.name} `;
        setNoteContent(newContent);
      }
      setMentionState({ isOpen: false, searchText: "" });
    },
    [noteContent]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (!currentEmployeeId || selectedFiles.length === 0) return;

    for (const file of selectedFiles) {
      await uploadAttachment.mutateAsync({
        workflowId,
        stageId,
        organizationId,
        employeeId: currentEmployeeId,
        file,
      });
    }
    setSelectedFiles([]);
  };

  const handleDeleteAttachment = useCallback(
    (attachmentId: string, filePath: string) => {
      deleteAttachment.mutate({ attachmentId, filePath, workflowId, stageId });
    },
    [deleteAttachment, workflowId, stageId]
  );

  const isLoading = notesLoading || attachmentsLoading;
  const hasNotes = notes && notes.length > 0;
  const hasAttachments = attachments && attachments.length > 0;
  const hasContent = hasNotes || hasAttachments;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-between h-8 px-3 text-xs font-medium",
            "hover:bg-muted/50 border-t border-b border-transparent",
            isOpen && "bg-muted/30 border-border"
          )}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Notes & Attachments</span>
            {totalCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {totalCount}
              </Badge>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 px-1">
        {/* Unified list of notes and attachments */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {/* Notes */}
              {hasNotes && notes.map((note) => (
                <StageNoteItem
                  key={note.id}
                  note={note}
                  currentEmployeeId={currentEmployeeId}
                  onReply={handleReply}
                  onEdit={handleEditNote}
                  onDelete={handleDeleteNote}
                />
              ))}

              {/* Attachments */}
              <StageAttachmentList
                attachments={attachments || []}
                currentEmployeeId={currentEmployeeId}
                onDelete={handleDeleteAttachment}
                isDeleting={deleteAttachment.isPending}
              />

              {/* Empty state */}
              {!hasContent && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No notes or attachments yet. Add one below.
                </p>
              )}
            </>
          )}
        </div>

        {/* Reply indicator */}
        {replyingTo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-950/20 px-2 py-1.5 rounded mt-3 border border-blue-200/50 dark:border-blue-800/30">
            <span>Replying to a note</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-auto"
              onClick={() => setReplyingTo(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Selected files preview */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2 py-1 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/30 rounded text-xs"
              >
                <Paperclip className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                <span className="truncate max-w-[120px]">{file.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => handleRemoveFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              onClick={handleUploadFiles}
              disabled={uploadAttachment.isPending}
              className="h-6 text-xs gap-1"
            >
              {uploadAttachment.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )}

        {/* Compact input toolbar */}
        <div className="flex items-end gap-2 mt-3 pt-3 border-t">
          <div className="flex-1 relative">
            <Textarea
              ref={editorRef}
              value={noteContent}
              onChange={(e) => {
                const value = e.target.value;
                setNoteContent(value);
                const lastAtIndex = value.lastIndexOf("@");
                if (lastAtIndex !== -1) {
                  const textAfterAt = value.slice(lastAtIndex + 1);
                  const hasSpace = textAfterAt.includes(" ");
                  if (!hasSpace && textAfterAt.length <= 20) {
                    setMentionState({ isOpen: true, searchText: textAfterAt });
                  } else {
                    setMentionState({ isOpen: false, searchText: "" });
                  }
                } else {
                  setMentionState({ isOpen: false, searchText: "" });
                }
              }}
              placeholder={replyingTo ? "Write a reply..." : "Add a note... Use @ to mention"}
              className="min-h-[38px] max-h-[100px] text-sm resize-none pr-20"
              rows={1}
            />
            <MentionAutocomplete
              isOpen={mentionState.isOpen}
              searchText={mentionState.searchText}
              onSelect={handleMentionSelect}
              onClose={() => setMentionState({ isOpen: false, searchText: "" })}
              anchorRef={editorRef as any}
            />
          </div>
          
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleAddNote}
              disabled={!noteContent.trim() || addNote.isPending}
              title={replyingTo ? "Send reply" : "Send note"}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
