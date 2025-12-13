import { Folder, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface WikiFolder {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

interface WikiPage {
  id: string;
  folder_id: string | null;
  title: string;
  sort_order: number;
}

interface WikiFolderViewProps {
  folders: WikiFolder[];
  pages: WikiPage[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onSelectPage: (pageId: string) => void;
}

export const WikiFolderView = ({
  folders,
  pages,
  currentFolderId,
  onSelectFolder,
  onSelectPage,
}: WikiFolderViewProps) => {
  // Get child folders and pages for current view
  const childFolders = folders
    .filter((f) => f.parent_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order);
  
  const childPages = pages
    .filter((p) => p.folder_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Get breadcrumb path
  const getBreadcrumbs = () => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: "Wiki Home" }];
    if (currentFolderId) {
      let current = folders.find((f) => f.id === currentFolderId);
      const path: WikiFolder[] = [];
      while (current) {
        path.unshift(current);
        current = folders.find((f) => f.id === current?.parent_id);
      }
      path.forEach((f) => crumbs.push({ id: f.id, name: f.name }));
    }
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Breadcrumb navigation */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id ?? "home"} className="flex items-center">
              {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
              <button
                onClick={() => onSelectFolder(crumb.id)}
                className={cn(
                  "hover:text-primary transition-colors",
                  index === breadcrumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:underline"
                )}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {childFolders.length === 0 && childPages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Folder className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg">This folder is empty</p>
            <p className="text-sm mt-1">Create a new folder or page from the sidebar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {/* Folders */}
            {childFolders.map((folder) => {
              const folderPageCount = pages.filter((p) => p.folder_id === folder.id).length;
              const subfolderCount = folders.filter((f) => f.parent_id === folder.id).length;
              
              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  className="group flex flex-col items-center p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all hover:shadow-md"
                >
                  <div className="relative mb-3">
                    <Folder className="h-12 w-12 text-primary fill-primary/10 group-hover:scale-105 transition-transform" />
                  </div>
                  <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                    {folder.name}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {subfolderCount > 0 && `${subfolderCount} folder${subfolderCount > 1 ? "s" : ""}`}
                    {subfolderCount > 0 && folderPageCount > 0 && ", "}
                    {folderPageCount > 0 && `${folderPageCount} page${folderPageCount > 1 ? "s" : ""}`}
                    {subfolderCount === 0 && folderPageCount === 0 && "Empty"}
                  </span>
                </button>
              );
            })}

            {/* Pages */}
            {childPages.map((page) => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className="group flex flex-col items-center p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all hover:shadow-md"
              >
                <div className="relative mb-3">
                  <FileText className="h-12 w-12 text-muted-foreground group-hover:text-primary group-hover:scale-105 transition-all" />
                </div>
                <span className="text-sm font-medium text-center line-clamp-2 group-hover:text-primary transition-colors">
                  {page.title}
                </span>
                <span className="text-xs text-muted-foreground mt-1">Page</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
