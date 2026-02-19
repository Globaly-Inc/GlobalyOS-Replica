/**
 * Block Library — Left panel of email builder
 * Draggable block palette grouped by category
 */

import { useDraggable } from '@dnd-kit/core';
import {
  Type, Image, MousePointerClick, Minus, Square,
  Columns2, Share2, LayoutTemplate, AlignLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailBlockType } from '@/types/campaigns';

interface BlockDef {
  type: EmailBlockType;
  label: string;
  icon: React.ElementType;
  description: string;
}

const blocks: BlockDef[] = [
  { type: 'header',  label: 'Header',  icon: LayoutTemplate,     description: 'Logo + org name' },
  { type: 'text',    label: 'Text',    icon: Type,               description: 'Rich text content' },
  { type: 'image',   label: 'Image',   icon: Image,              description: 'Photo or graphic' },
  { type: 'button',  label: 'Button',  icon: MousePointerClick,  description: 'Call to action' },
  { type: 'divider', label: 'Divider', icon: Minus,              description: 'Horizontal rule' },
  { type: 'spacer',  label: 'Spacer',  icon: Square,             description: 'Empty space' },
  { type: 'columns', label: 'Columns', icon: Columns2,           description: '2-column layout' },
  { type: 'social',  label: 'Social',  icon: Share2,             description: 'Social media links' },
  { type: 'footer',  label: 'Footer',  icon: AlignLeft,          description: 'Compliance footer ✓' },
];

interface DraggableBlockProps {
  block: BlockDef;
}

const DraggableBlock = ({ block }: DraggableBlockProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${block.type}`,
    data: { type: block.type, fromLibrary: true },
  });

  const Icon = block.icon;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card cursor-grab',
        'hover:bg-accent hover:border-primary/30 transition-colors select-none',
        isDragging && 'opacity-50 cursor-grabbing'
      )}
    >
      <div className="p-1.5 rounded bg-primary/10 shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground leading-none">{block.label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{block.description}</p>
      </div>
    </div>
  );
};

export const BlockLibrary = () => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Blocks</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Drag to add to canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {blocks.map(block => (
          <DraggableBlock key={block.type} block={block} />
        ))}
      </div>
    </div>
  );
};
