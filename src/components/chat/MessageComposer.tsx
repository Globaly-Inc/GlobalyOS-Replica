import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Send,
  Smile,
  Bold,
  Italic,
  Strikethrough,
  Link,
  Code,
  Paperclip,
  Image,
  X,
  FileIcon,
  Upload,
  AtSign,
} from "lucide-react";
import { useSendMessage, useTypingIndicator, useSaveMentions } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import UploadProgress, { UploadingFile } from "./UploadProgress";
import MentionAutocomplete from "./MentionAutocomplete";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import EmojiPicker from "@/components/ui/EmojiPicker";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

interface MessageComposerProps {
  conversationId: string | null;
  spaceId: string | null;
}

export interface MessageComposerHandle {
  addFiles: (files: File[]) => void;
}

interface SelectedFile {
  file: File;
  preview?: string;
}

interface MentionedMember {
  id: string;
  name: string;
}

const MessageComposer = forwardRef<MessageComposerHandle, MessageComposerProps>(
  ({ conversationId, spaceId }, ref) => {
  const [message, setMessage] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState<"file" | "image">("file");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionedMembers, setMentionedMembers] = useState<MentionedMember[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const sendMessage = useSendMessage();
  const saveMentions = useSaveMentions();
  const { currentOrg } = useOrganization();
  const { updateTypingStatus, clearTypingStatus } = useTypingIndicator();
  const isMobile = useIsMobile();

  // Expose addFiles method to parent component
  useImperativeHandle(ref, () => ({
    addFiles: (files: File[]) => {
      const newFiles: SelectedFile[] = [];
      files.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} exceeds 10MB limit`);
          return;
        }
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          toast.error(`${file.name} is not a supported file type`);
          return;
        }
        const selectedFile: SelectedFile = { file };
        if (file.type.startsWith("image/")) {
          selectedFile.preview = URL.createObjectURL(file);
        }
        newFiles.push(selectedFile);
      });
      if (newFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...newFiles]);
        toast.success(`${newFiles.length} file(s) added`);
      }
    }
  }), []);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    updateTypingStatus(conversationId, spaceId);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      clearTypingStatus();
    }, 3000);
  }, [conversationId, spaceId, updateTypingStatus, clearTypingStatus]);

  // Clear typing status on unmount or when conversation changes
  useEffect(() => {
    return () => {
      clearTypingStatus();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, spaceId, clearTypingStatus]);

  // Handle @ mention detection
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    if (value.trim()) {
      handleTyping();
    }

    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
    setMentionSearch("");
  };

  // Handle mention selection
  const handleMentionSelect = (member: { id: string; name: string }) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = message.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterCursor = message.slice(cursorPosition);
      const newMessage = message.slice(0, lastAtIndex) + `@${member.name} ` + textAfterCursor;
      setMessage(newMessage);
      
      if (!mentionedMembers.find(m => m.id === member.id)) {
        setMentionedMembers(prev => [...prev, { id: member.id, name: member.name }]);
      }
    }
    
    setShowMentions(false);
    setMentionSearch("");
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!message.trim() && selectedFiles.length === 0) return;
    
    clearTypingStatus();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    try {
      setIsUploading(true);
      
      const uploadingFilesInit: UploadingFile[] = selectedFiles.map((sf, index) => ({
        id: `upload-${index}-${Date.now()}`,
        name: sf.file.name,
        progress: 0,
        status: "uploading" as const,
        preview: sf.preview,
      }));
      setUploadingFiles(uploadingFilesInit);
      
      const uploadedAttachments: { fileName: string; filePath: string; fileSize: number; fileType: string }[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const { file } = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${currentOrg?.id}/${fileName}`;
        
        setUploadingFiles(prev => prev.map((uf, idx) => 
          idx === i ? { ...uf, progress: 30 } : uf
        ));
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);
        
        if (uploadError) {
          setUploadingFiles(prev => prev.map((uf, idx) => 
            idx === i ? { ...uf, status: "error" as const } : uf
          ));
          throw uploadError;
        }
        
        setUploadingFiles(prev => prev.map((uf, idx) => 
          idx === i ? { ...uf, progress: 100, status: "complete" as const } : uf
        ));
        
        uploadedAttachments.push({
          fileName: file.name,
          filePath,
          fileSize: file.size,
          fileType: file.type,
        });
      }
      
      const result = await sendMessage.mutateAsync({
        content: message.trim() || (uploadedAttachments.length > 0 ? "Shared file(s)" : ""),
        conversationId: conversationId || undefined,
        spaceId: spaceId || undefined,
        attachments: uploadedAttachments,
      });

      if (mentionedMembers.length > 0 && result?.id) {
        await saveMentions.mutateAsync({
          messageId: result.id,
          employeeIds: mentionedMembers.map(m => m.id),
        });
      }
      
      setMessage("");
      setSelectedFiles([]);
      setUploadingFiles([]);
      setMentionedMembers([]);
    } catch (error) {
      showErrorToast(error, "Failed to send message", {
        componentName: "MessageComposer",
        actionAttempted: "Send message",
        errorType: "database",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  const applyFormatting = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end);
    
    let formattedText = selectedText;
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `_${selectedText}_`;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        break;
    }
    
    const newMessage = message.substring(0, start) + formattedText + message.substring(end);
    setMessage(newMessage);
    textarea.focus();
  };

  const openUploadDialog = (type: "file" | "image") => {
    setUploadType(type);
    setSelectedFiles([]);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const allowedTypes = uploadType === "image" ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;
    const newFiles: SelectedFile[] = [];
    
    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        return;
      }
      
      const selectedFile: SelectedFile = { file };
      if (file.type.startsWith("image/")) {
        selectedFile.preview = URL.createObjectURL(file);
      }
      newFiles.push(selectedFile);
    });
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [uploadType]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const confirmUpload = () => {
    setUploadDialogOpen(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canSend = message.trim() || selectedFiles.length > 0;

  return (
    <div className={cn(
      "border-t border-border bg-card flex-shrink-0",
      isMobile && "shadow-[0_-2px_10px_-3px_rgba(0,0,0,0.1)]"
    )}>
      {/* Upload Progress */}
      <UploadProgress files={uploadingFiles} />
      
      <div className={cn(
        "mx-3 mb-3 mt-3",
        isMobile ? "mx-2 mb-2 mt-2" : "md:mx-4 md:mb-4"
      )}>
        {/* Selected files preview - above the input box */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-muted/30 rounded-lg border border-border/50">
            {selectedFiles.map((sf, index) => (
              <div key={index} className="relative group">
                {sf.preview ? (
                  <img 
                    src={sf.preview} 
                    alt={sf.file.name} 
                    className={cn(
                      "object-cover rounded-md border border-border",
                      isMobile ? "h-14 w-14" : "h-12 w-12 md:h-14 md:w-14"
                    )}
                  />
                ) : (
                  <div className={cn(
                    "flex flex-col items-center justify-center bg-muted rounded-md border border-border p-1",
                    isMobile ? "h-14 w-14" : "h-12 w-12 md:h-14 md:w-14"
                  )}>
                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground truncate w-full text-center mt-0.5">
                      {sf.file.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main composer container */}
        <div className={cn(
          "border border-border rounded-xl bg-background overflow-hidden",
          isMobile && "rounded-2xl"
        )}>
          {/* Formatting toolbar - desktop only */}
          {!isMobile && (
            <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/50 bg-muted/20">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => applyFormatting('bold')}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => applyFormatting('italic')}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => applyFormatting('strikethrough')}
              >
                <Strikethrough className="h-3.5 w-3.5" />
              </Button>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <Link className="h-3.5 w-3.5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => applyFormatting('code')}
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Message input area */}
          <div ref={composerContainerRef} className="relative">
            <MentionAutocomplete
              isOpen={showMentions}
              searchText={mentionSearch}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentions(false)}
              anchorRef={composerContainerRef}
            />
            
            <Textarea
              ref={textareaRef}
              placeholder={isMobile ? "Message..." : "Type a message... Use @ to mention someone"}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              className={cn(
                "border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none",
                isMobile 
                  ? "min-h-[48px] max-h-[120px] text-base py-3 px-4" 
                  : "min-h-[44px] max-h-[160px] text-sm"
              )}
              rows={1}
            />
          </div>

          {/* Bottom action bar - mobile optimized */}
          <div className={cn(
            "flex items-center justify-between border-t border-border/50 bg-muted/20",
            isMobile ? "px-1.5 py-1.5" : "px-2 py-1.5"
          )}>
            <div className="flex items-center gap-0">
              {/* Attachments */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      isMobile ? "h-10 w-10" : "h-8 w-8"
                    )}
                  >
                    <Plus className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-1">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 h-9"
                    onClick={() => openUploadDialog("file")}
                  >
                    <Paperclip className="h-4 w-4" />
                    Upload file
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 h-9"
                    onClick={() => openUploadDialog("image")}
                  >
                    <Image className="h-4 w-4" />
                    Upload image
                  </Button>
                </PopoverContent>
              </Popover>

              {/* Emoji */}
              <EmojiPicker
                onSelect={insertEmoji}
                showSearch={true}
                showRecent={true}
                showCategories={true}
                align="start"
                side="top"
                trigger={
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "text-muted-foreground hover:text-foreground",
                      isMobile ? "h-10 w-10" : "h-8 w-8"
                    )}
                  >
                    <Smile className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
                  </Button>
                }
              />

              {/* Mention */}
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  isMobile ? "h-10 w-10" : "h-8 w-8"
                )}
                onClick={() => {
                  const cursorPosition = textareaRef.current?.selectionStart || message.length;
                  setMessage(prev => prev.slice(0, cursorPosition) + '@' + prev.slice(cursorPosition));
                  setShowMentions(true);
                  textareaRef.current?.focus();
                }}
              >
                <AtSign className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
              </Button>
            </div>

            {/* Send button */}
            <Button 
              size={isMobile ? "icon" : "sm"}
              className={cn(
                "transition-all",
                isMobile 
                  ? "h-10 w-10 rounded-full" 
                  : "h-8 px-3 gap-1.5",
                !canSend && "opacity-50"
              )}
              onClick={handleSend}
              disabled={!canSend || sendMessage.isPending || isUploading}
            >
              <Send className={isMobile ? "h-5 w-5" : "h-3.5 w-3.5"} />
              {!isMobile && <span>Send</span>}
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadType === "image" ? "Upload Images" : "Upload Files"}
            </DialogTitle>
          </DialogHeader>
          
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={uploadType === "image" ? ALLOWED_IMAGE_TYPES.join(",") : ALLOWED_FILE_TYPES.join(",")}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop {uploadType === "image" ? "images" : "files"} here, or
            </p>
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
            >
              Browse files
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Max file size: 10MB
            </p>
          </div>

          {/* Preview selected files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedFiles.map((sf, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-md"
                >
                  {sf.preview ? (
                    <img 
                      src={sf.preview} 
                      alt={sf.file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <div className="h-10 w-10 flex items-center justify-center bg-muted rounded">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sf.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(sf.file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmUpload}
              disabled={selectedFiles.length === 0}
            >
              Add to message
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

MessageComposer.displayName = "MessageComposer";

export default MessageComposer;
