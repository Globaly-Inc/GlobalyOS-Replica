import { useCallback, useRef, useState } from 'react';
import type { IvrNode, IvrNodeType } from './ivrTypes';
import { NODE_COLORS, NODE_LABELS } from './ivrTypes';
import {
  Volume2, Grid3X3, PhoneForwarded, Voicemail, MessageSquare, PhoneOff, GripVertical, Trash2, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NODE_ICONS: Record<IvrNodeType, React.ComponentType<{ className?: string }>> = {
  greeting: Volume2,
  menu: Grid3X3,
  forward: PhoneForwarded,
  voicemail: Voicemail,
  message: MessageSquare,
  hangup: PhoneOff,
};

interface IvrNodeCardProps {
  node: IvrNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: { x: number; y: number }) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}

export function IvrNodeCard({ node, isSelected, onSelect, onMove, onDelete, onAddChild }: IvrNodeCardProps) {
  const colors = NODE_COLORS[node.type];
  const Icon = NODE_ICONS[node.type];
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
      e.stopPropagation();
      onSelect(node.id);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        nodeX: node.position.x,
        nodeY: node.position.y,
      };

      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        setIsDragging(true);
        const dx = me.clientX - dragRef.current.startX;
        const dy = me.clientY - dragRef.current.startY;
        onMove(node.id, {
          x: dragRef.current.nodeX + dx,
          y: dragRef.current.nodeY + dy,
        });
      };

      const handleUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [node.id, node.position, onSelect, onMove]
  );

  const subtitle = (() => {
    switch (node.type) {
      case 'greeting':
      case 'message':
        return node.greeting_text ? node.greeting_text.slice(0, 40) + (node.greeting_text.length > 40 ? '…' : '') : 'No text set';
      case 'menu':
        return `${node.menu_options?.length || 0} option(s)`;
      case 'forward':
        return node.forward_number || 'No number set';
      case 'voicemail':
        return 'Records voicemail';
      case 'hangup':
        return 'Ends the call';
      default:
        return '';
    }
  })();

  const canHaveChildren = node.type !== 'hangup' && node.type !== 'voicemail';

  return (
    <div
      className={cn(
        'absolute w-[200px] rounded-lg border-2 shadow-sm transition-shadow select-none',
        colors.bg, colors.border,
        isSelected && 'ring-2 ring-primary shadow-md',
        isDragging && 'opacity-80 shadow-lg'
      )}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        transform: 'translate(-50%, 0)',
        zIndex: isSelected ? 20 : 10,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-inherit">
        <GripVertical className="h-3 w-3 text-muted-foreground/50 cursor-grab" />
        <Icon className={cn('h-4 w-4', colors.icon)} />
        <span className="text-xs font-semibold text-foreground truncate flex-1">{node.label}</span>
        {node.id !== 'root' && (
          <button
            data-no-drag
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            className="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground leading-tight">{subtitle}</p>
        {node.type === 'menu' && node.menu_options && node.menu_options.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {node.menu_options.map((opt) => (
              <div key={opt.digit} className="flex items-center gap-1.5 text-[10px]">
                <span className="inline-flex items-center justify-center h-4 w-4 rounded bg-background border text-[9px] font-bold">{opt.digit}</span>
                <span className="text-muted-foreground truncate">{opt.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add child connector */}
      {canHaveChildren && (
        <div className="flex justify-center -mb-3 relative z-10">
          <button
            data-no-drag
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
            className="h-6 w-6 rounded-full bg-background border-2 border-muted-foreground/30 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
