import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CanvasElement } from './CanvasElement';
import type { FormNode } from '@/types/forms';

interface FormCanvasProps {
  nodes: FormNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onRemoveNode: (id: string) => void;
  onDuplicateNode: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  formName: string;
  onFormNameChange: (name: string) => void;
}

export function FormCanvas({
  nodes,
  selectedNodeId,
  onSelectNode,
  onRemoveNode,
  onDuplicateNode,
  onReorder,
  formName,
  onFormNameChange,
}: FormCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-muted/30 p-6"
      onClick={() => onSelectNode(null)}
    >
      <div className="max-w-2xl mx-auto">
        {/* Form title */}
        <input
          type="text"
          value={formName}
          onChange={(e) => onFormNameChange(e.target.value)}
          className="text-2xl font-bold bg-transparent border-none outline-none w-full mb-6 text-foreground placeholder:text-muted-foreground"
          placeholder="Untitled Form"
        />

        {/* Canvas items */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-2 gap-2">
              {nodes.map((node) => {
                const isHalf = !['heading', 'subheading', 'paragraph', 'image', 'section', 'divider'].includes(node.type) && node.properties.columns === 2;
                return (
                  <div key={node.id} className={isHalf ? 'col-span-1' : 'col-span-2'}>
                    <CanvasElement
                      node={node}
                      isSelected={selectedNodeId === node.id}
                      onSelect={() => onSelectNode(node.id)}
                      onRemove={() => onRemoveNode(node.id)}
                      onDuplicate={() => onDuplicateNode(node.id)}
                      isHalfWidth={isHalf}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {nodes.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground text-sm">
              Click elements from the left panel to add them to your form
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
