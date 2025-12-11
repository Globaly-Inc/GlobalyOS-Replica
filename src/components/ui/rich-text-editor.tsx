import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "./button";
import { Bold, Italic, Underline, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export const RichTextEditor = ({ 
  value, 
  onChange, 
  placeholder = "Write something...",
  className,
  minHeight = "100px"
}: RichTextEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

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

// Component to render rich text content safely
export const RichTextContent = ({ 
  content, 
  className 
}: { 
  content: string; 
  className?: string;
}) => {
  // Sanitize basic HTML - only allow safe tags
  const sanitizeHtml = (html: string) => {
    const allowedTags = ["b", "strong", "i", "em", "u", "ul", "ol", "li", "p", "br", "div"];
    const doc = new DOMParser().parseFromString(html, "text/html");
    
    const sanitize = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || "";
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        
        if (!allowedTags.includes(tagName)) {
          // For disallowed tags, just return children content
          return Array.from(el.childNodes).map(sanitize).join("");
        }
        
        const children = Array.from(el.childNodes).map(sanitize).join("");
        return `<${tagName}>${children}</${tagName}>`;
      }
      
      return "";
    };
    
    return sanitize(doc.body);
  };

  return (
    <div 
      className={cn(
        "prose prose-sm max-w-none",
        "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:ml-0",
        "text-foreground/80",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
    />
  );
};
