import { useState, useRef, useEffect } from "react";
import { Send, Loader2, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AskAIInputModeToggle, InputMode } from "./AskAIInputModeToggle";
import MentionAutocomplete from "@/components/chat/MentionAutocomplete";

interface TeamMember {
  id: string;
  name: string;
  position: string | null;
  avatar_url: string | null;
}

interface AskAIInputProps {
  onSend: (message: string) => void;
  onAddNote?: (content: string, mentionedEmployeeIds: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showNoteMode?: boolean;
}

export const AskAIInput = ({
  onSend,
  onAddNote,
  isLoading,
  disabled,
  placeholder = "Ask anything about your organization...",
  className,
  showNoteMode = false,
}: AskAIInputProps) => {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<InputMode>("message");
  const [mentionedIds, setMentionedIds] = useState<string[]>([]);
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    searchText: "",
    triggerIndex: -1,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);

    // Handle @mention detection in note mode
    if (mode === "note") {
      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        const isValidMention =
          (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1])) &&
          !textAfterAt.includes(" ");

        if (isValidMention) {
          setMentionState({
            isOpen: true,
            searchText: textAfterAt,
            triggerIndex: lastAtIndex,
          });
          return;
        }
      }
    }

    setMentionState({ isOpen: false, searchText: "", triggerIndex: -1 });
  };

  const handleMentionSelect = (member: TeamMember) => {
    const beforeMention = input.slice(0, mentionState.triggerIndex);
    const afterMention = input.slice(
      mentionState.triggerIndex + mentionState.searchText.length + 1
    );
    const newValue = `${beforeMention}@${member.name} ${afterMention}`;
    setInput(newValue);
    setMentionedIds((prev) => [...prev, member.id]);
    setMentionState({ isOpen: false, searchText: "", triggerIndex: -1 });
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!input.trim() || isLoading || disabled) return;

    if (mode === "note" && onAddNote) {
      onAddNote(input.trim(), mentionedIds);
    } else {
      onSend(input.trim());
    }

    setInput("");
    setMentionedIds([]);
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const notePlaceholder = "Add an internal note (use @name to mention)...";

  return (
    <div className={cn("relative space-y-2", className)}>
      {/* Mode Toggle - Only show if sharing is enabled */}
      {showNoteMode && (
        <AskAIInputModeToggle
          mode={mode}
          onModeChange={setMode}
          disabled={isLoading || disabled}
        />
      )}

      <div
        className={cn(
          "flex items-end gap-2 p-3 rounded-2xl border bg-background shadow-sm",
          mode === "note" && "border-warning/50 bg-warning/5"
        )}
      >
        {mode === "note" && (
          <StickyNote className="h-4 w-4 text-warning shrink-0 mb-3" />
        )}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={mode === "note" ? notePlaceholder : placeholder}
          disabled={isLoading || disabled}
          className={cn(
            "min-h-[44px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-2 text-sm",
            mode === "note" && "placeholder:text-warning/70"
          )}
          rows={1}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading || disabled}
          className={cn(
            "shrink-0 h-10 w-10 rounded-xl",
            mode === "note" && "bg-warning hover:bg-warning/90 text-warning-foreground"
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mention Autocomplete */}
      {mode === "note" && (
        <MentionAutocomplete
          isOpen={mentionState.isOpen}
          searchText={mentionState.searchText}
          onSelect={handleMentionSelect}
          onClose={() =>
            setMentionState({ isOpen: false, searchText: "", triggerIndex: -1 })
          }
          anchorRef={textareaRef}
        />
      )}

      <p className="text-xs text-center text-muted-foreground">
        {mode === "note"
          ? "Internal notes are only visible to team members, not sent to AI"
          : "AI responses are generated based on your organization's data"}
      </p>
    </div>
  );
};
