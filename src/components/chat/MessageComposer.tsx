import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
} from "lucide-react";
import { useSendMessage } from "@/services/useChat";
import { toast } from "sonner";

const EMOJI_LIST = ["👍", "❤️", "😊", "😂", "🎉", "👏", "🔥", "💯", "✨", "🙌", "👀", "🤔"];

interface MessageComposerProps {
  conversationId: string | null;
  spaceId: string | null;
}

const MessageComposer = ({ conversationId, spaceId }: MessageComposerProps) => {
  const [message, setMessage] = useState("");
  const [showFormatting, setShowFormatting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const sendMessage = useSendMessage();

  const handleSend = async () => {
    if (!message.trim()) return;
    
    try {
      await sendMessage.mutateAsync({
        content: message.trim(),
        conversationId: conversationId || undefined,
        spaceId: spaceId || undefined,
      });
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
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

  return (
    <div className="border-t border-border bg-card p-3">
      {/* Formatting toolbar */}
      {showFormatting && (
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

      <div className="flex items-end gap-2">
        {/* Attachment button */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
              <Plus className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-1">
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Paperclip className="h-4 w-4" />
              Upload file
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <Image className="h-4 w-4" />
              Upload image
            </Button>
          </PopoverContent>
        </Popover>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            placeholder="History is on"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[40px] max-h-[200px] resize-none pr-24"
            rows={1}
          />
          
          {/* Input actions */}
          <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setShowFormatting(!showFormatting)}
            >
              <Bold className="h-4 w-4" />
            </Button>
            
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
          disabled={!message.trim() || sendMessage.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* History indicator */}
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <History className="h-3 w-3" />
        <span>History is on</span>
      </div>
    </div>
  );
};

export default MessageComposer;
