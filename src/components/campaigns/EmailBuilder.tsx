/**
 * Email Builder — 3-panel drag-and-drop editor
 */

import { useState, useCallback } from 'react';
import {
  DndContext, DragOverlay, closestCenter,
  useSensor, useSensors, PointerSensor,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, Monitor, Smartphone } from 'lucide-react';
import { BlockLibrary } from './BlockLibrary';
import { BlockRenderer } from './BlockRenderer';
import { BlockPropertiesPanel } from './BlockPropertiesPanel';
import { cn } from '@/lib/utils';
import { createDefaultBlock } from '@/types/campaigns';
import type { EmailBlock, EmailBuilderState, EmailBlockType } from '@/types/campaigns';
import { v4 as uuidv4 } from 'uuid';

// ─── Sortable Block Wrapper ────────────────────────────────────────────────────

interface SortableBlockProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const SortableBlock = ({ block, isSelected, onSelect, onDelete }: SortableBlockProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={cn(
        'relative group border-2 rounded transition-all cursor-pointer',
        isSelected ? 'border-primary' : 'border-transparent hover:border-border',
      )}
      onClick={onSelect}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 opacity-0 group-hover:opacity-100 cursor-grab p-1"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {/* Delete button */}
      <button
        className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 p-1 rounded bg-destructive text-destructive-foreground shadow"
        onClick={e => { e.stopPropagation(); onDelete(); }}
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <BlockRenderer block={block} />
    </div>
  );
};

// ─── Drop Zone ─────────────────────────────────────────────────────────────────

import { useDroppable } from '@dnd-kit/core';

const CanvasDropZone = ({ children, isEmpty }: { children: React.ReactNode; isEmpty: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas-drop-zone' });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[400px] rounded-lg transition-colors',
        isOver && 'ring-2 ring-primary ring-inset bg-primary/5',
        isEmpty && 'flex items-center justify-center border-2 border-dashed border-border'
      )}
    >
      {isEmpty ? (
        <div className="text-center p-12">
          <div className="p-4 rounded-full bg-muted inline-flex mb-3">
            <Monitor className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Drop blocks here</p>
          <p className="text-xs text-muted-foreground mt-1">Drag from the left panel to build your email</p>
        </div>
      ) : children}
    </div>
  );
};

// ─── Main EmailBuilder ─────────────────────────────────────────────────────────

interface Props {
  state: EmailBuilderState;
  onChange: (state: EmailBuilderState) => void;
}

export const EmailBuilder = ({ state, onChange }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeBlock, setActiveBlock] = useState<EmailBlock | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const selectedBlock = state.blocks.find(b => b.id === selectedId) ?? null;

  const updateBlock = useCallback((updated: EmailBlock) => {
    onChange({
      ...state,
      blocks: state.blocks.map(b => b.id === updated.id ? updated : b),
    });
  }, [state, onChange]);

  const deleteBlock = useCallback((id: string) => {
    if (selectedId === id) setSelectedId(null);
    onChange({ ...state, blocks: state.blocks.filter(b => b.id !== id) });
  }, [state, onChange, selectedId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.fromLibrary) return;
    const block = state.blocks.find(b => b.id === active.id);
    if (block) setActiveBlock(block);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBlock(null);

    if (!over) return;

    // Dropped from library onto canvas
    if (active.data.current?.fromLibrary) {
      const type = active.data.current.type as EmailBlockType;
      const newBlock = createDefaultBlock(type, uuidv4());
      onChange({ ...state, blocks: [...state.blocks, newBlock] });
      setSelectedId(newBlock.id);
      return;
    }

    // Reorder existing blocks
    if (active.id !== over.id) {
      const oldIndex = state.blocks.findIndex(b => b.id === active.id);
      const newIndex = state.blocks.findIndex(b => b.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange({ ...state, blocks: arrayMove(state.blocks, oldIndex, newIndex) });
      }
    }
  };

  const canvasWidth = viewMode === 'desktop' ? state.globalStyles.maxWidth : 375;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full overflow-hidden bg-muted/30">
        {/* Left panel: Block library */}
        <div className="w-[220px] shrink-0 border-r border-border bg-background overflow-hidden">
          <BlockLibrary />
        </div>

        {/* Center canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Viewport toggle */}
          <div className="flex items-center justify-center gap-1 py-2 border-b border-border bg-background">
            <Button
              size="sm" variant={viewMode === 'desktop' ? 'default' : 'ghost'}
              className="h-7 gap-1.5 text-xs"
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </Button>
            <Button
              size="sm" variant={viewMode === 'mobile' ? 'default' : 'ghost'}
              className="h-7 gap-1.5 text-xs"
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </Button>
          </div>

          {/* Scrollable canvas area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className="mx-auto transition-all duration-300 bg-background shadow-sm rounded-lg overflow-hidden"
              style={{ width: canvasWidth, maxWidth: '100%' }}
            >
              <SortableContext items={state.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                <CanvasDropZone isEmpty={state.blocks.length === 0}>
                  <div className="divide-y divide-transparent">
                    {state.blocks.map(block => (
                      <SortableBlock
                        key={block.id}
                        block={block}
                        isSelected={selectedId === block.id}
                        onSelect={() => setSelectedId(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                      />
                    ))}
                  </div>
                </CanvasDropZone>
              </SortableContext>
            </div>
          </div>
        </div>

        {/* Right panel: Properties */}
        <div className="w-[260px] shrink-0 border-l border-border bg-background overflow-hidden">
          {selectedBlock ? (
            <BlockPropertiesPanel block={selectedBlock} onChange={updateBlock} />
          ) : (
            <BlockPropertiesPanel block={null as any} onChange={updateBlock} />
          )}
        </div>
      </div>

      <DragOverlay>
        {activeBlock && (
          <div className="opacity-80 shadow-xl rounded border-2 border-primary bg-background" style={{ width: canvasWidth }}>
            <BlockRenderer block={activeBlock} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
