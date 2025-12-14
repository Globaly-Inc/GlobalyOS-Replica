import { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Underline,
  List,
  ListOrdered,
  Paperclip,
  Image,
  History,
  X,
  FileIcon,
  Upload,
  AtSign,
} from "lucide-react";
import { useSendMessage, useTypingIndicator, useSaveMentions } from "@/services/useChat";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UploadProgress, { UploadingFile } from "./UploadProgress";
import MentionAutocomplete from "./MentionAutocomplete";
import { useIsMobile } from "@/hooks/use-mobile";

const EMOJI_LIST = ["👍", "❤️", "😊", "😂", "🎉", "👏", "🔥", "💯", "✨", "🙌", "👀", "🤔"];
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
  const [showFormatting, setShowFormatting] = useState(false);
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
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to clear typing status after 3 seconds of no typing
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

    // Detect @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Check if there's no space after @ (still typing mention)
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
      
      // Add to mentioned members if not already there
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
    
    // Clear typing status immediately when sending
    clearTypingStatus();
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    try {
      setIsUploading(true);
      
      // Initialize uploading files state for progress tracking
      const uploadingFilesInit: UploadingFile[] = selectedFiles.map((sf, index) => ({
        id: `upload-${index}-${Date.now()}`,
        name: sf.file.name,
        progress: 0,
        status: "uploading" as const,
        preview: sf.preview,
      }));
      setUploadingFiles(uploadingFilesInit);
      
      // Upload files first if any
      const uploadedAttachments: { fileName: string; filePath: string; fileSize: number; fileType: string }[] = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const { file } = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `${currentOrg?.id}/${fileName}`;
        
        // Update progress to simulate upload start
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
        
        // Update progress to complete
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

      // Save mentions if any
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
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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
      case 'underline':
        formattedText = `__${selectedText}__`;
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

  return (
    <div className="border-t border-border bg-card flex-shrink-0">
      {/* Upload Progress */}
      <UploadProgress files={uploadingFiles} />
      
      <div className="p-2 md:p-3">
      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
          {selectedFiles.map((sf, index) => (
            <div key={index} className="relative group">
              {sf.preview ? (
                <img 
                  src={sf.preview} 
                  alt={sf.file.name} 
                  className="h-12 w-12 md:h-16 md:w-16 object-cover rounded-md border border-border"
                />
              ) : (
                <div className="h-12 w-12 md:h-16 md:w-16 flex flex-col items-center justify-center bg-muted rounded-md border border-border p-1">
                  <FileIcon className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {sf.file.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeFile(index)}
                className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formatting toolbar - hidden on mobile */}
      {!isMobile && showFormatting && (
        <div className="flex items-center gap-1 mb-2 pb-2 border-b border-border">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => applyFormatting('bold')}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => applyFormatting('italic')}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => applyFormatting('underline')}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-1.5 md:gap-2">
        {/* Attachment button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-1">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2"
              onClick={() => openUploadDialog("file")}
            >
              <Paperclip className="h-4 w-4" />
              Upload file
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2"
              onClick={() => openUploadDialog("image")}
            >
              <Image className="h-4 w-4" />
              Upload image
            </Button>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 relative">
          {/* Mention Autocomplete */}
          <MentionAutocomplete
            isOpen={showMentions}
            searchText={mentionSearch}
            onSelect={handleMentionSelect}
            onClose={() => setShowMentions(false)}
          />
          
          <Textarea
            ref={textareaRef}
            placeholder={isMobile ? "Message" : "Type a message... Use @ to mention"}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            className={`min-h-[40px] max-h-[120px] md:max-h-[200px] resize-none ${isMobile ? 'pr-20 text-base' : 'pr-24'}`}
            rows={1}
          />
          
          {/* Input actions - compact on mobile */}
          <div className="absolute right-1.5 md:right-2 bottom-1.5 flex items-center gap-0.5 md:gap-1">
            {/* Hide formatting toggle on mobile */}
            {!isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => setShowFormatting(!showFormatting)}
              >
                <Bold className="h-4 w-4" />
              </Button>
            )}
            
            {/* @ mention button on mobile */}
            {isMobile && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => {
                  const cursorPosition = textareaRef.current?.selectionStart || message.length;
                  setMessage(prev => prev.slice(0, cursorPosition) + '@' + prev.slice(cursorPosition));
                  setShowMentions(true);
                  textareaRef.current?.focus();
                }}
              >
                <AtSign className="h-4 w-4" />
              </Button>
            )}
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <div className="grid grid-cols-6 gap-1">
                  {EMOJI_LIST.map((emoji) => (
                    <Button
                      key={emoji}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-lg"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Send button */}
        <Button 
          size="icon" 
          className="h-9 w-9 flex-shrink-0 rounded-full"
          onClick={handleSend}
          disabled={(!message.trim() && selectedFiles.length === 0) || sendMessage.isPending || isUploading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* History indicator - hidden on mobile */}
      {!isMobile && (
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          <History className="h-3 w-3" />
          <span>History is on</span>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {uploadType === "image" ? "Upload Images" : "Upload Files"}
            </DialogTitle>
          </DialogHeader>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-border hover:border-primary/50"
            }`}
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
    </div>
  );
});

MessageComposer.displayName = "MessageComposer";

export default MessageComposer;
