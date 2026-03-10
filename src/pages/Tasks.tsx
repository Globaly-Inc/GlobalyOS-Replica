import { useState, useMemo } from 'react';
import { Search, Plus, Settings, LayoutList, Columns3, X, User, FolderOpen, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCurrentEmployee } from '@/services/useCurrentEmployee';
import { ProjectDashboard } from '../components/tasks/ProjectDashboard';
import { isImageIcon } from '../components/tasks/SpaceIconPicker';
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
import { TaskColumnCustomizer } from '../components/tasks/TaskColumnCustomizer';
import { usePersistedColumns } from '@/hooks/usePersistedColumns';
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

  const { data: spaces = [] } = useTaskSpaces();
  const { data: currentEmployee } = useCurrentEmployee();

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

  const [columns, setColumns] = usePersistedColumns(activeSpaceId);
  const activeListId = isListView ? selection.id : null;

  useTaskListRealtime(activeSpaceId);

  const activeSpace = activeSpaceId ? spaces.find(s => s.id === activeSpaceId) : null;

  const hasActiveFilters = Object.keys(filters).some(k => {
    const v = (filters as any)[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }) || !!search;

  // Space-scoped hooks
  const { data: spaceStatuses = [] } = useTaskStatuses(activeSpaceId || undefined);
  const { data: spaceCategories = [] } = useTaskCategories(activeSpaceId || undefined);

  // Org-wide hooks for My Tasks mode
  const { data: allStatuses = [] } = useAllTaskStatuses();
  const { data: allCategories = [] } = useAllTaskCategories();

  // Deduplicate statuses by name for filter UI (multiple spaces can have same status names)
  const { dedupedStatuses, statusIdMap } = useMemo(() => {
    const raw = isAllTasksMode ? allStatuses : spaceStatuses;
    const nameMap = new Map<string, { representative: typeof raw[0]; allIds: string[] }>();
    for (const s of raw) {
      const existing = nameMap.get(s.name);
      if (existing) {
        existing.allIds.push(s.id);
      } else {
        nameMap.set(s.name, { representative: s, allIds: [s.id] });
      }
    }
    const deduped = Array.from(nameMap.values()).map(v => v.representative);
    const idMap = new Map<string, string[]>();
    for (const v of nameMap.values()) {
      idMap.set(v.representative.id, v.allIds);
    }
    return { dedupedStatuses: deduped, statusIdMap: idMap };
  }, [isAllTasksMode, allStatuses, spaceStatuses]);

  // Deduplicate categories by name
  const { dedupedCategories, categoryIdMap } = useMemo(() => {
    const raw = isAllTasksMode ? allCategories : spaceCategories;
    const nameMap = new Map<string, { representative: typeof raw[0]; allIds: string[] }>();
    for (const c of raw) {
      const existing = nameMap.get(c.name);
      if (existing) {
        existing.allIds.push(c.id);
      } else {
        nameMap.set(c.name, { representative: c, allIds: [c.id] });
      }
    }
    const deduped = Array.from(nameMap.values()).map(v => v.representative);
    const idMap = new Map<string, string[]>();
    for (const v of nameMap.values()) {
      idMap.set(v.representative.id, v.allIds);
    }
    return { dedupedCategories: deduped, categoryIdMap: idMap };
  }, [isAllTasksMode, allCategories, spaceCategories]);

  // Expand deduped filter IDs to all matching IDs across spaces
  const expandedFilters: TaskFilters = useMemo(() => {
    const expanded = { ...filters };
    if (expanded.status_ids?.length) {
      expanded.status_ids = expanded.status_ids.flatMap(id => statusIdMap.get(id) || [id]);
    }
    if (expanded.category_ids?.length) {
      expanded.category_ids = expanded.category_ids.flatMap(id => categoryIdMap.get(id) || [id]);
    }
    return expanded;
  }, [filters, statusIdMap, categoryIdMap]);

  const combinedFilters: TaskFilters = useMemo(() => ({
    ...expandedFilters,
    ...(search ? { search } : {}),
    ...(activeListId ? { list_id: activeListId } : {}),
  }), [expandedFilters, search, activeListId]);

  const { data: spaceTasks = [] } = useTasks(activeSpaceId || undefined, !isAllTasksMode ? combinedFilters : undefined);

  const myTasksFilters: TaskFilters | undefined = useMemo(() => {
    if (!isAllTasksMode) return undefined;
    return {
      ...combinedFilters,
      assignee_ids: currentEmployee?.id ? [currentEmployee.id] : [],
    };
  }, [isAllTasksMode, combinedFilters, currentEmployee?.id]);
  const { data: allTasks = [] } = useAllTasks(myTasksFilters);

  const statuses = dedupedStatuses;
  const categories = dedupedCategories;
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
    if (isAllTasksMode) return 'My Tasks';
    if (isSpaceView && activeSpace) return activeSpace.name;
    if (isFolderView) return 'Folder';
    if (isListView) return 'Task List';
    return 'Tasks';
  }, [selection, activeSpace, isAllTasksMode, isSpaceView, isFolderView, isListView]);

  const pageIcon = useMemo(() => {
    if (isAllTasksMode) return <User className="h-5 w-5" />;
    if (isSpaceView && activeSpace) {
      const icon = activeSpace.icon || '🚀';
      return isImageIcon(icon)
        ? <img src={icon} alt="" className="h-5 w-5 rounded object-cover" />
        : <span>{icon}</span>;
    }
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
                  spaceId={activeSpaceId || undefined}
                />

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}

                {viewMode === 'list' && (
                  <TaskColumnCustomizer columns={columns} onColumnsChange={setColumns} spaceId={activeSpaceId || undefined} />
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
            <div className="flex-1 overflow-hidden p-6 flex flex-col min-h-0">
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
                  statusIdMap={statusIdMap}
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
                  statusIdMap={statusIdMap}
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
