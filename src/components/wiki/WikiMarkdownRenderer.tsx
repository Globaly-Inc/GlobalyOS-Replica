import { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

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
    "iframe"
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class", "id",
    "width", "height", "frameborder", "allowfullscreen",
    "target", "rel"
  ],
  ALLOW_DATA_ATTR: false,
};

export const WikiMarkdownRenderer = ({ content, className }: WikiMarkdownRendererProps) => {
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

  return (
    <div 
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
        // Code blocks - dark themed like VS Code
        "[&_pre]:bg-[#1e1e1e] [&_pre]:text-[#d4d4d4] [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:w-full",
        "[&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:whitespace-pre-wrap [&_pre]:break-words",
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
  );
};