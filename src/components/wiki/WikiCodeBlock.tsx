import { useState, useRef, useEffect } from "react";
import { Check, Copy, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CODE_LANGUAGES = [
  "Plain text",
  "Bash",
  "C",
  "C++",
  "C#",
  "CSS",
  "Dart",
  "Elixir",
  "Erlang",
  "Go",
  "GraphQL",
  "Groovy",
  "Haskell",
  "HCL",
  "HTML",
  "INI",
  "Java",
  "JavaScript",
  "JSON",
  "JSX",
  "Kotlin",
  "Lisp",
  "Lua",
  "Markdown",
  "Mermaid",
  "Nix",
  "Objective-C",
  "PHP",
  "Python",
  "R",
  "Ruby",
  "Rust",
  "Scala",
  "Shell",
  "SQL",
  "Swift",
  "TypeScript",
  "TSX",
  "YAML",
  "XML",
];

interface WikiCodeBlockProps {
  code: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
  editable?: boolean;
  className?: string;
}

export const WikiCodeBlock = ({
  code,
  language = "Plain text",
  onCodeChange,
  onLanguageChange,
  editable = false,
  className,
}: WikiCodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);

  const handleCopy = async () => {
    try {
      const textToCopy = codeRef.current?.textContent || code;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  const handleCodeInput = (e: React.FormEvent<HTMLPreElement>) => {
    if (onCodeChange) {
      onCodeChange(e.currentTarget.textContent || "");
    }
  };

  return (
    <div className={cn("rounded-lg overflow-hidden my-2 w-full", className)}>
      {/* Header */}
      <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#404040]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!editable}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-[#e0e0e0] hover:bg-[#404040] hover:text-white font-medium text-sm",
                !editable && "cursor-default hover:bg-transparent"
              )}
            >
              {language.toLowerCase()}
              {editable && <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </DropdownMenuTrigger>
          {editable && (
            <DropdownMenuContent 
              className="max-h-80 overflow-y-auto bg-white dark:bg-[#2d2d2d] border-border"
              align="start"
            >
              {CODE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => onLanguageChange?.(lang)}
                  className={cn(
                    "cursor-pointer",
                    lang === language && "bg-muted font-medium"
                  )}
                >
                  {lang === language && <Check className="h-4 w-4 mr-2" />}
                  {lang !== language && <span className="w-6" />}
                  {lang}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          )}
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 w-7 p-0 text-[#808080] hover:text-white hover:bg-[#404040]"
          title="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <pre
        ref={codeRef}
        contentEditable={editable}
        suppressContentEditableWarning
        onInput={handleCodeInput}
        className={cn(
          "bg-[#1e1e1e] text-[#d4d4d4] p-4 m-0",
          "font-mono text-sm leading-relaxed",
          "overflow-x-auto",
          "min-h-[60px]",
          "outline-none",
          editable && "focus:ring-1 focus:ring-[#404040]"
        )}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {code || (editable ? "" : "// Enter your code here...")}
      </pre>
    </div>
  );
};

// Static renderer for view mode
export const WikiCodeBlockRenderer = ({ 
  content, 
  language = "Plain text" 
}: { 
  content: string; 
  language?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="rounded-lg overflow-hidden my-2 w-full">
      {/* Header */}
      <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#404040]">
        <span className="text-[#e0e0e0] font-medium text-sm">
          {language.toLowerCase()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 w-7 p-0 text-[#808080] hover:text-white hover:bg-[#404040]"
          title="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <pre
        className="bg-[#1e1e1e] text-[#d4d4d4] p-4 m-0 font-mono text-sm leading-relaxed overflow-x-auto"
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {content}
      </pre>
    </div>
  );
};
