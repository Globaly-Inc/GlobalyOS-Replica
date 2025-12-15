import { useState, useMemo } from "react";
import { Search, FileText, Folder, Link } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WikiPage {
  id: string;
  title: string;
  folder_id: string | null;
}

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface WikiPageLinkPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: WikiPage[];
  folders: WikiFolder[];
  onSelectPage: (pageId: string, pageTitle: string) => void;
}

export const WikiPageLinkPicker = ({
  open,
  onOpenChange,
  pages,
  folders,
  onSelectPage,
}: WikiPageLinkPickerProps) => {
  const [search, setSearch] = useState("");
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  // Get folder path for a page
  const getFolderPath = (folderId: string | null): string => {
    if (!folderId) return "";
    const parts: string[] = [];
    let current = folders.find((f) => f.id === folderId);
    while (current) {
      parts.unshift(current.name);
      current = folders.find((f) => f.id === current?.parent_id);
    }
    return parts.join(" / ");
  };

  // Filter and group pages
  const filteredPages = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return pages;
    return pages.filter((page) =>
      page.title.toLowerCase().includes(query)
    );
  }, [pages, search]);

  // Group pages by folder
  const groupedPages = useMemo(() => {
    const groups: Record<string, { folderName: string; pages: WikiPage[] }> = {
      root: { folderName: "Root", pages: [] },
    };

    filteredPages.forEach((page) => {
      const folderId = page.folder_id || "root";
      if (!groups[folderId]) {
        const folder = folders.find((f) => f.id === folderId);
        groups[folderId] = {
          folderName: folder ? getFolderPath(folderId) || folder.name : "Unknown",
          pages: [],
        };
      }
      groups[folderId].pages.push(page);
    });

    // Remove empty groups
    return Object.entries(groups).filter(([, group]) => group.pages.length > 0);
  }, [filteredPages, folders]);

  const handleInsert = () => {
    if (selectedPageId) {
      const page = pages.find((p) => p.id === selectedPageId);
      if (page) {
        onSelectPage(selectedPageId, page.title);
        onOpenChange(false);
        setSearch("");
        setSelectedPageId(null);
      }
    }
  };

  const handleDoubleClick = (pageId: string, pageTitle: string) => {
    onSelectPage(pageId, pageTitle);
    onOpenChange(false);
    setSearch("");
    setSelectedPageId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Link to Wiki Page
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <ScrollArea className="h-[300px] rounded-md border">
            {groupedPages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <FileText className="h-8 w-8 mb-2" />
                <p>No pages found</p>
              </div>
            ) : (
              <div className="p-2 space-y-4">
                {groupedPages.map(([folderId, group]) => (
                  <div key={folderId}>
                    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                      <Folder className="h-3 w-3" />
                      {group.folderName}
                    </div>
                    <div className="space-y-1">
                      {group.pages.map((page) => (
                        <button
                          key={page.id}
                          onClick={() => setSelectedPageId(page.id)}
                          onDoubleClick={() => handleDoubleClick(page.id, page.title)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                            selectedPageId === page.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                        >
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{page.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>Double-click to insert quickly</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleInsert} disabled={!selectedPageId}>
                Insert Link
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
