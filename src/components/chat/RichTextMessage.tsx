import { useMemo } from "react";
import DOMPurify from "dompurify";
import { ExternalLink } from "lucide-react";

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
 * URL pattern for detecting links
 */
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<]+[^\s<.,!?;:'")\]]/gi;

/**
 * Truncate URL for display
 */
const truncateUrl = (url: string, maxLength: number = 40): string => {
  try {
    const urlObj = new URL(url.startsWith('www.') ? `https://${url}` : url);
    const display = urlObj.hostname + urlObj.pathname;
    if (display.length <= maxLength) return display.replace(/\/$/, '');
    return display.slice(0, maxLength - 3).replace(/\/$/, '') + '...';
  } catch {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength - 3) + '...';
  }
};

/**
 * Renders message content with markdown-like formatting:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 * - ~~strikethrough~~
 * - URLs as clickable links
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

      // Check for URLs in this part
      const urlMatches = [...part.matchAll(new RegExp(URL_PATTERN.source, 'gi'))];
      
      if (urlMatches.length > 0) {
        // Split the part by URLs and render each segment
        const segments: React.ReactNode[] = [];
        let lastIndex = 0;
        
        urlMatches.forEach((match, matchIndex) => {
          const url = match[0];
          const matchStart = match.index!;
          
          // Add text before URL
          if (matchStart > lastIndex) {
            const textBefore = part.slice(lastIndex, matchStart);
            segments.push(
              <span key={`text-${index}-${matchIndex}`}>
                {renderFormattedText(textBefore, `${index}-${matchIndex}`)}
              </span>
            );
          }
          
          // Add URL link
          const fullUrl = url.startsWith('www.') ? `https://${url}` : url;
          segments.push(
            <a
              key={`url-${index}-${matchIndex}`}
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              {truncateUrl(url)}
              <ExternalLink className="h-3 w-3 inline-block shrink-0" />
            </a>
          );
          
          lastIndex = matchStart + url.length;
        });
        
        // Add remaining text after last URL
        if (lastIndex < part.length) {
          const textAfter = part.slice(lastIndex);
          segments.push(
            <span key={`text-${index}-end`}>
              {renderFormattedText(textAfter, `${index}-end`)}
            </span>
          );
        }
        
        return <span key={index}>{segments}</span>;
      }

      // No URLs, apply normal formatting
      return renderFormattedText(part, index);
    });
  }, [content]);

  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {formattedContent}
    </p>
  );
};

/**
 * Render text with markdown formatting (bold, italic, strikethrough)
 */
function renderFormattedText(text: string, key: string | number): React.ReactNode {
  // Escape HTML first to prevent XSS
  let processed = escapeHtml(text);

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

  if (processed !== escapeHtml(text)) {
    // Sanitize with DOMPurify as defense-in-depth
    const sanitized = DOMPurify.sanitize(processed, {
      ALLOWED_TAGS: ['strong', 'em', 'del'],
      ALLOWED_ATTR: [],
    });
    return (
      <span
        key={key}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  return <span key={key}>{text}</span>;
}

export default RichTextMessage;
