import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "./button";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";

// Configure DOMPurify with allowed tags and no attributes
const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'div', 'span'],
    ALLOWED_ATTR: ['class', 'data-mention-id'],
    KEEP_CONTENT: true
  });
};

export interface MentionState {
  isOpen: boolean;
  searchText: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  onMentionStateChange?: (state: MentionState) => void;
  onMentionInsert?: (memberId: string, memberName: string) => void;
  renderToolbarRight?: () => React.ReactNode;
}

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Write something...",
  className,
  minHeight = "100px",
  onMentionStateChange,
  onMentionInsert,
  renderToolbarRight,
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const mentionStartRef = useRef<number>(-1);

  // Sync editor content when value prop changes externally (e.g., from AI generation)
  useEffect(() => {
    if (editorRef.current) {
      const sanitizedValue = sanitizeHtml(value);
      // Only update if the content actually differs to avoid cursor issues
      if (editorRef.current.innerHTML !== sanitizedValue) {
        editorRef.current.innerHTML = sanitizedValue;
      }
    }
  }, [value]);

  const getCaretPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return -1;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current!);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  };

  const getTextContent = () => {
    return editorRef.current?.textContent || '';
  };

  const checkForMention = useCallback(() => {
    if (!onMentionStateChange) return;

    const text = getTextContent();
    const caretPos = getCaretPosition();
    
    if (caretPos === -1) {
      onMentionStateChange({ isOpen: false, searchText: '' });
      return;
    }

    const textBeforeCaret = text.slice(0, caretPos);
    const lastAtIndex = textBeforeCaret.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if @ is at start or preceded by whitespace
      const charBefore = lastAtIndex > 0 ? textBeforeCaret[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const textAfterAt = textBeforeCaret.slice(lastAtIndex + 1);
        // Only open if no spaces in the search text
        if (!textAfterAt.includes(' ')) {
          mentionStartRef.current = lastAtIndex;
          onMentionStateChange({ isOpen: true, searchText: textAfterAt });
          return;
        }
      }
    }

    mentionStartRef.current = -1;
    onMentionStateChange({ isOpen: false, searchText: '' });
  }, [onMentionStateChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(sanitizeHtml(editorRef.current.innerHTML));
      checkForMention();
    }
  }, [onChange, checkForMention]);

  const insertMention = useCallback((memberId: string, memberName: string) => {
    if (!editorRef.current || mentionStartRef.current === -1) return;

    const text = getTextContent();
    const caretPos = getCaretPosition();
    
    // Find the @ and replace with mention span
    const beforeAt = text.slice(0, mentionStartRef.current);
    const afterCaret = text.slice(caretPos);
    
    // Create the mention HTML
    const mentionHtml = `<span class="text-primary font-medium" data-mention-id="${memberId}">@${memberName}</span>&nbsp;`;
    
    // Replace content
    editorRef.current.innerHTML = sanitizeHtml(beforeAt + mentionHtml + afterCaret);
    onChange(sanitizeHtml(editorRef.current.innerHTML));
    
    // Notify parent
    onMentionInsert?.(memberId, memberName);
    
    // Reset mention state
    mentionStartRef.current = -1;
    onMentionStateChange?.({ isOpen: false, searchText: '' });

    // Move cursor to end of inserted mention
    editorRef.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [onChange, onMentionInsert, onMentionStateChange]);

  // Expose insertMention through ref pattern
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).insertMention = insertMention;
    }
  }, [insertMention]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      execCommand("bold");
    }
    if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      execCommand("italic");
    }
    if (e.key === "u" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      execCommand("underline");
    }
  };

  const isCommandActive = (command: string) => {
    return document.queryCommandState(command);
  };

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", isCommandActive("bold") && "bg-muted")}
          onClick={() => execCommand("bold")}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", isCommandActive("italic") && "bg-muted")}
          onClick={() => execCommand("italic")}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", isCommandActive("underline") && "bg-muted")}
          onClick={() => execCommand("underline")}
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", isCommandActive("insertUnorderedList") && "bg-muted")}
          onClick={() => execCommand("insertUnorderedList")}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", isCommandActive("insertOrderedList") && "bg-muted")}
          onClick={() => execCommand("insertOrderedList")}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        {/* Right side slot for additional toolbar content */}
        {renderToolbarRight && (
          <>
            <div className="flex-1" />
            {renderToolbarRight()}
          </>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          className={cn(
            "p-3 outline-none prose prose-sm max-w-none",
            "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
            "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
            "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
            "[&_li]:ml-0",
            "text-foreground"
          )}
          style={{ minHeight }}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onKeyUp={checkForMention}
          onClick={checkForMention}
          data-placeholder={placeholder}
        />
        {!value && !isFocused && (
          <div 
            className="absolute top-3 left-3 text-muted-foreground pointer-events-none"
            onClick={() => editorRef.current?.focus()}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to extract mention IDs from HTML content
export const extractMentionIds = (html: string): string[] => {
  const mentionIds: string[] = [];
  const regex = /data-mention-id="([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    mentionIds.push(match[1]);
  }
  return mentionIds;
};

// Component to render rich text content safely
export const RichTextContent = ({ 
  content, 
  className 
}: { 
  content: string; 
  className?: string;
}) => {
  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none leading-normal",
        "prose-p:mb-1 prose-p:mt-0 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:ml-0",
        "[&_p:empty]:hidden [&_p:has(br:only-child)]:mb-1",
        "text-foreground/80",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
};
