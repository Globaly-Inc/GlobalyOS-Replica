import { useState, useRef, useEffect } from 'react';
import { RichTextContent } from './rich-text-editor';
import { cn } from '@/lib/utils';

interface TruncatedRichTextProps {
  content: string;
  maxLines?: number;
  className?: string;
}

// Flatten HTML content for truncated view (replace paragraphs with spaces)
const flattenContent = (html: string): string => {
  return html
    .replace(/<\/p>\s*<p>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '');
};

export const TruncatedRichText = ({ 
  content, 
  maxLines = 6,
  className 
}: TruncatedRichTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (measureRef.current) {
        const lineHeight = parseFloat(getComputedStyle(measureRef.current).lineHeight) || 24;
        const maxHeight = lineHeight * maxLines;
        const actualHeight = measureRef.current.scrollHeight;
        setHasOverflow(actualHeight > maxHeight + 4); // 4px buffer
      }
    };

    checkOverflow();
    
    // Recheck on resize
    const observer = new ResizeObserver(checkOverflow);
    if (measureRef.current) {
      observer.observe(measureRef.current);
    }
    
    return () => observer.disconnect();
  }, [content, maxLines]);

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const flattenedContent = flattenContent(content);

  return (
    <div className="relative">
      {/* Hidden measure element to check if content overflows */}
      <div 
        ref={measureRef}
        className="absolute opacity-0 pointer-events-none -z-10"
        aria-hidden="true"
      >
        <RichTextContent content={content} className={className} />
      </div>

      {/* Visible content */}
      <div
        ref={contentRef}
        className={cn(
          "transition-all duration-300 ease-in-out",
          !isExpanded && hasOverflow && "line-clamp-6"
        )}
      >
        {isExpanded ? (
          <RichTextContent content={content} className={className} />
        ) : (
          <RichTextContent content={flattenedContent} className={className} />
        )}
      </div>

      {/* Read more / Show less toggle */}
      {hasOverflow && (
        <button
          onClick={toggleExpanded}
          className="mt-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
};
