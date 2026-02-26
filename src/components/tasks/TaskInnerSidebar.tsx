import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Plus, CheckSquare, MoreHorizontal, Trash2, FolderOpen, List, Pencil, Share2, FolderPlus, ListPlus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTaskSpaces, useDeleteTaskSpace, useUpdateTaskSpace, useTaskFolders, useDeleteTaskFolder, useTaskLists, useCreateTaskList, useDeleteTaskList } from '@/services/useTasks';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { TaskSharingDialog } from './TaskSharingDialog';
import { EmojiPicker } from './EmojiPicker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import type { SidebarSelection, TaskSpaceRow, TaskFolderRow, TaskListRow } from '@/types/task';
import { toast } from 'sonner';

interface TaskInnerSidebarProps {
  selection: SidebarSelection;
  onSelect: (sel: SidebarSelection) => void;
}

export const TaskInnerSidebar = ({ selection, onSelect }: TaskInnerSidebarProps) => {
  const { data: spaces = [] } = useTaskSpaces();
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [createFolderSpaceId, setCreateFolderSpaceId] = useState<string | null>(null);
  const [sharingTarget, setSharingTarget] = useState<{ type: 'space' | 'folder' | 'list'; id: string; name: string } | null>(null);
  const [renamingSpaceId, setRenamingSpaceId] = useState<string | null>(null);
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

  const handleRenameSpace = async (id: string) => {
    if (!renameValue.trim()) { setRenamingSpaceId(null); return; }
    try {
      await updateSpace.mutateAsync({ id, name: renameValue.trim() });
      setRenamingSpaceId(null);
      toast.success('Renamed');
    } catch {
      toast.error('Failed to rename');
    }
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
      <div className="px-3 pt-4 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workspace</p>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
            isSelected('all', null)
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => onSelect({ type: 'all', id: null })}
        >
          <CheckSquare className="h-4 w-4" />
          <span>All Tasks</span>
        </div>
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
              onSelect={() => onSelect({ type: 'space', id: space.id })}
              selection={selection}
              onSelectItem={onSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              onRename={(id, name) => { setRenamingSpaceId(id); setRenameValue(name); }}
              renamingSpaceId={renamingSpaceId}
              renameValue={renameValue}
              onRenameValueChange={setRenameValue}
              onRenameSubmit={handleRenameSpace}
              onRenameCancel={() => setRenamingSpaceId(null)}
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
  renamingSpaceId: string | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onRenameCancel: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onShare: (type: 'space' | 'folder' | 'list', id: string, name: string) => void;
  onCreateFolder: (spaceId: string) => void;
  onIconChange: (spaceId: string, emoji: string) => void;
}

const SpaceNode = ({
  space, isExpanded, onToggle, isSelected, onSelect,
  selection, onSelectItem, expandedFolders, onToggleFolder,
  renamingSpaceId, renameValue, onRenameValueChange, onRenameSubmit, onRenameCancel,
  onRename, onDelete, onShare, onCreateFolder, onIconChange,
}: SpaceNodeProps) => {
  const { data: folders = [] } = useTaskFolders(space.id);
  const { data: allLists = [] } = useTaskLists(space.id);
  const createList = useCreateTaskList();
  const deleteList = useDeleteTaskList();
  const deleteFolder = useDeleteTaskFolder();

  const directLists = allLists.filter(l => !l.folder_id);

  const handleAddList = async (folderId?: string) => {
    try {
      const newList = await createList.mutateAsync({
        space_id: space.id,
        name: 'New List',
        sort_order: allLists.length,
        ...(folderId ? { folder_id: folderId } : {}),
      });
      onSelectItem({ type: 'list', id: newList.id });
      toast.success('List created');
    } catch {
      toast.error('Failed to create list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    try {
      await deleteList.mutateAsync({ id: listId, spaceId: space.id });
      if (selection.id === listId) onSelectItem({ type: 'space', id: space.id });
      toast.success('List deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder.mutateAsync({ id: folderId, spaceId: space.id });
      if (selection.id === folderId) onSelectItem({ type: 'space', id: space.id });
      toast.success('Folder deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const isRenaming = renamingSpaceId === space.id;

  return (
    <div>
      {/* Space row */}
      <div
        className={cn(
          'group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
          isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'
        )}
      >
        <button onClick={onToggle} className="p-0.5 shrink-0">
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <EmojiPicker
          value={space.icon || '🚀'}
          onChange={(emoji) => onIconChange(space.id, emoji)}
          size="sm"
        />

        {isRenaming ? (
          <Input
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameSubmit(space.id);
              if (e.key === 'Escape') onRenameCancel();
            }}
            onBlur={() => onRenameSubmit(space.id)}
            className="h-6 text-sm flex-1 px-1"
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
            <DropdownMenuItem onClick={() => onRename(space.id, space.name)}>
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
              onSelect={() => onSelectItem({ type: 'list', id: list.id })}
              onDelete={() => handleDeleteList(list.id)}
              onShare={() => onShare('list', list.id, list.name)}
              depth={1}
            />
          ))}

          {/* Folders */}
          {folders.map(folder => (
            <FolderNode
              key={folder.id}
              folder={folder}
              lists={allLists.filter(l => l.folder_id === folder.id)}
              isExpanded={expandedFolders.has(folder.id)}
              onToggle={() => onToggleFolder(folder.id)}
              selection={selection}
              onSelectItem={onSelectItem}
              onAddList={() => handleAddList(folder.id)}
              onDeleteList={handleDeleteList}
              onDeleteFolder={() => handleDeleteFolder(folder.id)}
              onShare={onShare}
            />
          ))}

          {directLists.length === 0 && folders.length === 0 && (
            <p className="pl-6 py-1.5 text-xs text-muted-foreground">Empty space</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Folder Node ───

interface FolderNodeProps {
  folder: TaskFolderRow;
  lists: TaskListRow[];
  isExpanded: boolean;
  onToggle: () => void;
  selection: SidebarSelection;
  onSelectItem: (sel: SidebarSelection) => void;
  onAddList: () => void;
  onDeleteList: (id: string) => void;
  onDeleteFolder: () => void;
  onShare: (type: 'space' | 'folder' | 'list', id: string, name: string) => void;
}

const FolderNode = ({
  folder, lists, isExpanded, onToggle,
  selection, onSelectItem, onAddList, onDeleteList, onDeleteFolder, onShare,
}: FolderNodeProps) => {
  const isFolderSelected = selection.type === 'folder' && selection.id === folder.id;

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
        <span className="truncate flex-1" onClick={() => onSelectItem({ type: 'folder', id: folder.id })}>
          {folder.name}
        </span>
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
              onSelect={() => onSelectItem({ type: 'list', id: list.id })}
              onDelete={() => onDeleteList(list.id)}
              onShare={() => onShare('list', list.id, list.name)}
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
  depth: number;
}

const ListItem = ({ list, isSelected, onSelect, onDelete, onShare, depth }: ListItemProps) => (
  <div
    className={cn(
      'group flex items-center gap-1.5 pr-2 py-1 rounded-md cursor-pointer text-sm transition-colors',
      isSelected ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted text-muted-foreground hover:text-foreground',
      depth === 1 ? 'pl-5' : 'pl-8'
    )}
    onClick={onSelect}
  >
    <List className="h-3.5 w-3.5 shrink-0" />
    <span className="truncate flex-1">{list.name}</span>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={onShare}>
          <Share2 className="h-3.5 w-3.5 mr-2" /> Share
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
