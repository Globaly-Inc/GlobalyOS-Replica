import { useState, useRef, useEffect, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface TruncatedRichTextProps {
  content: string;
  maxLines?: number;
  className?: string;
}

const sanitizeHtml = (html: string) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'a', 'span', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'data-mention-id'],
  });
};

export const TruncatedRichText = ({ 
  content, 
  maxLines = 6, 
  className 
}: TruncatedRichTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncatable, setIsTruncatable] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Flatten paragraphs into single line with spaces for truncated view
  const flattenedContent = useMemo(() => {
    return content
      // Replace closing + opening paragraph tags with a space
      .replace(/<\/p>\s*<p>/gi, ' ')
      // Replace line breaks with spaces
      .replace(/<br\s*\/?>/gi, ' ')
      // Remove remaining paragraph tags
      .replace(/<p>/gi, '')
      .replace(/<\/p>/gi, '')
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      .trim();
  }, [content]);

  // Check if content needs truncation
  useEffect(() => {
    if (measureRef.current) {
      const el = measureRef.current;
      // Compare scrollHeight to clientHeight to detect overflow
      setIsTruncatable(el.scrollHeight > el.clientHeight + 2);
    }
  }, [flattenedContent]);

  const lineClampClass = maxLines === 6 ? 'line-clamp-6' : `line-clamp-[${maxLines}]`;

  return (
    <div>
      {/* Hidden measure element to detect if truncation is needed */}
      <div
        ref={measureRef}
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert",
          lineClampClass,
          "absolute opacity-0 pointer-events-none",
          className
        )}
        style={{ position: 'absolute', visibility: 'hidden', width: '100%' }}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(flattenedContent) }}
      />

      {/* Actual visible content */}
      <div
        ref={contentRef}
        className={cn(
          "prose prose-sm max-w-none dark:prose-invert",
          "[&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline",
          "[&_span[data-mention-id]]:text-primary [&_span[data-mention-id]]:font-medium",
          !isExpanded && lineClampClass,
          className
        )}
        dangerouslySetInnerHTML={{ 
          __html: sanitizeHtml(isExpanded ? content : flattenedContent) 
        }}
      />

      {isTruncatable && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary text-sm font-medium mt-1 hover:underline focus:outline-none"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
};
