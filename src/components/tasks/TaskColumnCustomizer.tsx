import { Settings2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Name', visible: true },
  { key: 'category', label: 'Category', visible: false },
  { key: 'assignee', label: 'Assignee', visible: true },
  { key: 'tags', label: 'Tags', visible: true },
  { key: 'comments', label: 'Comments', visible: true },
  { key: 'attachments', label: 'Attachments', visible: true },
  { key: 'priority', label: 'Priority', visible: true },
  { key: 'due_date', label: 'Due Date', visible: false },
];

interface SortableColumnItemProps {
  col: ColumnConfig;
  onToggle: (key: string) => void;
}

const SortableColumnItem = ({ col, onToggle }: SortableColumnItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50',
        isDragging && 'opacity-50 z-50 bg-background shadow-lg'
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40" />
      </div>
      <span className="text-sm flex-1">{col.label}</span>
      <Switch
        checked={col.visible}
        onCheckedChange={() => onToggle(col.key)}
        disabled={col.key === 'name'}
        className="scale-75"
      />
    </div>
  );
};

interface TaskColumnCustomizerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export const TaskColumnCustomizer = ({ columns, onColumnsChange }: TaskColumnCustomizerProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const toggleColumn = (key: string) => {
    if (key === 'name') return;
    onColumnsChange(
      columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.key === active.id);
      const newIndex = columns.findIndex(c => c.key === over.id);
      onColumnsChange(arrayMove(columns, oldIndex, newIndex));
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Customize
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="px-3 py-2 border-b">
          <span className="text-sm font-medium">Columns</span>
        </div>
        <div className="p-2 space-y-0.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map(c => c.key)} strategy={verticalListSortingStrategy}>
              {columns.map(col => (
                <SortableColumnItem key={col.key} col={col} onToggle={toggleColumn} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const getDefaultColumns = (): ColumnConfig[] => [...DEFAULT_COLUMNS];
