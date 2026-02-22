/**
 * SortableOptionItem - Drag-and-drop wrapper for option cards
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

interface SortableOptionItemProps {
  id: string;
  children: (dragHandleProps: Record<string, any>) => ReactNode;
}

export const SortableOptionItem = ({ id, children }: SortableOptionItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners || {})}
    </div>
  );
};
