import { useMemo, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
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

interface WikiMarkdownRendererProps {
  content: string;
  className?: string;
}

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Configure DOMPurify to allow safe HTML including iframes for embeds
const sanitizeConfig = {
  ALLOWED_TAGS: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s", "del",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "div", "span",
    "iframe",
    "select", "option", "button"
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class", "id",
    "width", "height", "frameborder", "allowfullscreen",
    "target", "rel", "value", "selected", "contenteditable",
    "data-language", "style"
  ],
  ALLOW_DATA_ATTR: true,
};

const LANGUAGE_MAP: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  c: "c",
  "c++": "cpp",
  cpp: "cpp",
  "c#": "csharp",
  csharp: "csharp",
  go: "go",
  rust: "rust",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  html: "markup",
  css: "css",
  sql: "sql",
  bash: "bash",
  shell: "bash",
  json: "json",
  yaml: "yaml",
  xml: "markup",
  markdown: "markdown",
  graphql: "graphql",
  dart: "dart",
  scala: "scala",
  r: "r",
  lua: "lua",
  perl: "perl",
  "objective-c": "objectivec",
  objectivec: "objectivec",
  elixir: "elixir",
  haskell: "haskell",
  "plain text": "plaintext",
  plaintext: "plaintext",
};

export const WikiMarkdownRenderer = ({ content, className }: WikiMarkdownRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const renderedHtml = useMemo(() => {
    try {
      // Check if content is already HTML (from imported pages)
      const isHtml = /<[a-z][\s\S]*>/i.test(content) && !content.startsWith("#");
      
      let html: string;
      if (isHtml) {
        // Content is already HTML, just sanitize it
        html = content;
      } else {
        // Parse markdown to HTML
        html = marked.parse(content, { async: false }) as string;
      }
      
      // Sanitize the output
      return DOMPurify.sanitize(html, sanitizeConfig);
    } catch (err) {
      console.error("Markdown parsing error:", err);
      return DOMPurify.sanitize(content, sanitizeConfig);
    }
  }, [content]);

  // Apply syntax highlighting to code blocks after render
  useEffect(() => {
    if (!containerRef.current) return;

    // Find all wiki-code-block elements and apply syntax highlighting
    const codeBlocks = containerRef.current.querySelectorAll('.wiki-code-block');
    codeBlocks.forEach((block) => {
      const language = block.getAttribute('data-language') || 'JavaScript';
      const codeContent = block.querySelector('.wiki-code-content');
      if (codeContent && codeContent.textContent) {
        const prismLang = LANGUAGE_MAP[language.toLowerCase()] || 'plaintext';
        const grammar = Prism.languages[prismLang];
        if (grammar) {
          const highlighted = Prism.highlight(codeContent.textContent, grammar, prismLang);
          codeContent.innerHTML = highlighted;
        }
      }
    });

    // Add copy functionality to code blocks
    const copyButtons = containerRef.current.querySelectorAll('.wiki-code-copy');
    copyButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const codeBlock = (btn as HTMLElement).closest('.wiki-code-block');
        const codeContent = codeBlock?.querySelector('.wiki-code-content');
        if (codeContent?.textContent) {
          try {
            await navigator.clipboard.writeText(codeContent.textContent);
            btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(() => {
              btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
            }, 2000);
          } catch {
            console.error('Failed to copy');
          }
        }
      });
    });
  }, [renderedHtml]);

  return (
    <>
      <div 
        ref={containerRef}
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert",
          // Headings
          "prose-headings:font-semibold prose-headings:text-foreground",
          "prose-h1:text-2xl prose-h1:mt-6 prose-h1:mb-4",
          "prose-h2:text-xl prose-h2:mt-5 prose-h2:mb-3",
          "prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2",
          // Paragraphs
          "prose-p:text-foreground/80 prose-p:my-2 prose-p:leading-relaxed",
          // Lists
          "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
          // Links
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          // Code - inline code
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
          // Code blocks - styled with VS Code theme
          "[&_.wiki-code-block]:rounded-lg [&_.wiki-code-block]:overflow-hidden [&_.wiki-code-block]:my-2",
          "[&_.wiki-code-header]:bg-[#1e1e1e] [&_.wiki-code-header]:px-4 [&_.wiki-code-header]:py-2 [&_.wiki-code-header]:flex [&_.wiki-code-header]:items-center [&_.wiki-code-header]:justify-between [&_.wiki-code-header]:border-b [&_.wiki-code-header]:border-[#333]",
          "[&_.wiki-code-lang]:text-[#9cdcfe] [&_.wiki-code-lang]:text-sm [&_.wiki-code-lang]:font-medium",
          "[&_.wiki-code-lang-select]:bg-transparent [&_.wiki-code-lang-select]:text-[#9cdcfe] [&_.wiki-code-lang-select]:text-sm [&_.wiki-code-lang-select]:font-medium [&_.wiki-code-lang-select]:border-none [&_.wiki-code-lang-select]:outline-none [&_.wiki-code-lang-select]:cursor-pointer",
          "[&_.wiki-code-copy]:bg-transparent [&_.wiki-code-copy]:border-none [&_.wiki-code-copy]:text-[#808080] [&_.wiki-code-copy]:cursor-pointer [&_.wiki-code-copy]:p-1 [&_.wiki-code-copy]:rounded [&_.wiki-code-copy]:flex [&_.wiki-code-copy]:items-center [&_.wiki-code-copy]:justify-center hover:[&_.wiki-code-copy]:text-white hover:[&_.wiki-code-copy]:bg-[#333]",
          "[&_.wiki-code-content]:bg-[#1e1e1e] [&_.wiki-code-content]:p-4 [&_.wiki-code-content]:m-0 [&_.wiki-code-content]:font-mono [&_.wiki-code-content]:text-sm [&_.wiki-code-content]:leading-6 [&_.wiki-code-content]:overflow-auto [&_.wiki-code-content]:whitespace-pre [&_.wiki-code-content]:outline-none",
          // Fallback for regular pre tags
          "[&_pre:not(.wiki-code-content)]:bg-[#1e1e1e] [&_pre:not(.wiki-code-content)]:text-[#d4d4d4] [&_pre:not(.wiki-code-content)]:p-4 [&_pre:not(.wiki-code-content)]:rounded-lg [&_pre:not(.wiki-code-content)]:my-2 [&_pre:not(.wiki-code-content)]:overflow-auto [&_pre:not(.wiki-code-content)]:font-mono [&_pre:not(.wiki-code-content)]:text-sm",
          // Blockquotes - full width box with light background
          "[&_blockquote]:bg-muted [&_blockquote]:p-4 [&_blockquote]:rounded-md [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:my-2 [&_blockquote]:w-full",
          "prose-blockquote:not-italic prose-blockquote:text-foreground prose-blockquote:font-normal",
          // Tables
          "prose-table:border-collapse prose-table:w-full",
          "prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-medium",
          "prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2",
          // Images
          "prose-img:rounded-lg prose-img:max-w-full prose-img:h-auto",
          // HR
          "prose-hr:my-6 prose-hr:border-border",
          // Iframe (embeds)
          "[&_iframe]:rounded-lg [&_iframe]:my-4 [&_iframe]:max-w-full",
          className
        )}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
      
      {/* VS Code-like syntax highlighting styles */}
      <style>{`
        .wiki-code-content {
          color: #d4d4d4;
        }
        .wiki-code-content .token.comment,
        .wiki-code-content .token.prolog,
        .wiki-code-content .token.doctype,
        .wiki-code-content .token.cdata {
          color: #6a9955;
        }
        .wiki-code-content .token.punctuation {
          color: #d4d4d4;
        }
        .wiki-code-content .token.property,
        .wiki-code-content .token.tag,
        .wiki-code-content .token.boolean,
        .wiki-code-content .token.number,
        .wiki-code-content .token.constant,
        .wiki-code-content .token.symbol,
        .wiki-code-content .token.deleted {
          color: #b5cea8;
        }
        .wiki-code-content .token.selector,
        .wiki-code-content .token.attr-name,
        .wiki-code-content .token.string,
        .wiki-code-content .token.char,
        .wiki-code-content .token.builtin,
        .wiki-code-content .token.inserted {
          color: #ce9178;
        }
        .wiki-code-content .token.operator,
        .wiki-code-content .token.entity,
        .wiki-code-content .token.url,
        .language-css .wiki-code-content .token.string,
        .style .wiki-code-content .token.string {
          color: #d4d4d4;
        }
        .wiki-code-content .token.atrule,
        .wiki-code-content .token.attr-value,
        .wiki-code-content .token.keyword {
          color: #569cd6;
        }
        .wiki-code-content .token.function,
        .wiki-code-content .token.class-name {
          color: #dcdcaa;
        }
        .wiki-code-content .token.regex,
        .wiki-code-content .token.important,
        .wiki-code-content .token.variable {
          color: #d16969;
        }
      `}</style>
    </>
  );
};
