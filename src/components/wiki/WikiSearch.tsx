import { useState, useEffect, useRef } from "react";
import { Search, FileText, Folder, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "folder" | "page";
  title: string;
  folderId?: string | null;
  preview?: string;
}

interface WikiSearchProps {
  folders: { id: string; name: string }[];
  pages: { id: string; title: string; content: string | null; folder_id: string | null }[];
  onSelectPage: (pageId: string) => void;
}

export const WikiSearch = ({ folders, pages, onSelectPage }: WikiSearchProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchQuery = query.toLowerCase();
    const matchedResults: SearchResult[] = [];

    // Search folders
    folders.forEach((folder) => {
      if (folder.name.toLowerCase().includes(searchQuery)) {
        matchedResults.push({
          id: folder.id,
          type: "folder",
          title: folder.name,
        });
      }
    });

    // Search pages
    pages.forEach((page) => {
      const titleMatch = page.title.toLowerCase().includes(searchQuery);
      const contentMatch = page.content?.toLowerCase().includes(searchQuery);

      if (titleMatch || contentMatch) {
        let preview = "";
        if (contentMatch && page.content) {
          // Extract preview around match
          const plainContent = page.content.replace(/<[^>]*>/g, "");
          const matchIndex = plainContent.toLowerCase().indexOf(searchQuery);
          if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 30);
            const end = Math.min(plainContent.length, matchIndex + searchQuery.length + 50);
            preview = (start > 0 ? "..." : "") + plainContent.slice(start, end) + (end < plainContent.length ? "..." : "");
          }
        }

        matchedResults.push({
          id: page.id,
          type: "page",
          title: page.title,
          folderId: page.folder_id,
          preview,
        });
      }
    });

    setResults(matchedResults.slice(0, 10));
    setSelectedIndex(0);
  }, [query, folders, pages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected && selected.type === "page") {
          onSelectPage(selected.id);
          setQuery("");
          setIsOpen(false);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === "page") {
      onSelectPage(result.id);
      setQuery("");
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search wiki..."
          className="pl-9 pr-8"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 overflow-hidden">
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-muted/50",
                selectedIndex === index && "bg-muted"
              )}
              onClick={() => handleSelectResult(result)}
            >
              {result.type === "folder" ? (
                <Folder className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              ) : (
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{result.title}</p>
                {result.preview && (
                  <p className="text-xs text-muted-foreground truncate">{result.preview}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
          No results found
        </div>
      )}
    </div>
  );
};
