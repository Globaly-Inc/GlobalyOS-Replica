import { useState, useRef, useEffect, useCallback } from "react";
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
import Prism from "prismjs";

// Import Prism languages
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-php";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-css";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-scala";
import "prismjs/components/prism-r";
import "prismjs/components/prism-lua";
import "prismjs/components/prism-perl";
import "prismjs/components/prism-objectivec";
import "prismjs/components/prism-elixir";
import "prismjs/components/prism-haskell";

const CODE_LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "C#", value: "csharp" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "Ruby", value: "ruby" },
  { label: "PHP", value: "php" },
  { label: "Swift", value: "swift" },
  { label: "Kotlin", value: "kotlin" },
  { label: "HTML", value: "markup" },
  { label: "CSS", value: "css" },
  { label: "SQL", value: "sql" },
  { label: "Bash", value: "bash" },
  { label: "Shell", value: "bash" },
  { label: "JSON", value: "json" },
  { label: "YAML", value: "yaml" },
  { label: "XML", value: "markup" },
  { label: "Markdown", value: "markdown" },
  { label: "GraphQL", value: "graphql" },
  { label: "Dart", value: "dart" },
  { label: "Scala", value: "scala" },
  { label: "R", value: "r" },
  { label: "Lua", value: "lua" },
  { label: "Perl", value: "perl" },
  { label: "Objective-C", value: "objectivec" },
  { label: "Elixir", value: "elixir" },
  { label: "Haskell", value: "haskell" },
  { label: "Plain text", value: "plaintext" },
];

interface WikiCodeEditorProps {
  code: string;
  language?: string;
  onCodeChange?: (code: string) => void;
  onLanguageChange?: (language: string) => void;
  editable?: boolean;
  className?: string;
}

export const WikiCodeEditor = ({
  code,
  language = "JavaScript",
  onCodeChange,
  onLanguageChange,
  editable = false,
  className,
}: WikiCodeEditorProps) => {
  const [copied, setCopied] = useState(false);
  const [localCode, setLocalCode] = useState(code);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  const getPrismLanguage = (lang: string): string => {
    const found = CODE_LANGUAGES.find(
      (l) => l.label.toLowerCase() === lang.toLowerCase()
    );
    return found?.value || "plaintext";
  };

  const highlightCode = useCallback((codeText: string, lang: string) => {
    const prismLang = getPrismLanguage(lang);
    const grammar = Prism.languages[prismLang];
    if (grammar) {
      return Prism.highlight(codeText, grammar, prismLang);
    }
    return codeText;
  }, []);

  useEffect(() => {
    setLocalCode(code);
  }, [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localCode);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleCodeInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setLocalCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = localCode.substring(0, start) + "  " + localCode.substring(end);
      setLocalCode(newCode);
      onCodeChange?.(newCode);
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const highlightedHtml = highlightCode(localCode || "", language);

  return (
    <div className={cn("rounded-lg overflow-hidden my-2 w-full wiki-code-editor", className)}>
      {/* Header */}
      <div className="bg-[#1e1e1e] px-4 py-2 flex items-center justify-between border-b border-[#333]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!editable}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 text-[#9cdcfe] hover:bg-[#333] hover:text-[#9cdcfe] font-medium text-sm",
                !editable && "cursor-default hover:bg-transparent"
              )}
            >
              {language.toLowerCase()}
              {editable && <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </DropdownMenuTrigger>
          {editable && (
            <DropdownMenuContent
              className="max-h-80 overflow-y-auto bg-[#252526] border-[#3c3c3c]"
              align="start"
            >
              {CODE_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.label}
                  onClick={() => onLanguageChange?.(lang.label)}
                  className={cn(
                    "cursor-pointer text-[#cccccc] hover:bg-[#094771] hover:text-white focus:bg-[#094771] focus:text-white",
                    lang.label === language && "bg-[#094771] text-white font-medium"
                  )}
                >
                  {lang.label === language && <Check className="h-4 w-4 mr-2" />}
                  {lang.label !== language && <span className="w-6" />}
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          )}
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 w-7 p-0 text-[#808080] hover:text-white hover:bg-[#333]"
          title="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Code editor area */}
      <div className="relative bg-[#1e1e1e] min-h-[120px]">
        {/* Syntax highlighted display */}
        <pre
          ref={highlightRef}
          className="absolute inset-0 p-4 m-0 font-mono text-sm leading-6 overflow-auto pointer-events-none"
          aria-hidden="true"
        >
          <code
            className="language-code"
            dangerouslySetInnerHTML={{ __html: highlightedHtml + (localCode.endsWith("\n") ? " " : "") }}
          />
        </pre>

        {/* Editable textarea overlay */}
        {editable ? (
          <textarea
            ref={textareaRef}
            value={localCode}
            onChange={handleCodeInput}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            className={cn(
              "relative w-full min-h-[120px] p-4 m-0",
              "bg-transparent text-transparent caret-white",
              "font-mono text-sm leading-6",
              "resize-none outline-none border-none",
              "overflow-auto whitespace-pre"
            )}
            style={{ caretColor: "white" }}
          />
        ) : (
          <div className="p-4 min-h-[120px]" />
        )}
      </div>

      {/* VS Code-like syntax highlighting styles */}
      <style>{`
        .wiki-code-editor .language-code {
          color: #d4d4d4;
          white-space: pre;
        }
        .wiki-code-editor .token.comment,
        .wiki-code-editor .token.prolog,
        .wiki-code-editor .token.doctype,
        .wiki-code-editor .token.cdata {
          color: #6a9955;
        }
        .wiki-code-editor .token.punctuation {
          color: #d4d4d4;
        }
        .wiki-code-editor .token.property,
        .wiki-code-editor .token.tag,
        .wiki-code-editor .token.boolean,
        .wiki-code-editor .token.number,
        .wiki-code-editor .token.constant,
        .wiki-code-editor .token.symbol,
        .wiki-code-editor .token.deleted {
          color: #b5cea8;
        }
        .wiki-code-editor .token.selector,
        .wiki-code-editor .token.attr-name,
        .wiki-code-editor .token.string,
        .wiki-code-editor .token.char,
        .wiki-code-editor .token.builtin,
        .wiki-code-editor .token.inserted {
          color: #ce9178;
        }
        .wiki-code-editor .token.operator,
        .wiki-code-editor .token.entity,
        .wiki-code-editor .token.url,
        .wiki-code-editor .language-css .token.string,
        .wiki-code-editor .style .token.string {
          color: #d4d4d4;
        }
        .wiki-code-editor .token.atrule,
        .wiki-code-editor .token.attr-value,
        .wiki-code-editor .token.keyword {
          color: #569cd6;
        }
        .wiki-code-editor .token.function,
        .wiki-code-editor .token.class-name {
          color: #dcdcaa;
        }
        .wiki-code-editor .token.regex,
        .wiki-code-editor .token.important,
        .wiki-code-editor .token.variable {
          color: #d16969;
        }
      `}</style>
    </div>
  );
};

// Static renderer for view mode with syntax highlighting
export const WikiCodeEditorRenderer = ({
  content,
  language = "JavaScript",
}: {
  content: string;
  language?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const getPrismLanguage = (lang: string): string => {
    const found = CODE_LANGUAGES.find(
      (l) => l.label.toLowerCase() === lang.toLowerCase()
    );
    return found?.value || "plaintext";
  };

  const highlightCode = (codeText: string, lang: string) => {
    const prismLang = getPrismLanguage(lang);
    const grammar = Prism.languages[prismLang];
    if (grammar) {
      return Prism.highlight(codeText, grammar, prismLang);
    }
    return codeText;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const highlightedHtml = highlightCode(content || "", language);

  return (
    <div className="rounded-lg overflow-hidden my-2 w-full wiki-code-editor">
      {/* Header */}
      <div className="bg-[#1e1e1e] px-4 py-2 flex items-center justify-between border-b border-[#333]">
        <span className="text-[#9cdcfe] font-medium text-sm">
          {language.toLowerCase()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 w-7 p-0 text-[#808080] hover:text-white hover:bg-[#333]"
          title="Copy code"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Code content with syntax highlighting */}
      <pre className="bg-[#1e1e1e] p-4 m-0 font-mono text-sm leading-6 overflow-auto min-h-[60px]">
        <code
          className="language-code"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </pre>

      {/* VS Code-like syntax highlighting styles */}
      <style>{`
        .wiki-code-editor .language-code {
          color: #d4d4d4;
          white-space: pre;
        }
        .wiki-code-editor .token.comment,
        .wiki-code-editor .token.prolog,
        .wiki-code-editor .token.doctype,
        .wiki-code-editor .token.cdata {
          color: #6a9955;
        }
        .wiki-code-editor .token.punctuation {
          color: #d4d4d4;
        }
        .wiki-code-editor .token.property,
        .wiki-code-editor .token.tag,
        .wiki-code-editor .token.boolean,
        .wiki-code-editor .token.number,
        .wiki-code-editor .token.constant,
        .wiki-code-editor .token.symbol,
        .wiki-code-editor .token.deleted {
          color: #b5cea8;
        }
        .wiki-code-editor .token.selector,
        .wiki-code-editor .token.attr-name,
        .wiki-code-editor .token.string,
        .wiki-code-editor .token.char,
        .wiki-code-editor .token.builtin,
        .wiki-code-editor .token.inserted {
          color: #ce9178;
        }
        .wiki-code-editor .token.operator,
        .wiki-code-editor .token.entity,
        .wiki-code-editor .token.url,
        .wiki-code-editor .language-css .token.string,
        .wiki-code-editor .style .token.string {
          color: #d4d4d4;
        }
        .wiki-code-editor .token.atrule,
        .wiki-code-editor .token.attr-value,
        .wiki-code-editor .token.keyword {
          color: #569cd6;
        }
        .wiki-code-editor .token.function,
        .wiki-code-editor .token.class-name {
          color: #dcdcaa;
        }
        .wiki-code-editor .token.regex,
        .wiki-code-editor .token.important,
        .wiki-code-editor .token.variable {
          color: #d16969;
        }
      `}</style>
    </div>
  );
};
