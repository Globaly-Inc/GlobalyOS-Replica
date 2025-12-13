import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus, MoreHorizontal, Pencil, Trash2, BookOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
interface WikiSidebarProps {
  folders: WikiFolder[];
  pages: WikiPage[];
  selectedPageId: string | null;
  selectedFolderId: string | null;
  showingHome: boolean;
  onSelectPage: (pageId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onSelectHome: () => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onCreatePage: (title: string, folderId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onRenamePage: (pageId: string, title: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeletePage: (pageId: string) => void;
  canEdit: boolean;
}
interface TreeItemProps {
  folder: WikiFolder;
  folders: WikiFolder[];
  pages: WikiPage[];
  selectedPageId: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onSelectPage: (pageId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onCreatePage: (title: string, folderId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onRenamePage: (pageId: string, title: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeletePage: (pageId: string) => void;
  canEdit: boolean;
  level: number;
}
const TreeItem = ({
  folder,
  folders,
  pages,
  selectedPageId,
  expandedFolders,
  onToggleFolder,
  onSelectPage,
  onCreateFolder,
  onCreatePage,
  onRenameFolder,
  onRenamePage,
  onDeleteFolder,
  onDeletePage,
  canEdit,
  level
}: TreeItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [isCreatingPage, setIsCreatingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [isCreatingSubfolder, setIsCreatingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const isExpanded = expandedFolders.has(folder.id);
  const childFolders = folders.filter(f => f.parent_id === folder.id).sort((a, b) => a.sort_order - b.sort_order);
  const childPages = pages.filter(p => p.folder_id === folder.id).sort((a, b) => a.sort_order - b.sort_order);
  const handleRename = () => {
    if (renameValue.trim()) {
      onRenameFolder(folder.id, renameValue.trim());
      setIsRenaming(false);
    }
  };
  const handleCreatePage = () => {
    if (newPageTitle.trim()) {
      onCreatePage(newPageTitle.trim(), folder.id);
      setNewPageTitle("");
      setIsCreatingPage(false);
    }
  };
  const handleCreateSubfolder = () => {
    if (newSubfolderName.trim()) {
      onCreateFolder(newSubfolderName.trim(), folder.id);
      setNewSubfolderName("");
      setIsCreatingSubfolder(false);
    }
  };
  return <div>
      <div className={cn("group flex items-center gap-1 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer", level > 0 && "ml-4")} onClick={() => onToggleFolder(folder.id)}>
        <button className="p-0.5 hover:bg-muted rounded">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>
        {isExpanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />}
        {isRenaming ? <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={handleRename} onKeyDown={e => {
        if (e.key === "Enter") handleRename();
        if (e.key === "Escape") setIsRenaming(false);
      }} className="h-6 text-sm py-0 px-1" autoFocus onClick={e => e.stopPropagation()} /> : <span className="text-sm font-medium truncate flex-1">{folder.name}</span>}
        {canEdit && !isRenaming && <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCreatingPage(true)}>
                <FileText className="h-4 w-4 mr-2" />
                New Page
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCreatingSubfolder(true)}>
                <Folder className="h-4 w-4 mr-2" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteFolder(folder.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
      </div>

      {isExpanded && <div className="ml-4">
          {isCreatingSubfolder && <div className="flex items-center gap-1 py-1 px-2 ml-4">
              <Folder className="h-4 w-4 text-muted-foreground" />
              <Input value={newSubfolderName} onChange={e => setNewSubfolderName(e.target.value)} onBlur={() => {
          if (!newSubfolderName.trim()) setIsCreatingSubfolder(false);
        }} onKeyDown={e => {
          if (e.key === "Enter") handleCreateSubfolder();
          if (e.key === "Escape") setIsCreatingSubfolder(false);
        }} placeholder="Folder name..." className="h-6 text-sm py-0 px-1" autoFocus />
            </div>}

          {childFolders.map(childFolder => <TreeItem key={childFolder.id} folder={childFolder} folders={folders} pages={pages} selectedPageId={selectedPageId} expandedFolders={expandedFolders} onToggleFolder={onToggleFolder} onSelectPage={onSelectPage} onCreateFolder={onCreateFolder} onCreatePage={onCreatePage} onRenameFolder={onRenameFolder} onRenamePage={onRenamePage} onDeleteFolder={onDeleteFolder} onDeletePage={onDeletePage} canEdit={canEdit} level={level + 1} />)}

          {isCreatingPage && <div className="flex items-center gap-1 py-1 px-2 ml-4">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Input value={newPageTitle} onChange={e => setNewPageTitle(e.target.value)} onBlur={() => {
          if (!newPageTitle.trim()) setIsCreatingPage(false);
        }} onKeyDown={e => {
          if (e.key === "Enter") handleCreatePage();
          if (e.key === "Escape") setIsCreatingPage(false);
        }} placeholder="Page title..." className="h-6 text-sm py-0 px-1" autoFocus />
            </div>}

          {childPages.map(page => <PageItem key={page.id} page={page} isSelected={selectedPageId === page.id} onSelect={() => onSelectPage(page.id)} onRename={onRenamePage} onDelete={onDeletePage} canEdit={canEdit} />)}
        </div>}
    </div>;
};
interface PageItemProps {
  page: WikiPage;
  isSelected: boolean;
  onSelect: () => void;
  onRename: (pageId: string, title: string) => void;
  onDelete: (pageId: string) => void;
  canEdit: boolean;
}
const PageItem = ({
  page,
  isSelected,
  onSelect,
  onRename,
  onDelete,
  canEdit
}: PageItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(page.title);
  const handleRename = () => {
    if (renameValue.trim()) {
      onRename(page.id, renameValue.trim());
      setIsRenaming(false);
    }
  };
  return <div className={cn("group flex items-center gap-2 py-1.5 px-2 ml-4 rounded-md cursor-pointer", isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50")} onClick={onSelect}>
      <FileText className="h-4 w-4 text-muted-foreground" />
      {isRenaming ? <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={handleRename} onKeyDown={e => {
      if (e.key === "Enter") handleRename();
      if (e.key === "Escape") setIsRenaming(false);
    }} className="h-6 text-sm py-0 px-1" autoFocus onClick={e => e.stopPropagation()} /> : <span className="text-sm truncate flex-1">{page.title}</span>}
      {canEdit && !isRenaming && <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsRenaming(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(page.id)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>}
    </div>;
};
export const WikiSidebar = ({
  folders,
  pages,
  selectedPageId,
  selectedFolderId,
  showingHome,
  onSelectPage,
  onSelectFolder,
  onSelectHome,
  onCreateFolder,
  onCreatePage,
  onRenameFolder,
  onRenamePage,
  onDeleteFolder,
  onDeletePage,
  canEdit
}: WikiSidebarProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingRootPage, setIsCreatingRootPage] = useState(false);
  const [newRootPageTitle, setNewRootPageTitle] = useState("");
  const rootFolders = folders.filter(f => !f.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const rootPages = pages.filter(p => !p.folder_id).sort((a, b) => a.sort_order - b.sort_order);
  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), null);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };
  const handleCreateRootPage = () => {
    if (newRootPageTitle.trim()) {
      onCreatePage(newRootPageTitle.trim(), null);
      setNewRootPageTitle("");
      setIsCreatingRootPage(false);
    }
  };
  return <div className="h-full flex flex-col bg-card border-r">
      <div className="p-3 border-b flex items-center justify-between">
        <button 
          onClick={onSelectHome}
          className={cn(
            "flex items-center gap-2 font-semibold text-sm hover:text-primary transition-colors",
            showingHome && !selectedFolderId && "text-primary"
          )}
        >
          <BookOpen className="h-4 w-4" />
          Wiki Home
        </button>
        {canEdit && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsCreatingFolder(true)}>
                <Folder className="h-4 w-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsCreatingRootPage(true)}>
                <FileText className="h-4 w-4 mr-2" />
                New Page
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isCreatingFolder && <div className="flex items-center gap-1 py-1 px-2 mb-1">
            <Folder className="h-4 w-4 text-primary" />
            <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onBlur={() => {
          if (!newFolderName.trim()) setIsCreatingFolder(false);
        }} onKeyDown={e => {
          if (e.key === "Enter") handleCreateFolder();
          if (e.key === "Escape") setIsCreatingFolder(false);
        }} placeholder="Folder name..." className="h-6 text-sm py-0 px-1" autoFocus />
          </div>}

        {rootFolders.map(folder => <TreeItem key={folder.id} folder={folder} folders={folders} pages={pages} selectedPageId={selectedPageId} expandedFolders={expandedFolders} onToggleFolder={handleToggleFolder} onSelectPage={onSelectPage} onCreateFolder={onCreateFolder} onCreatePage={onCreatePage} onRenameFolder={onRenameFolder} onRenamePage={onRenamePage} onDeleteFolder={onDeleteFolder} onDeletePage={onDeletePage} canEdit={canEdit} level={0} />)}

        {isCreatingRootPage && <div className="flex items-center gap-1 py-1 px-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Input value={newRootPageTitle} onChange={e => setNewRootPageTitle(e.target.value)} onBlur={() => {
          if (!newRootPageTitle.trim()) setIsCreatingRootPage(false);
        }} onKeyDown={e => {
          if (e.key === "Enter") handleCreateRootPage();
          if (e.key === "Escape") setIsCreatingRootPage(false);
        }} placeholder="Page title..." className="h-6 text-sm py-0 px-1" autoFocus />
          </div>}

        {rootPages.map(page => <PageItem key={page.id} page={page} isSelected={selectedPageId === page.id} onSelect={() => onSelectPage(page.id)} onRename={onRenamePage} onDelete={onDeletePage} canEdit={canEdit} />)}

        {folders.length === 0 && pages.length === 0 && !isCreatingFolder && !isCreatingRootPage && <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No wiki content yet.</p>
            {canEdit && <p className="mt-1">Click + to create a folder or page.</p>}
          </div>}
      </div>
    </div>;
};