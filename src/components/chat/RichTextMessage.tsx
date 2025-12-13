import { useMemo } from "react";

interface RichTextMessageProps {
  content: string;
  className?: string;
}

/**
 * Renders message content with markdown-like formatting:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - ~~strikethrough~~
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
            {code}
          </code>
        );
      }

      // Process other formatting
      let processed = part;

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

      if (processed !== part) {
        return (
          <span
            key={index}
            dangerouslySetInnerHTML={{ __html: processed }}
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
