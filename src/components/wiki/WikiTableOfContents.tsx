import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface WikiTableOfContentsProps {
  content: string;
  className?: string;
}

export const WikiTableOfContents = ({ content, className }: WikiTableOfContentsProps) => {
  const tocItems = useMemo(() => {
    const items: TocItem[] = [];
    
    // Match both markdown headings and HTML headings
    const markdownHeadingRegex = /^(#{1,6})\s+(.+)$/gm;
    const htmlHeadingRegex = /<h([1-6])[^>]*>([^<]+)<\/h[1-6]>/gi;
    
    let match;
    let index = 0;
    
    // Extract markdown headings
    while ((match = markdownHeadingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = `heading-${index++}`;
      items.push({ id, text, level });
    }
    
    // Extract HTML headings (for imported content)
    while ((match = htmlHeadingRegex.exec(content)) !== null) {
      const level = parseInt(match[1]);
      const text = match[2].trim();
      const id = `heading-${index++}`;
      items.push({ id, text, level });
    }
    
    return items;
  }, [content]);

  if (tocItems.length === 0) {
    return null;
  }

  const scrollToHeading = (id: string, text: string) => {
    // Find the heading in the rendered content
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    for (const heading of headings) {
      if (heading.textContent?.trim() === text) {
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      }
    }
  };

  const minLevel = Math.min(...tocItems.map(item => item.level));

  return (
    <div className={cn("border rounded-lg bg-muted/30 p-4", className)}>
      <div className="flex items-center gap-2 mb-3 text-sm font-medium text-foreground">
        <List className="h-4 w-4" />
        <span>Table of Contents</span>
      </div>
      <nav className="space-y-1">
        {tocItems.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToHeading(item.id, item.text)}
            className={cn(
              "block w-full text-left text-sm py-1 px-2 rounded hover:bg-accent transition-colors",
              "text-muted-foreground hover:text-foreground truncate"
            )}
            style={{ paddingLeft: `${(item.level - minLevel) * 12 + 8}px` }}
          >
            {item.text}
          </button>
        ))}
      </nav>
    </div>
  );
};