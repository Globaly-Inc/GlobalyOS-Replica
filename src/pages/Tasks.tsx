import { useState, useMemo } from 'react';
import { Search, Plus, Settings, LayoutList, Columns3, X, ListPlus, Pencil, Trash2, MoreHorizontal, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useTasks, useTaskStatuses, useTaskCategories, useTaskSpaces, useTaskLists, useCreateTaskList, useUpdateTaskList, useDeleteTaskList, useAllTasks, useAllTaskStatuses, useAllTaskCategories } from '@/services/useTasks';
import { TaskListView } from '../components/tasks/TaskListView';
import { TaskBoardView } from '../components/tasks/TaskBoardView';
import { TaskInnerSidebar } from '../components/tasks/TaskInnerSidebar';
import { ManageDialog } from '../components/tasks/ManageDialog';
import { TaskDetailPage } from '../components/tasks/TaskDetailPage';
import { TaskFilterPopover } from '../components/tasks/TaskFilterPopover';
import { TaskColumnCustomizer, getDefaultColumns } from '../components/tasks/TaskColumnCustomizer';
import { AddTaskDialog } from '../components/tasks/AddTaskDialog';
import { useTaskListRealtime } from '@/services/useTaskDetailRealtime';
import type { TaskSpaceRow, TaskFilters, TaskListRow } from '@/types/task';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ViewMode = 'list' | 'board';

const Tasks = () => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [isAllTasksMode, setIsAllTasksMode] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showManage, setShowManage] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskDefaultStatusId, setAddTaskDefaultStatusId] = useState<string | null>(null);
  const [addTaskDefaultTitle, setAddTaskDefaultTitle] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<TaskFilters>({});
  const [columns, setColumns] = useState(getDefaultColumns());
  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');

  const { data: spaces = [] } = useTaskSpaces();

  const activeSpaceId = isAllTasksMode ? null : (selectedSpaceId || spaces[0]?.id || null);
  const activeSpace = activeSpaceId ? spaces.find(s => s.id === activeSpaceId) : null;

  const { data: taskLists = [] } = useTaskLists(activeSpaceId || undefined);
  const createList = useCreateTaskList();
  const updateList = useUpdateTaskList();
  const deleteList = useDeleteTaskList();

  const activeListId = selectedListId || taskLists[0]?.id || null;

  useTaskListRealtime(activeSpaceId);

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

  const combinedFilters: TaskFilters = useMemo(() => ({
    ...filters,
    ...(search ? { search } : {}),
    ...(!isAllTasksMode && activeListId ? { list_id: activeListId } : {}),
  }), [filters, search, activeListId, isAllTasksMode]);

  const hasActiveFilters = Object.keys(filters).some(k => {
    const v = (filters as any)[k];
    return Array.isArray(v) ? v.length > 0 : !!v;
  }) || !!search;

  // Space-scoped hooks
  const { data: spaceStatuses = [] } = useTaskStatuses(activeSpaceId || undefined);
  const { data: spaceCategories = [] } = useTaskCategories(activeSpaceId || undefined);
  const { data: spaceTasks = [] } = useTasks(activeSpaceId || undefined, isAllTasksMode ? undefined : combinedFilters);

  // Org-wide hooks for All Tasks mode
  const { data: allStatuses = [] } = useAllTaskStatuses();
  const { data: allCategories = [] } = useAllTaskCategories();
  const { data: allTasks = [] } = useAllTasks(isAllTasksMode ? combinedFilters : undefined);

  // Pick the right data based on mode
  const statuses = isAllTasksMode ? allStatuses : spaceStatuses;
  const categories = isAllTasksMode ? allCategories : spaceCategories;
  const tasks = isAllTasksMode ? allTasks : spaceTasks;

  const handleSelectSpace = (spaceId: string | null) => {
    if (spaceId === null) {
      setIsAllTasksMode(true);
      setSelectedSpaceId(null);
    } else {
      setIsAllTasksMode(false);
      setSelectedSpaceId(spaceId);
    }
    setSelectedListId(null);
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

  const handleAddList = async () => {
    if (!newListName.trim() || !activeSpaceId) return;
    try {
      const newList = await createList.mutateAsync({
        space_id: activeSpaceId,
        name: newListName.trim(),
        sort_order: taskLists.length,
      });
      setSelectedListId(newList.id);
      setNewListName('');
      setAddingList(false);
      toast.success('List created');
    } catch {
      toast.error('Failed to create list');
    }
  };

  const handleRenameList = async (id: string) => {
    if (!editingListName.trim()) { setEditingListId(null); return; }
    try {
      await updateList.mutateAsync({ id, name: editingListName.trim() });
      setEditingListId(null);
      toast.success('List renamed');
    } catch {
      toast.error('Failed to rename');
    }
  };

  const handleDeleteList = async (list: TaskListRow) => {
    if (taskLists.length <= 1) { toast.error("Can't delete the last list"); return; }
    try {
      await deleteList.mutateAsync({ id: list.id, spaceId: list.space_id });
      if (selectedListId === list.id) setSelectedListId(null);
      toast.success('List deleted');
    } catch {
      toast.error('Failed to delete list');
    }
  };

  const clearFilters = () => { setFilters({}); setSearch(''); };

  const showContent = isAllTasksMode || (activeSpaceId && activeSpace);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <TaskInnerSidebar selectedSpaceId={isAllTasksMode ? null : activeSpaceId} onSelectSpace={handleSelectSpace} />

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
        {showContent ? (
          <>
            {/* Header */}
            <div className="px-6 pt-4 pb-0">
              {!isAllTasksMode && breadcrumb.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  {breadcrumb.map((s, i) => (
                    <span key={s.id} className="flex items-center gap-1">
                      {i > 0 && <span>/</span>}
                      <button className="hover:text-foreground transition-colors" onClick={() => handleSelectSpace(s.id)}>
                        {s.name}
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  {isAllTasksMode ? (
                    <>
                      <CheckSquare className="h-5 w-5" />
                      All Tasks
                    </>
                  ) : (
                    <>
                      <span>{activeSpace?.icon || '📁'}</span>
                      {activeSpace?.name}
                    </>
                  )}
                </h1>
                <div className="flex items-center gap-2">
                  {!isAllTasksMode && (
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

            {/* Toolbar */}
            <div className="px-6 pt-3 border-b">
              {/* List tabs - only in space mode */}
              {!isAllTasksMode && (
                <div className="flex items-center gap-0.5 overflow-x-auto">
                  {taskLists.map(list => (
                    <div
                      key={list.id}
                      className={cn(
                        'group relative flex items-center gap-1 px-3 py-2 text-sm cursor-pointer border-b-2 transition-colors whitespace-nowrap shrink-0',
                        activeListId === list.id
                          ? 'border-primary text-primary font-medium'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                      )}
                      onClick={() => setSelectedListId(list.id)}
                    >
                      {editingListId === list.id ? (
                        <Input
                          value={editingListName}
                          onChange={e => setEditingListName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameList(list.id);
                            if (e.key === 'Escape') setEditingListId(null);
                          }}
                          onBlur={() => handleRenameList(list.id)}
                          className="h-6 text-sm w-28 px-1"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span>{list.name}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity"
                                onClick={e => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => { setEditingListId(list.id); setEditingListName(list.name); }}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeleteList(list)}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  ))}

                  {addingList ? (
                    <div className="flex items-center gap-1 px-2">
                      <Input
                        value={newListName}
                        onChange={e => setNewListName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddList();
                          if (e.key === 'Escape') { setAddingList(false); setNewListName(''); }
                        }}
                        placeholder="List name..."
                        className="h-7 text-xs w-28"
                        autoFocus
                      />
                      <Button size="sm" className="h-7 px-2 text-xs" onClick={handleAddList} disabled={!newListName.trim()}>Add</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddingList(false); setNewListName(''); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      onClick={() => setAddingList(true)}
                    >
                      <ListPlus className="h-3.5 w-3.5" />
                      New List
                    </button>
                  )}
                </div>
              )}

              {/* Toolbar row */}
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
