import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MessageSquare, Paperclip, ChevronDown, Send, Upload, X, AtSign } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<string>("notes");
  const [noteContent, setNoteContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [mentionState, setMentionState] = useState({ isOpen: false, searchText: "" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
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

    // Extract mention IDs from content (simple regex pattern for @mentions)
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
    setActiveTab("notes");
  }, []);

  const handleMentionSelect = useCallback(
    (member: { id: string; name: string }) => {
      // Insert mention into textarea
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

      <CollapsibleContent className="pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="notes" className="flex-1 text-xs gap-1.5">
              <MessageSquare className="h-3 w-3" />
              Notes ({notes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-1 text-xs gap-1.5">
              <Paperclip className="h-3 w-3" />
              Files ({attachments?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-3 space-y-3">
            {/* Reply indicator */}
            {replyingTo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                <span>Replying to a note</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

            {/* Note input */}
            <div className="space-y-2">
              <div className="relative">
                <Textarea
                  ref={editorRef as any}
                  value={noteContent}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNoteContent(value);
                    // Check for @ mentions
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
                  className="min-h-[60px] text-sm resize-none"
                />
                <MentionAutocomplete
                  isOpen={mentionState.isOpen}
                  searchText={mentionState.searchText}
                  onSelect={handleMentionSelect}
                  onClose={() => setMentionState({ isOpen: false, searchText: "" })}
                  anchorRef={editorRef as any}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!noteContent.trim() || addNote.isPending}
                  className="gap-1.5"
                >
                  <Send className="h-3 w-3" />
                  {addNote.isPending ? "Sending..." : replyingTo ? "Reply" : "Send"}
                </Button>
              </div>
            </div>

            {/* Notes list */}
            {notesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notes && notes.length > 0 ? (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {notes.map((note) => (
                  <StageNoteItem
                    key={note.id}
                    note={note}
                    currentEmployeeId={currentEmployeeId}
                    onReply={handleReply}
                    onEdit={handleEditNote}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No notes yet. Add one to start the discussion.
              </p>
            )}
          </TabsContent>

          <TabsContent value="files" className="mt-3 space-y-3">
            {/* File upload */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
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
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Upload className="h-3 w-3" />
                  Select Files
                </Button>
                {selectedFiles.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleUploadFiles}
                    disabled={uploadAttachment.isPending}
                    className="gap-1.5"
                  >
                    <Paperclip className="h-3 w-3" />
                    {uploadAttachment.isPending
                      ? "Uploading..."
                      : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}`}
                  </Button>
                )}
              </div>

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded text-xs"
                    >
                      <Paperclip className="h-3 w-3" />
                      <span className="truncate max-w-[150px]">{file.name}</span>
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
                </div>
              )}
            </div>

            {/* Attachments list */}
            {attachmentsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <StageAttachmentList
                attachments={attachments || []}
                currentEmployeeId={currentEmployeeId}
                onDelete={handleDeleteAttachment}
                isDeleting={deleteAttachment.isPending}
              />
            )}
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
