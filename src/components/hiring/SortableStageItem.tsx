import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface SortableStageItemProps {
  id: string;
  children: React.ReactNode;
}

export function SortableStageItem({ id, children }: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 group',
        isDragging && 'opacity-50 z-50 bg-background shadow-lg rounded-md',
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex items-center"
      >
        {/* GripVertical icon is rendered by the parent */}
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
