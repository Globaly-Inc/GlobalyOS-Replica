import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useTaskLists, useTaskFolders } from '@/services/useTasks';
import { List, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface FolderSummaryViewProps {
  folderId: string;
  spaceId: string;
  onSelectList: (listId: string) => void;
}

const useListTaskCounts = (listIds: string[]) => {
  return useQuery({
    queryKey: ['list-task-counts', listIds],
    queryFn: async () => {
      if (!listIds.length) return {};
      const counts: Record<string, { total: number; completed: number }> = {};
      for (const listId of listIds) {
        const { count: total } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', listId)
          .eq('is_archived', false);

        const { count: completed } = await supabase
          .from('tasks')
          .select('*, status:task_statuses!inner(*)', { count: 'exact', head: true })
          .eq('list_id', listId)
          .eq('is_archived', false)
          .eq('task_statuses.group', 'completed');

        counts[listId] = { total: total || 0, completed: completed || 0 };
      }
      return counts;
    },
    enabled: listIds.length > 0,
  });
};

export const FolderSummaryView = ({ folderId, spaceId, onSelectList }: FolderSummaryViewProps) => {
  const { data: allLists = [] } = useTaskLists(spaceId);
  const { data: folders = [] } = useTaskFolders(spaceId);

  const folder = folders.find(f => f.id === folderId);
  const folderLists = allLists.filter(l => l.folder_id === folderId);
  const { data: counts = {} } = useListTaskCounts(folderLists.map(l => l.id));

  if (!folder) return null;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{folder.icon || '📁'}</span>
          <h2 className="text-lg font-semibold">{folder.name}</h2>
          <span className="text-sm text-muted-foreground ml-2">{folderLists.length} list{folderLists.length !== 1 ? 's' : ''}</span>
        </div>

        {folderLists.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No task lists in this folder yet. Add one from the sidebar.
          </p>
        ) : (
          <div className="space-y-3">
            {folderLists.map(list => {
              const c = counts[list.id] || { total: 0, completed: 0 };
              const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
              return (
                <Card
                  key={list.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectList(list.id)}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <List className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{list.name}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {c.completed}/{c.total} tasks
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
