import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TaskListView } from '../TaskListView';
import type { TaskStatusRow, TaskWithRelations, TaskCategoryRow } from '@/types/task';

// ─── Mocks ───

const mockMutateAsync = vi.fn().mockResolvedValue({ id: 'new-task-id', space_id: 'space-1' });

vi.mock('@/services/useTasks', () => ({
  useCreateTask: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useUpdateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBulkDeleteTasks: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/services/useTaskAttachments', () => ({
  useTaskAttachments: () => ({ data: [] }),
  useUploadTaskAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTaskAttachment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    currentOrg: { id: 'org-1', name: 'Test Org', org_code: 'test' },
  }),
}));

vi.mock('@/services/useEmployees', () => ({
  useEmployees: () => ({
    data: [
      { id: 'emp-1', full_name: 'Alice Smith', avatar_url: null, profiles: { full_name: 'Alice Smith' } },
      { id: 'emp-2', full_name: 'Bob Jones', avatar_url: null, profiles: { full_name: 'Bob Jones' } },
    ],
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Test data ───

const statuses: TaskStatusRow[] = [
  {
    id: 'status-todo',
    name: 'To Do',
    color: '#3b82f6',
    status_group: 'todo',
    sort_order: 0,
    space_id: 'space-1',
    organization_id: 'org-1',
    is_closed: false,
    is_default: true,
  },
  {
    id: 'status-done',
    name: 'Completed',
    color: '#22c55e',
    status_group: 'completed',
    sort_order: 4,
    space_id: 'space-1',
    organization_id: 'org-1',
    is_closed: true,
    is_default: false,
  },
];

const categories: TaskCategoryRow[] = [
  {
    id: 'cat-1',
    name: 'Bug',
    color: '#ef4444',
    icon: null,
    space_id: 'space-1',
    organization_id: 'org-1',
    sort_order: 0,
  },
];

const existingTask: TaskWithRelations = {
  id: 'task-1',
  title: 'Existing Task',
  status_id: 'status-todo',
  space_id: 'space-1',
  list_id: null,
  organization_id: 'org-1',
  priority: 'normal',
  category_id: null,
  assignee_id: null,
  reporter_id: null,
  due_date: null,
  description: null,
  sort_order: 0,
  tags: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: null,
  is_archived: false,
  notification_enabled: true,
  recurrence: null,
  related_entity_id: null,
  related_entity_type: null,
  start_date: null,
};

// ─── Helper ───

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  );
};

const renderView = (props?: Partial<Parameters<typeof TaskListView>[0]>) =>
  render(
    <TaskListView
      statuses={statuses}
      tasks={[existingTask]}
      categories={categories}
      spaceId="space-1"
      listId="list-1"
      onTaskClick={vi.fn()}
      {...props}
    />,
    { wrapper: createWrapper() },
  );

// ─── Tests ───

describe('TaskListView – inline add task', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders status groups with "+ Add Task" buttons', () => {
    renderView();
    const addButtons = screen.getAllByText('Add Task');
    expect(addButtons.length).toBe(statuses.length);
  });

  it('shows inline creation row when clicking "+ Add Task"', () => {
    renderView();
    fireEvent.click(screen.getAllByText('Add Task')[0]);
    expect(screen.getByPlaceholderText('Task name...')).toBeInTheDocument();
  });

  it('hides inline row on Escape key', () => {
    renderView();
    fireEvent.click(screen.getAllByText('Add Task')[0]);
    const input = screen.getByPlaceholderText('Task name...');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Task name...')).not.toBeInTheDocument();
  });

  it('does not create task when pressing Enter with empty title', async () => {
    renderView();
    fireEvent.click(screen.getAllByText('Add Task')[0]);
    const input = screen.getByPlaceholderText('Task name...');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('creates task with correct data when pressing Enter with title', async () => {
    renderView();
    fireEvent.click(screen.getAllByText('Add Task')[0]);
    const input = screen.getByPlaceholderText('Task name...');

    fireEvent.change(input, { target: { value: 'My New Task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          space_id: 'space-1',
          list_id: 'list-1',
          status_id: 'status-todo',
          title: 'My New Task',
          priority: 'normal',
          category_id: null,
          assignee_id: null,
          due_date: null,
        }),
      );
    });
  });

  it('resets inline row after successful creation', async () => {
    renderView();
    fireEvent.click(screen.getAllByText('Add Task')[0]);
    const input = screen.getByPlaceholderText('Task name...');
    fireEvent.change(input, { target: { value: 'Task to create' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Task name...')).not.toBeInTheDocument();
    });
  });

  it('shows existing tasks in the list', () => {
    renderView();
    expect(screen.getByText('Existing Task')).toBeInTheDocument();
  });

  it('shows toast error when task creation fails', async () => {
    const { toast } = await import('sonner');
    mockMutateAsync.mockRejectedValueOnce(new Error('fail'));

    renderView();
    fireEvent.click(screen.getAllByText('Add Task')[0]);
    const input = screen.getByPlaceholderText('Task name...');
    fireEvent.change(input, { target: { value: 'Fail task' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to create task');
    });
  });

  it('shows default priority badge "Normal" in inline row', () => {
    renderView();
    fireEvent.click(screen.getAllByText('Add Task')[0]);
    const normalBadges = screen.getAllByText('Normal');
    expect(normalBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('can collapse and expand status groups', () => {
    renderView();
    expect(screen.getByText('Existing Task')).toBeInTheDocument();

    fireEvent.click(screen.getByText('To Do'));
    expect(screen.queryByText('Existing Task')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('To Do'));
    expect(screen.getByText('Existing Task')).toBeInTheDocument();
  });
});
