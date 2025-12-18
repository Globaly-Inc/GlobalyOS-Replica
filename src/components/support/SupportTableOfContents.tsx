/**
 * Support Table of Contents Component
 * Sticky sidebar TOC that parses headings from markdown content
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { List } from 'lucide-react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface SupportTableOfContentsProps {
  content: string;
  className?: string;
}

export const SupportTableOfContents = ({ content, className }: SupportTableOfContentsProps) => {
  const tocItems = useMemo(() => {
    if (!content) return [];

    const items: TocItem[] = [];
    
    // Match markdown headings (## Heading, ### Subheading, etc.)
    const headingRegex = /^(#{2,4})\s+(.+)$/gm;
    let match;
    let index = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length; // 2 = h2, 3 = h3, 4 = h4
      const text = match[2]
        .replace(/@role:(owner|admin|hr|user)/g, '') // Remove role badges
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/\*/g, '') // Remove italic markers
        .trim();
      
      if (text) {
        // Create URL-friendly ID
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        items.push({ id: `heading-${index}-${id}`, text, level });
        index++;
      }
    }

    return items;
  }, [content]);

  const scrollToHeading = (id: string) => {
    // Find the heading by its text content since we can't easily add IDs to rendered markdown
    const headings = document.querySelectorAll('h2, h3, h4');
    const targetIndex = tocItems.findIndex(item => item.id === id);
    
    if (targetIndex !== -1 && headings[targetIndex]) {
      headings[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (tocItems.length === 0) {
    return null;
  }

  return (
    <nav className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
        <List className="h-4 w-4" />
        <span>Table of Contents</span>
      </div>
      <ul className="space-y-1">
        {tocItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => scrollToHeading(item.id)}
              className={cn(
                'w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                // Indentation based on heading level
                item.level === 2 && 'pl-2',
                item.level === 3 && 'pl-5 text-xs',
                item.level === 4 && 'pl-8 text-xs'
              )}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
