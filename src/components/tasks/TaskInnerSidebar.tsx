import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus, FolderOpen, CheckSquare, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTaskSpaces, buildSpaceTree, useDeleteTaskSpace } from '@/services/useTasks';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TaskSpaceTreeNode } from '@/types/task';
import { toast } from 'sonner';

interface TaskInnerSidebarProps {
  selectedSpaceId: string | null;
  onSelectSpace: (spaceId: string) => void;
}

export const TaskInnerSidebar = ({ selectedSpaceId, onSelectSpace }: TaskInnerSidebarProps) => {
  const { data: spaces = [] } = useTaskSpaces();
  const tree = useMemo(() => buildSpaceTree(spaces), [spaces]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);
  const deleteSpace = useDeleteTaskSpace();
  const navigate = useNavigate();

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSubspace = (parentId: string) => {
    setCreateParentId(parentId);
    setShowCreateDialog(true);
  };

  const handleDeleteSpace = async (id: string) => {
    try {
      await deleteSpace.mutateAsync(id);
      toast.success('Space deleted');
    } catch {
      toast.error('Failed to delete space');
    }
  };

  const renderNode = (node: TaskSpaceTreeNode, depth = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedSpaceId === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
            isSelected
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            className="p-0.5 shrink-0"
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <span className="w-3.5" />
            )}
          </button>
          <span className="text-base shrink-0">{node.icon || '📁'}</span>
          <span
            className="truncate flex-1"
            onClick={() => onSelectSpace(node.id)}
          >
            {node.name}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => handleAddSubspace(node.id)}>
                <Plus className="h-3.5 w-3.5 mr-2" /> Add Sub-space
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteSpace(node.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="w-60 border-r bg-muted/30 flex flex-col h-full shrink-0">
      {/* Workspace section */}
      <div className="px-3 pt-4 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workspace</p>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
            !selectedSpaceId
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => { /* My Tasks - reset space selection */ }}
        >
          <CheckSquare className="h-4 w-4" />
          <span>My Tasks</span>
        </div>
      </div>

      {/* Spaces section */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spaces</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => { setCreateParentId(null); setShowCreateDialog(true); }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-1">
        <div className="py-1">
          {tree.map(node => renderNode(node))}
          {tree.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              No spaces yet. Create one to get started.
            </p>
          )}
        </div>
      </ScrollArea>

      <CreateSpaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        parentId={createParentId}
      />
    </div>
  );
};
