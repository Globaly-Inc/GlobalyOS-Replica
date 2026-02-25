import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/services/useTasks';
import type { TaskCategoryRow } from '@/types/task';
import type { ColumnConfig } from './TaskColumnCustomizer';
import { toast } from 'sonner';

interface TaskQuickAddProps {
  spaceId: string;
  statusId: string;
  categories: TaskCategoryRow[];
  onDone: () => void;
  listId?: string | null;
  visibleColumns?: ColumnConfig[];
  gridStyle?: React.CSSProperties;
}

export const TaskQuickAdd = ({ spaceId, statusId, categories, onDone, listId, visibleColumns, gridStyle }: TaskQuickAddProps) => {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      onDone();
      return;
    }
    try {
      await createTask.mutateAsync({
        space_id: spaceId,
        status_id: statusId,
        title: title.trim(),
        ...(listId ? { list_id: listId } : {}),
      });
      setTitle('');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to create task');
    }
  };

  const cols = visibleColumns || [
    { key: 'name', label: 'Name', visible: true },
  ];

  const renderCell = (col: ColumnConfig) => {
    if (col.key === 'name') {
      return (
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onDone();
          }}
          onBlur={() => {
            if (!title.trim()) onDone();
          }}
          placeholder="Task name..."
          className="h-7 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 px-1"
        />
      );
    }
    return <span className="text-xs text-muted-foreground">—</span>;
  };

  if (gridStyle) {
    return (
      <div
        className="grid gap-2 px-3 py-1.5 items-center border-t bg-muted/10"
        style={gridStyle}
      >
        {cols.map(col => (
          <div key={col.key}>{renderCell(col)}</div>
        ))}
      </div>
    );
  }

  // Fallback: simple single-input row
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/10">
      {renderCell({ key: 'name', label: 'Name', visible: true })}
    </div>
  );
};
