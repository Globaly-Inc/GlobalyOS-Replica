import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, User, MoreHorizontal, Trash2, FolderOpen, List, Pencil, Share2, FolderPlus, ListPlus, ArrowRightLeft, Star } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTaskSpaces, useDeleteTaskSpace, useUpdateTaskSpace, useTaskFolders, useUpdateTaskFolder, useDeleteTaskFolder, useTaskLists, useCreateTaskList, useUpdateTaskList, useDeleteTaskList } from '@/services/useTasks';
import { useTaskFavoritesWithDetails, useToggleTaskFavorite } from '@/hooks/useTaskFavorites';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { CreateListDialog } from './CreateListDialog';
import { TaskSharingDialog } from './TaskSharingDialog';
import { SpaceIconPicker } from './SpaceIconPicker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import type { SidebarSelection, TaskSpaceRow, TaskFolderRow, TaskListRow } from '@/types/task';
import { toast } from 'sonner';

interface TaskInnerSidebarProps {
  selection: SidebarSelection;
  onSelect: (sel: SidebarSelection) => void;
}

export const TaskInnerSidebar = ({ selection, onSelect }: TaskInnerSidebarProps) => {
  const { data: spaces = [] } = useTaskSpaces();
  const { data: favoriteTasks = [] } = useTaskFavoritesWithDetails();
  const toggleFavorite = useToggleTaskFavorite();
  const [favoritesExpanded, setFavoritesExpanded] = useState(true);
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [createFolderSpaceId, setCreateFolderSpaceId] = useState<string | null>(null);
  const [sharingTarget, setSharingTarget] = useState<{ type: 'space' | 'folder' | 'list'; id: string; name: string } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<'space' | 'folder' | 'list' | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const deleteSpace = useDeleteTaskSpace();
  const updateSpace = useUpdateTaskSpace();

  const toggleSpace = (id: string) => {
    setExpandedSpaces(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDeleteSpace = async (id: string) => {
    try {
      await deleteSpace.mutateAsync(id);
      if (selection.id === id) onSelect({ type: 'all', id: null });
      toast.success('Space deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const startRename = (type: 'space' | 'folder' | 'list', id: string, name: string) => {
    setRenamingType(type);
    setRenamingId(id);
    setRenameValue(name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenamingType(null);
  };

  const handleSpaceIconChange = async (spaceId: string, emoji: string) => {
    try {
      await updateSpace.mutateAsync({ id: spaceId, icon: emoji });
    } catch {
      toast.error('Failed to update icon');
    }
  };

  const isSelected = (type: string, id: string | null) =>
    selection.type === type && selection.id === id;

  return (
    <div className="w-60 border-r bg-muted/30 flex flex-col h-full shrink-0">
      <div className="px-3 pt-1 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Workspace</p>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
            isSelected('all', null)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => onSelect({ type: 'all', id: null })}
        >
          <User className="h-4 w-4" />
          <span>My Tasks</span>
        </div>
      </div>

      {/* Favorites Section */}
        <div className="px-3 pt-2 pb-1">
          <Collapsible open={favoritesExpanded} onOpenChange={setFavoritesExpanded}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-1.5 group cursor-pointer">
                <Star className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Favorites</span>
                {favoritesExpanded
                  ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  : <ChevronRight className="h-3 w-3 text-muted-foreground" />
                }
              </CollapsibleTrigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-0.5 text-muted-foreground hover:text-foreground transition-opacity">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setFavoritesExpanded(!favoritesExpanded)}>
                    {favoritesExpanded ? 'Collapse' : 'Expand'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <CollapsibleContent>
              <div className="mt-1 space-y-0.5">
                {favoriteTasks.map(fav => (
                  <div
                    key={fav.task_id}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => {
                      if (fav.list_id) {
                        onSelect({ type: 'list', id: fav.list_id, spaceId: fav.space_id });
                      }
                    }}
                  >
                    <List className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate flex-1">{fav.name}</span>
                    <button
                      className="p-0.5 opacity-0 group-hover:opacity-100 text-orange-500 transition-opacity shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite.mutate(fav.task_id);
                      }}
                    >
                      <Star className="h-3 w-3 fill-orange-500" />
                    </button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spaces</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setShowCreateSpace(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-1">
        <div className="py-1 space-y-0.5">
          {spaces.filter(s => !s.parent_id).map(space => (
            <SpaceNode
              key={space.id}
              space={space}
              isExpanded={expandedSpaces.has(space.id)}
              onToggle={() => toggleSpace(space.id)}
              isSelected={isSelected('space', space.id)}
              onSelect={() => onSelect({ type: 'space', id: space.id, spaceId: space.id })}
              selection={selection}
              onSelectItem={onSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              renamingId={renamingId}
              renamingType={renamingType}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onStartRename={startRename}
              onCancelRename={cancelRename}
              onDelete={handleDeleteSpace}
              onShare={(type, id, name) => setSharingTarget({ type, id, name })}
              onCreateFolder={(spaceId) => setCreateFolderSpaceId(spaceId)}
              onIconChange={handleSpaceIconChange}
            />
          ))}
          {spaces.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              No spaces yet. Create one to get started.
            </p>
          )}
        </div>
      </ScrollArea>

      <CreateSpaceDialog open={showCreateSpace} onOpenChange={setShowCreateSpace} />
      {createFolderSpaceId && (
        <CreateFolderDialog
          open={!!createFolderSpaceId}
          onOpenChange={(open) => !open && setCreateFolderSpaceId(null)}
          spaceId={createFolderSpaceId}
        />
      )}
      {sharingTarget && (
        <TaskSharingDialog
          open={!!sharingTarget}
          onOpenChange={(open) => !open && setSharingTarget(null)}
          entityType={sharingTarget.type}
          entityId={sharingTarget.id}
          entityName={sharingTarget.name}
        />
      )}
    </div>
  );
};

// ─── Space Node ───

interface SpaceNodeProps {
  space: TaskSpaceRow;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: () => void;
  selection: SidebarSelection;
  onSelectItem: (sel: SidebarSelection) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  renamingId: string | null;
  renamingType: 'space' | 'folder' | 'list' | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onStartRename: (type: 'space' | 'folder' | 'list', id: string, name: string) => void;
  onCancelRename: () => void;
  onDelete: (id: string) => void;
  onShare: (type: 'space' | 'folder' | 'list', id: string, name: string) => void;
  onCreateFolder: (spaceId: string) => void;
  onIconChange: (spaceId: string, emoji: string) => void;
}

const SpaceNode = ({
  space, isExpanded, onToggle, isSelected, onSelect,
  selection, onSelectItem, expandedFolders, onToggleFolder,
  renamingId, renamingType, renameValue, onRenameValueChange, onStartRename, onCancelRename,
  onDelete, onShare, onCreateFolder, onIconChange,
}: SpaceNodeProps) => {
  const { data: folders = [] } = useTaskFolders(space.id);
  const { data: allLists = [] } = useTaskLists(space.id);
  const createList = useCreateTaskList();
  const deleteList = useDeleteTaskList();
  const deleteFolder = useDeleteTaskFolder();
  const updateSpace = useUpdateTaskSpace();
  const updateFolder = useUpdateTaskFolder();
  const updateList = useUpdateTaskList();

   const directLists = allLists.filter(l => !l.folder_id);

  const [createListDialogOpen, setCreateListDialogOpen] = useState(false);
  const [createListFolderId, setCreateListFolderId] = useState<string | undefined>(undefined);

  const handleAddList = (folderId?: string) => {
    setCreateListFolderId(folderId);
    setCreateListDialogOpen(true);
  };

  const handleListCreated = (listId: string) => {
    onSelectItem({ type: 'list', id: listId, spaceId: space.id });
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteList.mutateAsync({ id: listId, spaceId: space.id });
      if (selection.id === listId) onSelectItem({ type: 'space', id: space.id, spaceId: space.id });
      toast.success('List deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleMoveList = async (listId: string, targetFolderId: string | null) => {
    try {
      await updateList.mutateAsync({ id: listId, folder_id: targetFolderId });
      toast.success('List moved');
    } catch {
      toast.error('Failed to move list');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder.mutateAsync({ id: folderId, spaceId: space.id });
      if (selection.id === folderId) onSelectItem({ type: 'space', id: space.id, spaceId: space.id });
      toast.success('Folder deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamingId || !renameValue.trim()) { onCancelRename(); return; }
    try {
      if (renamingType === 'space') {
        await updateSpace.mutateAsync({ id: renamingId, name: renameValue.trim() });
      } else if (renamingType === 'folder') {
        await updateFolder.mutateAsync({ id: renamingId, name: renameValue.trim() });
      } else if (renamingType === 'list') {
        await updateList.mutateAsync({ id: renamingId, name: renameValue.trim() });
      }
      onCancelRename();
      toast.success('Renamed');
    } catch {
      toast.error('Failed to rename');
    }
  };

  const isRenaming = renamingId === space.id && renamingType === 'space';

  return (
    <div>
      {/* Space row */}
      <div
        className={cn(
          'group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors min-w-0 overflow-hidden',
          isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
        )}
      >
        <button onClick={onToggle} className="p-0.5 shrink-0">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <SpaceIconPicker
          value={space.icon || '🚀'}
          onChange={(icon) => onIconChange(space.id, icon)}
          size="sm"
        />

        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={handleRenameSubmit}
            className="h-6 text-sm flex-1 px-1 text-foreground"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1 font-medium" onClick={onSelect}>{space.name}</span>
        )}

        {/* + menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleAddList()}>
              <ListPlus className="h-3.5 w-3.5 mr-2" /> Task List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreateFolder(space.id)}>
              <FolderPlus className="h-3.5 w-3.5 mr-2" /> Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ... menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onStartRename('space', space.id, space.name)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare('space', space.id, space.name)}>
              <Share2 className="h-3.5 w-3.5 mr-2" /> Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(space.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {isExpanded && (
        <div className="ml-3">
          {/* Direct task lists */}
          {directLists.map(list => (
            <ListItem
              key={list.id}
              list={list}
              isSelected={selection.type === 'list' && selection.id === list.id}
              onSelect={() => onSelectItem({ type: 'list', id: list.id, spaceId: space.id })}
              onDelete={() => handleDeleteList(list.id)}
              onShare={() => onShare('list', list.id, list.name)}
              onRename={() => onStartRename('list', list.id, list.name)}
              onMove={(targetFolderId) => handleMoveList(list.id, targetFolderId)}
              folders={folders}
              currentFolderId={null}
              isRenaming={renamingId === list.id && renamingType === 'list'}
              renameValue={renameValue}
              onRenameValueChange={onRenameValueChange}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={onCancelRename}
              depth={1}
            />
          ))}

          {/* Folders */}
          {folders.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              spaceId={space.id}
              lists={allLists.filter(l => l.folder_id === folder.id)}
              allFolders={folders}
              isExpanded={expandedFolders.has(folder.id)}
              onToggle={() => onToggleFolder(folder.id)}
              selection={selection}
              onSelectItem={onSelectItem}
              onAddList={() => handleAddList(folder.id)}
              onDeleteList={handleDeleteList}
              onDeleteFolder={() => handleDeleteFolder(folder.id)}
              onMoveList={(listId, targetFolderId) => handleMoveList(listId, targetFolderId)}
              onShare={onShare}
              onStartRename={onStartRename}
              renamingId={renamingId}
              renamingType={renamingType}
              renameValue={renameValue}
              onRenameValueChange={onRenameValueChange}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={onCancelRename}
            />
          ))}

          {directLists.length === 0 && folders.length === 0 && (
            <p className="pl-6 py-1.5 text-xs text-muted-foreground">Empty space</p>
          )}
        </div>
      )}

      <CreateListDialog
        open={createListDialogOpen}
        onOpenChange={setCreateListDialogOpen}
        spaceId={space.id}
        folderId={createListFolderId}
        onCreated={handleListCreated}
      />
    </div>
  );
};

// ─── Folder Node ───

interface FolderNodeProps {
  folder: TaskFolderRow;
  spaceId: string;
  lists: TaskListRow[];
  allFolders: TaskFolderRow[];
  isExpanded: boolean;
  onToggle: () => void;
  selection: SidebarSelection;
  onSelectItem: (sel: SidebarSelection) => void;
  onAddList: () => void;
  onDeleteList: (id: string) => void;
  onDeleteFolder: () => void;
  onMoveList: (listId: string, targetFolderId: string | null) => void;
  onShare: (type: 'space' | 'folder' | 'list', id: string, name: string) => void;
  onStartRename: (type: 'space' | 'folder' | 'list', id: string, name: string) => void;
  renamingId: string | null;
  renamingType: 'space' | 'folder' | 'list' | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
}

const FolderNode = ({
  folder, spaceId, lists, allFolders, isExpanded, onToggle,
  selection, onSelectItem, onAddList, onDeleteList, onDeleteFolder, onMoveList, onShare,
  onStartRename, renamingId, renamingType, renameValue, onRenameValueChange, onRenameSubmit, onRenameCancel,
}: FolderNodeProps) => {
  const isFolderSelected = selection.type === 'folder' && selection.id === folder.id;
  const isFolderRenaming = renamingId === folder.id && renamingType === 'folder';

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 pl-4 pr-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
          isFolderSelected ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        )}
      >
        <button onClick={onToggle} className="p-0.5 shrink-0">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        {isFolderRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit();
              if (e.key === 'Escape') onRenameCancel();
            }}
            onBlur={onRenameSubmit}
             className="h-6 text-sm flex-1 px-1 text-foreground"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1" onClick={() => onSelectItem({ type: 'folder', id: folder.id, spaceId })}>
            {folder.name}
          </span>
        )}
        <button
          className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={(e) => { e.stopPropagation(); onAddList(); }}
        >
          <Plus className="h-3 w-3" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onStartRename('folder', folder.id, folder.name)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onShare('folder', folder.id, folder.name)}>
              <Share2 className="h-3.5 w-3.5 mr-2" /> Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDeleteFolder} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isExpanded && (
        <div className="ml-3">
          {lists.map(list => (
            <ListItem
              key={list.id}
              list={list}
              isSelected={selection.type === 'list' && selection.id === list.id}
              onSelect={() => onSelectItem({ type: 'list', id: list.id, spaceId })}
              onDelete={() => onDeleteList(list.id)}
              onShare={() => onShare('list', list.id, list.name)}
              onRename={() => onStartRename('list', list.id, list.name)}
              onMove={(targetFolderId) => onMoveList(list.id, targetFolderId)}
              folders={allFolders}
              currentFolderId={folder.id}
              isRenaming={renamingId === list.id && renamingType === 'list'}
              renameValue={renameValue}
              onRenameValueChange={onRenameValueChange}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
              depth={2}
            />
          ))}
          {lists.length === 0 && (
            <p className="pl-8 py-1 text-xs text-muted-foreground">No lists</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── List Item ───

interface ListItemProps {
  list: TaskListRow;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onShare: () => void;
  onRename: () => void;
  onMove: (targetFolderId: string | null) => void;
  folders: TaskFolderRow[];
  currentFolderId: string | null;
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  depth: number;
}

const ListItem = ({ list, isSelected, onSelect, onDelete, onShare, onRename, onMove, folders, currentFolderId, isRenaming, renameValue, onRenameValueChange, onRenameSubmit, onRenameCancel, depth }: ListItemProps) => (
  <div
    className={cn(
      'group flex items-center gap-1.5 pr-2 py-1 rounded-md cursor-pointer text-sm transition-colors',
      isSelected ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
      depth === 1 ? 'pl-5' : 'pl-8'
    )}
    onClick={isRenaming ? undefined : onSelect}
  >
    <List className="h-3.5 w-3.5 shrink-0" />
    {isRenaming ? (
      <Input
        value={renameValue}
        onChange={(e) => onRenameValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onRenameSubmit();
          if (e.key === 'Escape') onRenameCancel();
        }}
        onBlur={onRenameSubmit}
        className="h-6 text-sm flex-1 px-1 text-foreground"
        autoFocus
        onClick={(e) => e.stopPropagation()}
      />
    ) : (
      <span className="truncate flex-1">{list.name}</span>
    )}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(); }}>
          <Share2 className="h-3.5 w-3.5 mr-2" /> Share
        </DropdownMenuItem>
        {folders.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              {currentFolderId && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(null); }}>
                  📂 Space level (no folder)
                </DropdownMenuItem>
              )}
              {folders.filter(f => f.id !== currentFolderId).map(f => (
                <DropdownMenuItem key={f.id} onClick={(e) => { e.stopPropagation(); onMove(f.id); }}>
                  {f.icon || '📁'} {f.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
