import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Plus, CheckSquare, MoreHorizontal, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTaskSpaces, buildSpaceTree, useDeleteTaskSpace } from '@/services/useTasks';
import { CreateSpaceDialog } from './CreateSpaceDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { TaskSpaceTreeNode } from '@/types/task';
import { toast } from 'sonner';

const TIER_CONFIG = [
  { label: 'Project', childLabel: 'Sub-project', color: 'text-green-600', bg: 'bg-green-500/10', selectedBg: 'bg-green-500/20', dot: 'bg-green-500', icon: '📂' },
  { label: 'Sub-project', childLabel: 'Task', color: 'text-pink-600', bg: 'bg-pink-500/10', selectedBg: 'bg-pink-500/20', dot: 'bg-pink-500', icon: '📁' },
  { label: 'Task', childLabel: 'Subtask', color: 'text-blue-600', bg: 'bg-blue-500/10', selectedBg: 'bg-blue-500/20', dot: 'bg-blue-500', icon: '📋' },
  { label: 'Subtask', childLabel: '', color: 'text-yellow-600', bg: 'bg-yellow-500/10', selectedBg: 'bg-yellow-500/20', dot: 'bg-yellow-500', icon: '📌' },
];

const getTier = (depth: number) => TIER_CONFIG[Math.min(depth, 3)];

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
  const [createDepth, setCreateDepth] = useState(0);
  const deleteSpace = useDeleteTaskSpace();
  const navigate = useNavigate();

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddChild = (parentId: string, parentDepth: number) => {
    setCreateParentId(parentId);
    setCreateDepth(parentDepth + 1);
    setShowCreateDialog(true);
  };

  const handleDeleteSpace = async (id: string) => {
    try {
      await deleteSpace.mutateAsync(id);
      toast.success('Deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const renderNode = (node: TaskSpaceTreeNode, depth = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedSpaceId === node.id;
    const hasChildren = node.children.length > 0;
    const tier = getTier(depth);
    const canAddChild = depth < 3;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
            isSelected ? `${tier.selectedBg} ${tier.color} font-medium` : `hover:${tier.bg} ${tier.color}`
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}>

          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
            className="p-0.5 shrink-0">
            {hasChildren ?
              isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" /> :
              <span className="w-3.5" />
            }
          </button>
          <span className={cn('h-2 w-2 rounded-full shrink-0', tier.dot)} />
          <span className="text-base shrink-0">{node.icon || tier.icon}</span>
          <span
            className="truncate flex-1"
            onClick={() => onSelectSpace(node.id)}>
            {node.name}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {canAddChild && (
                <DropdownMenuItem onClick={() => handleAddChild(node.id, depth)}>
                  <Plus className="h-3.5 w-3.5 mr-2" /> Add {tier.childLabel}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => handleDeleteSpace(node.id)}
                className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {isExpanded && hasChildren &&
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        }
      </div>
    );
  };

  return (
    <div className="w-60 border-r bg-muted/30 flex flex-col h-full shrink-0">
      <div className="px-3 pt-4 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Workspace</p>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors',
            !selectedSpaceId ?
              'bg-primary/10 text-primary font-medium' :
              'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          onClick={() => { }}>
          <CheckSquare className="h-4 w-4" />
          <span>All Tasks</span>
        </div>
      </div>

      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => { setCreateParentId(null); setCreateDepth(0); setShowCreateDialog(true); }}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-1">
        <div className="py-1">
          {tree.map((node) => renderNode(node))}
          {tree.length === 0 &&
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">
              No projects yet. Create one to get started.
            </p>
          }
        </div>
      </ScrollArea>

      <CreateSpaceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        parentId={createParentId}
        depth={createDepth} />
    </div>
  );
};
