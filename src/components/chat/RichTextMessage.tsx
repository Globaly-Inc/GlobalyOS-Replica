import { useMemo } from "react";
import DOMPurify from "dompurify";

interface RichTextMessageProps {
  content: string;
  className?: string;
}

/**
 * Escapes HTML special characters to prevent XSS
 */
const escapeHtml = (text: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
};

/**
 * Renders message content with markdown-like formatting:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - ~~strikethrough~~
 * 
 * Security: Escapes HTML first, then applies formatting, then sanitizes with DOMPurify
 */
const RichTextMessage = ({ content, className = "" }: RichTextMessageProps) => {
  const formattedContent = useMemo(() => {
    if (!content) return null;

    // Split by code blocks first to avoid formatting inside code
    const parts = content.split(/(`[^`]+`)/g);

    return parts.map((part, index) => {
      // Code inline
      if (part.startsWith('`') && part.endsWith('`')) {
        const code = part.slice(1, -1);
        return (
          <code
            key={index}
            className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
          >
            {escapeHtml(code)}
          </code>
        );
      }

      // Escape HTML first to prevent XSS
      let processed = escapeHtml(part);

      // Bold **text** or __text__
      processed = processed.replace(
        /\*\*(.+?)\*\*|__(.+?)__/g,
        '<strong>$1$2</strong>'
      );

      // Italic *text* or _text_ (but not inside words like some_variable)
      processed = processed.replace(
        /(?<!\w)\*([^*]+)\*(?!\w)|(?<!\w)_([^_]+)_(?!\w)/g,
        '<em>$1$2</em>'
      );

      // Strikethrough ~~text~~
      processed = processed.replace(
        /~~(.+?)~~/g,
        '<del>$1</del>'
      );

      if (processed !== escapeHtml(part)) {
        // Sanitize with DOMPurify as defense-in-depth
        const sanitized = DOMPurify.sanitize(processed, {
          ALLOWED_TAGS: ['strong', 'em', 'del'],
          ALLOWED_ATTR: [],
        });
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        );
      }

      return <span key={index}>{part}</span>;
    });
  }, [content]);

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {formattedContent}
    </p>
  );
};

export default RichTextMessage;
