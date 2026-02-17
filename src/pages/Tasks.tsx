import { useState, useMemo } from 'react';
import { Search, Plus, Settings, LayoutList, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTasks, useTaskStatuses, useTaskCategories } from '@/services/useTasks';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskBoardView } from '../components/tasks/TaskBoardView';
import { TaskInnerSidebar } from '../components/tasks/TaskInnerSidebar';
import { ManageDialog } from '../components/tasks/ManageDialog';
import { TaskDetailPage } from '../components/tasks/TaskDetailPage';
import { TaskFilterPopover } from '../components/tasks/TaskFilterPopover';
import { TaskColumnCustomizer, getDefaultColumns } from '../components/tasks/TaskColumnCustomizer';
import { useTaskSpaces } from '@/services/useTasks';
import type { TaskSpaceRow, TaskFilters } from '@/types/task';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board';

const Tasks = () => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<TaskFilters>({});
  const [columns, setColumns] = useState(getDefaultColumns());

  const { data: spaces = [] } = useTaskSpaces();

  const activeSpaceId = selectedSpaceId || spaces[0]?.id || null;
  const activeSpace = spaces.find(s => s.id === activeSpaceId);

  const breadcrumb = useMemo(() => {
    if (!activeSpace) return [];
    const trail: TaskSpaceRow[] = [];
    let current: TaskSpaceRow | undefined = activeSpace;
    while (current) {
      trail.unshift(current);
      current = spaces.find(s => s.id === current?.parent_id);
    }
    return trail;
  }, [activeSpace, spaces]);

  // Combine search with filters
  const combinedFilters: TaskFilters = useMemo(() => ({
    ...filters,
    ...(search ? { search } : {}),
  }), [filters, search]);

  const hasActiveFilters = Object.values(combinedFilters).some(v =>
    Array.isArray(v) ? v.length > 0 : !!v
  );

  const { data: statuses = [] } = useTaskStatuses(activeSpaceId || undefined);
  const { data: categories = [] } = useTaskCategories(activeSpaceId || undefined);
  const { data: tasks = [] } = useTasks(activeSpaceId || undefined, hasActiveFilters ? combinedFilters : undefined);

  const handleSelectSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setSelectedTaskId(null);
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleTaskNav = (direction: 'prev' | 'next') => {
    if (!selectedTaskId) return;
    const idx = tasks.findIndex(t => t.id === selectedTaskId);
    if (idx < 0) return;
    const newIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < tasks.length) {
      setSelectedTaskId(tasks[newIdx].id);
    }
  };

  if (selectedTaskId) {
    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <TaskInnerSidebar selectedSpaceId={activeSpaceId} onSelectSpace={handleSelectSpace} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TaskDetailPage
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            onPrev={tasks.findIndex(t => t.id === selectedTaskId) > 0 ? () => handleTaskNav('prev') : undefined}
            onNext={tasks.findIndex(t => t.id === selectedTaskId) < tasks.length - 1 ? () => handleTaskNav('next') : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <TaskInnerSidebar selectedSpaceId={activeSpaceId} onSelectSpace={handleSelectSpace} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeSpaceId && activeSpace ? (
          <>
            {/* Breadcrumb + title */}
            <div className="px-6 pt-4 pb-2">
              {breadcrumb.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  {breadcrumb.map((s, i) => (
                    <span key={s.id} className="flex items-center gap-1">
                      {i > 0 && <span>/</span>}
                      <button
                        className="hover:text-foreground transition-colors"
                        onClick={() => handleSelectSpace(s.id)}
                      >
                        {s.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-xl font-semibold">{activeSpace.name}</h1>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-2 flex items-center gap-2 border-b">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="h-8 text-sm pl-8"
                />
              </div>

              <TaskFilterPopover
                statuses={statuses}
                categories={categories}
                filters={filters}
                onFiltersChange={setFilters}
              />

              {viewMode === 'list' && (
                <TaskColumnCustomizer columns={columns} onColumnsChange={setColumns} />
              )}

              {/* View toggle */}
              <div className="flex items-center border rounded-md overflow-hidden">
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors',
                    viewMode === 'list'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  onClick={() => setViewMode('list')}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  List
                </button>
                <button
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors',
                    viewMode === 'board'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  onClick={() => setViewMode('board')}
                >
                  <Columns3 className="h-3.5 w-3.5" />
                  Board
                </button>
              </div>

              <div className="flex-1" />
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowManage(true)}>
                <Settings className="h-3.5 w-3.5" />
                Manage
              </Button>
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            </div>

            {/* Task content */}
            <div className="flex-1 overflow-auto p-6">
              {viewMode === 'list' ? (
                <TaskListView
                  statuses={statuses}
                  tasks={tasks}
                  categories={categories}
                  spaceId={activeSpaceId}
                  onTaskClick={handleTaskClick}
                  columns={columns}
                />
              ) : (
                <TaskBoardView
                  statuses={statuses}
                  tasks={tasks}
                  categories={categories}
                  spaceId={activeSpaceId}
                  onTaskClick={handleTaskClick}
                />
              )}
            </div>

            <ManageDialog open={showManage} onOpenChange={setShowManage} spaceId={activeSpaceId} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <LayoutList className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h2 className="text-lg font-medium">Welcome to Tasks</h2>
              <p className="text-sm">Create a space to start organizing your tasks.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
