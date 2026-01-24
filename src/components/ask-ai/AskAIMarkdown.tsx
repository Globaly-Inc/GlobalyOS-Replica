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
        // Headings - clear hierarchy with good spacing
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-4",
        "prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3",
        "prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2",
        "prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2",
        // Paragraphs - extra spacing between paragraphs for better readability
        "prose-p:my-5 prose-p:leading-7 prose-p:text-foreground",
        // Make first paragraph have no top margin
        "[&>p:first-child]:mt-0",
        // Extra spacing between sections
        "[&_p+p]:mt-6",
        "[&_ul+p]:mt-6 [&_ol+p]:mt-6 [&_blockquote+p]:mt-6",
        // Lists - clean spacing with extra gap after
        "prose-ul:my-5 prose-ol:my-5",
        "prose-ul:pl-5 prose-ol:pl-5",
        "prose-li:my-2 prose-li:leading-7",
        "prose-li:marker:text-muted-foreground",
        // Nested list spacing
        "[&_ul_ul]:my-3 [&_ol_ol]:my-3",
        // Code - inline and blocks
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono",
        "prose-code:before:content-none prose-code:after:content-none",
        "prose-code:text-foreground prose-code:font-medium",
        // Code blocks
        "prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:my-4",
        "prose-pre:border prose-pre:border-border",
        // Blockquotes - prominent but subtle
        "prose-blockquote:border-l-4 prose-blockquote:border-primary/40",
        "prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4",
        "prose-blockquote:italic prose-blockquote:text-muted-foreground",
        "prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-lg prose-blockquote:pr-4",
        // Links
        "prose-a:text-primary prose-a:underline prose-a:underline-offset-2",
        "hover:prose-a:text-primary/80 prose-a:transition-colors",
        // Strong/Bold
        "prose-strong:font-semibold prose-strong:text-foreground",
        // Tables - clean and readable
        "prose-table:border prose-table:border-border prose-table:my-4",
        "prose-th:border prose-th:border-border prose-th:p-3 prose-th:bg-muted prose-th:text-left prose-th:font-semibold",
        "prose-td:border prose-td:border-border prose-td:p-3",
        // Horizontal rules
        "prose-hr:my-6 prose-hr:border-border",
        // Images
        "prose-img:rounded-lg prose-img:my-4",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
