import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface AskAIMarkdownProps {
  content: string;
  className?: string;
}

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const AskAIMarkdown = ({ content, className }: AskAIMarkdownProps) => {
  const sanitizedHtml = useMemo(() => {
    const rawHtml = marked.parse(content, { async: false }) as string;
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        "p", "br", "strong", "em", "b", "i", "u", "s", "strike",
        "h1", "h2", "h3", "h4", "h5", "h6",
        "ul", "ol", "li",
        "blockquote", "pre", "code",
        "a", "hr", "table", "thead", "tbody", "tr", "th", "td",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
    });
  }, [content]);

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // Headings
        "prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        // Paragraphs
        "prose-p:my-2 prose-p:leading-relaxed",
        // Lists
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5",
        // Code
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-pre:overflow-x-auto",
        // Blockquotes
        "prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground",
        // Links
        "prose-a:text-primary prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-primary/80",
        // Tables
        "prose-table:border prose-table:border-border prose-th:border prose-th:border-border prose-th:p-2 prose-th:bg-muted",
        "prose-td:border prose-td:border-border prose-td:p-2",
        // HR
        "prose-hr:my-4 prose-hr:border-border",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
