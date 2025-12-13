import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";

interface EditMessageInputProps {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EditMessageInput = ({
  initialContent,
  onSave,
  onCancel,
  isLoading,
}: EditMessageInputProps) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    textareaRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (content.trim()) {
        onSave(content.trim());
      }
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[60px] text-sm resize-none"
        placeholder="Edit your message..."
        disabled={isLoading}
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => content.trim() && onSave(content.trim())}
          disabled={!content.trim() || isLoading}
        >
          <Check className="h-4 w-4 mr-1" />
          Save
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Press Enter to save, Escape to cancel
      </p>
    </div>
  );
};

export default EditMessageInput;
