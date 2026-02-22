import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Circle, CheckCircle2 } from 'lucide-react';
import { useDealTasks, useAddDealTask, useUpdateDealTask } from '@/services/useCRMDeals';

interface Props {
  dealId: string;
}

export function DealTasksTab({ dealId }: Props) {
  const { data: tasks, isLoading } = useDealTasks(dealId);
  const addTask = useAddDealTask();
  const updateTask = useUpdateDealTask();
  const [newTitle, setNewTitle] = useState('');

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    await addTask.mutateAsync({ deal_id: dealId, title: newTitle });
    setNewTitle('');
  };

  const toggleComplete = (task: any) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateTask.mutate({ id: task.id, deal_id: dealId, status: newStatus });
  };

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={!newTitle.trim() || addTask.isPending} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : !tasks?.length ? (
        <p className="text-sm text-muted-foreground text-center py-6">No tasks yet</p>
      ) : (
        <Card className="divide-y">
          {tasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-3 p-3">
              <button onClick={() => toggleComplete(task)} className="shrink-0">
                {task.status === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                  {task.title}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                {task.target_role === 'assignee' ? 'Team' : task.target_role}
              </Badge>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
