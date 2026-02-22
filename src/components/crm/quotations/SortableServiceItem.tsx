/**
 * SortableServiceItem - Drag-and-drop wrapper for service rows
 */
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';

interface SortableServiceItemProps {
  id: string;
  children: ReactNode;
}

export const SortableServiceItem = ({ id, children }: SortableServiceItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-drag-listeners={JSON.stringify(listeners)}>
      {children}
    </div>
  );
};

export const useDragHandleProps = (id: string) => {
  const { listeners } = useSortable({ id });
  return listeners;
};
