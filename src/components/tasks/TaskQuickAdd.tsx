import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/services/useTasks';
import type { TaskCategoryRow } from '@/types/task';
import { toast } from 'sonner';

interface TaskQuickAddProps {
  spaceId: string;
  statusId: string;
  categories: TaskCategoryRow[];
  onDone: () => void;
}

export const TaskQuickAdd = ({ spaceId, statusId, categories, onDone }: TaskQuickAddProps) => {
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
      });
      setTitle('');
      inputRef.current?.focus();
    } catch {
      toast.error('Failed to create task');
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/10">
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
        className="h-8 text-sm border-none bg-transparent shadow-none focus-visible:ring-0 px-1"
      />
    </div>
  );
};
