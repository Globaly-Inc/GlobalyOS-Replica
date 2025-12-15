import { useState } from "react";
import { Folder, FileText, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface WikiPage {
  id: string;
  folder_id: string | null;
  title: string;
}

interface WikiFolderTreeProps {
  folders: WikiFolder[];
  pages: WikiPage[];
  selectedPageId: string | null;
  selectedFolderId: string | null;
  onSelectPage: (pageId: string) => void;
  onSelectFolder: (folderId: string) => void;
}

interface FolderNodeProps {
  folder: WikiFolder;
  folders: WikiFolder[];
  pages: WikiPage[];
  selectedPageId: string | null;
  selectedFolderId: string | null;
  onSelectPage: (pageId: string) => void;
  onSelectFolder: (folderId: string) => void;
  level: number;
}

const FolderNode = ({
  folder,
  folders,
  pages,
  selectedPageId,
  selectedFolderId,
  onSelectPage,
  onSelectFolder,
  level,
}: FolderNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const childFolders = folders.filter(f => f.parent_id === folder.id);
  const childPages = pages.filter(p => p.folder_id === folder.id);
  const hasChildren = childFolders.length > 0 || childPages.length > 0;
  const isSelected = selectedFolderId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => {
          onSelectFolder(folder.id);
          if (hasChildren) setIsExpanded(!isExpanded);
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 rounded hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Folder className={cn("h-4 w-4 flex-shrink-0", isSelected ? "text-primary" : "text-primary/70")} />
        <span className="text-sm truncate">{folder.name}</span>
      </div>
      
      {isExpanded && (
        <div>
          {childFolders.map(childFolder => (
            <FolderNode
              key={childFolder.id}
              folder={childFolder}
              folders={folders}
              pages={pages}
              selectedPageId={selectedPageId}
              selectedFolderId={selectedFolderId}
              onSelectPage={onSelectPage}
              onSelectFolder={onSelectFolder}
              level={level + 1}
            />
          ))}
          {childPages.map(page => (
            <div
              key={page.id}
              className={cn(
                "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer",
                selectedPageId === page.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              style={{ paddingLeft: `${(level + 1) * 12 + 8 + 16}px` }}
              onClick={() => onSelectPage(page.id)}
            >
              <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <span className="text-sm truncate">{page.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const WikiFolderTree = ({
  folders,
  pages,
  selectedPageId,
  selectedFolderId,
  onSelectPage,
  onSelectFolder,
}: WikiFolderTreeProps) => {
  const rootFolders = folders.filter(f => f.parent_id === null);
  const rootPages = pages.filter(p => p.folder_id === null);

  return (
    <div className="space-y-0.5">
      {rootFolders.map(folder => (
        <FolderNode
          key={folder.id}
          folder={folder}
          folders={folders}
          pages={pages}
          selectedPageId={selectedPageId}
          selectedFolderId={selectedFolderId}
          onSelectPage={onSelectPage}
          onSelectFolder={onSelectFolder}
          level={0}
        />
      ))}
      {rootPages.map(page => (
        <div
          key={page.id}
          className={cn(
            "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer",
            selectedPageId === page.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
          )}
          style={{ paddingLeft: "24px" }}
          onClick={() => onSelectPage(page.id)}
        >
          <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className="text-sm truncate">{page.title}</span>
        </div>
      ))}
    </div>
  );
};
