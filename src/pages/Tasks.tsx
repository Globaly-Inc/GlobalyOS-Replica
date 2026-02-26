import { useState, useMemo } from 'react';
import { Search, Plus, Settings, LayoutList, Columns3, X, CheckSquare, FolderOpen } from 'lucide-react';
import { ProjectDashboard } from '../components/tasks/ProjectDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useTasks, useTaskStatuses, useTaskCategories, useTaskSpaces, useTaskLists, useTaskFolders, useAllTasks, useAllTaskStatuses, useAllTaskCategories } from '@/services/useTasks';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskBoardView } from '../components/tasks/TaskBoardView';
import { TaskInnerSidebar } from '../components/tasks/TaskInnerSidebar';
import { ManageDialog } from '../components/tasks/ManageDialog';
import { TaskDetailPage } from '../components/tasks/TaskDetailPage';
import { TaskFilterPopover } from '../components/tasks/TaskFilterPopover';
import { TaskColumnCustomizer, getDefaultColumns } from '../components/tasks/TaskColumnCustomizer';
import { AddTaskDialog } from '../components/tasks/AddTaskDialog';
import { FolderSummaryView } from '../components/tasks/FolderSummaryView';
import { useTaskListRealtime } from '@/services/useTaskDetailRealtime';
import type { TaskFilters, SidebarSelection } from '@/types/task';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'board';

const Tasks = () => {
  const [selection, setSelection] = useState<SidebarSelection>({ type: 'all', id: null });
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskDefaultStatusId, setAddTaskDefaultStatusId] = useState<string | null>(null);
  const [addTaskDefaultTitle, setAddTaskDefaultTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<TaskFilters>({});
  const [columns, setColumns] = useState(getDefaultColumns());

  const { data: spaces = [] } = useTaskSpaces();

  const isAllTasksMode = selection.type === 'all';
  const isSpaceView = selection.type === 'space';
  const isListView = selection.type === 'list';
  const isFolderView = selection.type === 'folder';

  // Resolve spaceId from selection (sidebar now passes it)
  const activeSpaceId = useMemo(() => {
    if (selection.spaceId) return selection.spaceId;
    if (selection.type === 'space') return selection.id;
    return null;
  }, [selection]);

  const activeListId = isListView ? selection.id : null;

  useTaskListRealtime(activeSpaceId);

  const activeSpace = activeSpaceId ? spaces.find(s => s.id === activeSpaceId) : null;

  const combinedFilters: TaskFilters = useMemo(() => ({
    ...filters,
    ...(search ? { search } : {}),
    ...(activeListId ? { list_id: activeListId } : {}),
  }), [filters, search, activeListId]);

  const hasActiveFilters = Object.keys(filters).some(k => {
    const v = (filters as any)[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }) || !!search;

  // Space-scoped hooks
  const { data: spaceStatuses = [] } = useTaskStatuses(activeSpaceId || undefined);
  const { data: spaceCategories = [] } = useTaskCategories(activeSpaceId || undefined);
  const { data: spaceTasks = [] } = useTasks(activeSpaceId || undefined, !isAllTasksMode ? combinedFilters : undefined);

  // Org-wide hooks for All Tasks mode
  const { data: allStatuses = [] } = useAllTaskStatuses();
  const { data: allCategories = [] } = useAllTaskCategories();
  const { data: allTasks = [] } = useAllTasks(isAllTasksMode ? combinedFilters : undefined);

  const statuses = isAllTasksMode ? allStatuses : spaceStatuses;
  const categories = isAllTasksMode ? allCategories : spaceCategories;
  const tasks = isAllTasksMode ? allTasks : spaceTasks;

  const handleSelect = (sel: SidebarSelection) => {
    setSelection(sel);
    setSelectedTaskId(null);
    setFilters({});
    setSearch('');
  };

  const handleTaskClick = (taskId: string) => setSelectedTaskId(taskId);

  const handleTaskNav = (direction: 'prev' | 'next') => {
    if (!selectedTaskId) return;
    const idx = tasks.findIndex(t => t.id === selectedTaskId);
    if (idx < 0) return;
    const newIdx = direction === 'prev' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < tasks.length) setSelectedTaskId(tasks[newIdx].id);
  };

  const clearFilters = () => { setFilters({}); setSearch(''); };

  // Determine what to show
  const showTaskContent = isListView || isAllTasksMode;
  const showSpaceDashboard = isSpaceView && activeSpaceId;

  // Title
  const pageTitle = useMemo(() => {
    if (isAllTasksMode) return 'All Tasks';
    if (isSpaceView && activeSpace) return activeSpace.name;
    if (isFolderView) return 'Folder';
    if (isListView) return 'Task List';
    return 'Tasks';
  }, [selection, activeSpace, isAllTasksMode, isSpaceView, isFolderView, isListView]);

  const pageIcon = useMemo(() => {
    if (isAllTasksMode) return <CheckSquare className="h-5 w-5" />;
    if (isSpaceView && activeSpace) return <span>{activeSpace.icon || '🚀'}</span>;
    if (isFolderView) return <FolderOpen className="h-5 w-5" />;
    return null;
  }, [isAllTasksMode, isSpaceView, activeSpace, isFolderView]);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <TaskInnerSidebar selection={selection} onSelect={handleSelect} />

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTaskId} onOpenChange={(open) => { if (!open) setSelectedTaskId(null); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[88vh] p-0 gap-0 overflow-hidden">
          {selectedTaskId && (
            <TaskDetailPage
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
              onPrev={tasks.findIndex(t => t.id === selectedTaskId) > 0 ? () => handleTaskNav('prev') : undefined}
              onNext={tasks.findIndex(t => t.id === selectedTaskId) < tasks.length - 1 ? () => handleTaskNav('next') : undefined}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-4 pb-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              {pageIcon}
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2">
              {showTaskContent && !isAllTasksMode && activeSpaceId && (
                <>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowManage(true)}>
                    <Settings className="h-3.5 w-3.5" />
                    Manage
                  </Button>
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowAddTask(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Task
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Space Dashboard */}
        {showSpaceDashboard && (
          <ProjectDashboard spaceId={activeSpaceId!} spaces={spaces} />
        )}

        {/* Folder Summary View */}
        {isFolderView && selection.id && activeSpaceId && (
          <FolderSummaryView
            folderId={selection.id}
            spaceId={activeSpaceId}
            onSelectList={(listId) => handleSelect({ type: 'list', id: listId, spaceId: activeSpaceId })}
          />
        )}

        {/* Task content (list or all tasks) */}
        {showTaskContent && (
          <>
            {/* Toolbar */}
            <div className="px-6 pt-3 border-b">
              <div className="flex items-center gap-2 py-2">
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

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}

                {viewMode === 'list' && (
                  <TaskColumnCustomizer columns={columns} onColumnsChange={setColumns} />
                )}

                <div className="flex-1" />

                {filters.priority?.map(p => (
                  <Badge key={p} variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilters(f => ({ ...f, priority: f.priority?.filter(x => x !== p) }))}>
                    {p} <X className="h-2.5 w-2.5" />
                  </Badge>
                ))}

                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors',
                      viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    onClick={() => setViewMode('list')}
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    List
                  </button>
                  <button
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1 text-xs transition-colors',
                      viewMode === 'board' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    onClick={() => setViewMode('board')}
                  >
                    <Columns3 className="h-3.5 w-3.5" />
                    Board
                  </button>
                </div>
              </div>
            </div>

            {/* Task content */}
            <div className="flex-1 overflow-auto p-6">
              {viewMode === 'list' ? (
                <TaskListView
                  statuses={statuses}
                  tasks={tasks}
                  categories={categories}
                  spaceId={activeSpaceId || ''}
                  listId={isAllTasksMode ? undefined : activeListId}
                  onTaskClick={handleTaskClick}
                  columns={columns}
                  onAddTaskInStatus={(statusId) => {
                    setAddTaskDefaultStatusId(statusId);
                    setShowAddTask(true);
                  }}
                  isAllTasksMode={isAllTasksMode}
                />
              ) : (
                <TaskBoardView
                  statuses={statuses}
                  tasks={tasks}
                  categories={categories}
                  spaceId={activeSpaceId || ''}
                  onTaskClick={handleTaskClick}
                  onAddTaskInStatus={(statusId) => {
                    setAddTaskDefaultStatusId(statusId);
                    setShowAddTask(true);
                  }}
                  onAddTaskWithTitle={(statusId, title) => {
                    setAddTaskDefaultStatusId(statusId);
                    setAddTaskDefaultTitle(title);
                    setShowAddTask(true);
                  }}
                  isAllTasksMode={isAllTasksMode}
                />
              )}
            </div>

            {!isAllTasksMode && activeSpaceId && (
              <>
                <ManageDialog open={showManage} onOpenChange={setShowManage} spaceId={activeSpaceId} />
                <AddTaskDialog
                  open={showAddTask}
                  onOpenChange={(open) => {
                    setShowAddTask(open);
                    if (!open) {
                      setAddTaskDefaultStatusId(null);
                      setAddTaskDefaultTitle('');
                    }
                  }}
                  spaceId={activeSpaceId}
                  listId={activeListId}
                  defaultStatusId={addTaskDefaultStatusId}
                  defaultTitle={addTaskDefaultTitle}
                />
              </>
            )}
          </>
        )}

        {/* Empty state when nothing selected */}
        {!showTaskContent && !showSpaceDashboard && !isFolderView && (
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
