/**
 * Task Management Service Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import type {
  TaskSpaceRow, TaskSpaceInsert, TaskSpaceUpdate,
  TaskStatusRow, TaskStatusInsert, TaskStatusUpdate,
  TaskCategoryRow, TaskCategoryInsert, TaskCategoryUpdate,
  TaskRow, TaskInsert, TaskUpdate,
  TaskChecklistRow, TaskChecklistInsert, TaskChecklistUpdate,
  TaskCommentInsert,
  TaskFollowerInsert,
  TaskActivityLogInsert,
  TaskWithRelations,
  TaskCommentWithAuthor,
  TaskActivityLogWithActor,
  TaskFilters,
  TaskSpaceTreeNode,
  TaskListRow, TaskListInsert, TaskListUpdate,
  TaskFolderRow, TaskFolderInsert, TaskFolderUpdate,
  TaskSharingPermissionRow, TaskSharingPermissionInsert,
} from '@/types/task';

// ─── Spaces ───

export const useTaskSpaces = () => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['task-spaces', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('task_spaces')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('sort_order');
      if (error) throw error;
      return data as TaskSpaceRow[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const buildSpaceTree = (spaces: TaskSpaceRow[]): TaskSpaceTreeNode[] => {
  const map = new Map<string, TaskSpaceTreeNode>();
  const roots: TaskSpaceTreeNode[] = [];
  spaces.forEach(s => map.set(s.id, { ...s, children: [] }));
  spaces.forEach(s => {
    const node = map.get(s.id)!;
    if (s.parent_id && map.has(s.parent_id)) {
      map.get(s.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

export const useCreateTaskSpace = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();
  return useMutation({
    mutationFn: async (input: Omit<TaskSpaceInsert, 'organization_id' | 'owner_id'>) => {
      const { data, error } = await supabase
        .from('task_spaces')
        .insert({ ...input, organization_id: currentOrg!.id, owner_id: employee?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-spaces'] }),
  });
};

export const useUpdateTaskSpace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskSpaceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('task_spaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-spaces'] }),
  });
};

export const useDeleteTaskSpace = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_spaces').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-spaces'] }),
  });
};

// ─── Task Lists ───

export const useTaskLists = (spaceId: string | undefined) => {
  return useQuery({
    queryKey: ['task-lists', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_lists')
        .select('*')
        .eq('space_id', spaceId!)
        .eq('is_archived', false)
        .order('sort_order');
      if (error) throw error;
      return data as TaskListRow[];
    },
    enabled: !!spaceId,
  });
};

export const useCreateTaskList = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Omit<TaskListInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('task_lists')
        .insert({ ...input, organization_id: currentOrg!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['task-lists', data.space_id] }),
  });
};

export const useUpdateTaskList = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskListUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('task_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['task-lists', data.space_id] }),
  });
};

export const useDeleteTaskList = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, spaceId }: { id: string; spaceId: string }) => {
      const { error } = await supabase.from('task_lists').delete().eq('id', id);
      if (error) throw error;
      return spaceId;
    },
    onSuccess: (spaceId) => qc.invalidateQueries({ queryKey: ['task-lists', spaceId] }),
  });
};

// ─── Statuses ───

export const useTaskStatuses = (spaceId: string | undefined) => {
  return useQuery({
    queryKey: ['task-statuses', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('space_id', spaceId!)
        .order('sort_order');
      if (error) throw error;
      return data as TaskStatusRow[];
    },
    enabled: !!spaceId,
  });
};

export const useCreateTaskStatus = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Omit<TaskStatusInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('task_statuses')
        .insert({ ...input, organization_id: currentOrg!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['task-statuses', vars.space_id] }),
  });
};

export const useUpdateTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskStatusUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('task_statuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['task-statuses', data.space_id] }),
  });
};

export const useDeleteTaskStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, spaceId }: { id: string; spaceId: string }) => {
      const { error } = await supabase.from('task_statuses').delete().eq('id', id);
      if (error) throw error;
      return spaceId;
    },
    onSuccess: (spaceId) => qc.invalidateQueries({ queryKey: ['task-statuses', spaceId] }),
  });
};

// ─── Categories ───

export const useTaskCategories = (spaceId: string | undefined) => {
  return useQuery({
    queryKey: ['task-categories', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('space_id', spaceId!)
        .order('sort_order');
      if (error) throw error;
      return data as TaskCategoryRow[];
    },
    enabled: !!spaceId,
  });
};

export const useCreateTaskCategory = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Omit<TaskCategoryInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('task_categories')
        .insert({ ...input, organization_id: currentOrg!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['task-categories', vars.space_id] }),
  });
};

export const useUpdateTaskCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskCategoryUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('task_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['task-categories', data.space_id] }),
  });
};

export const useDeleteTaskCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, spaceId }: { id: string; spaceId: string }) => {
      const { error } = await supabase.from('task_categories').delete().eq('id', id);
      if (error) throw error;
      return spaceId;
    },
    onSuccess: (spaceId) => qc.invalidateQueries({ queryKey: ['task-categories', spaceId] }),
  });
};

// ─── Org-wide hooks (All Tasks) ───

export const useAllTaskStatuses = () => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['all-task-statuses', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('task_statuses')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('sort_order');
      if (error) throw error;
      return data as TaskStatusRow[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useAllTaskCategories = () => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['all-task-categories', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from('task_categories')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .order('sort_order');
      if (error) throw error;
      return data as TaskCategoryRow[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useAllTasks = (filters?: TaskFilters) => {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['all-tasks', currentOrg?.id, filters],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      let query = supabase
        .from('tasks')
        .select(`
          *,
          status:task_statuses(*),
          category:task_categories(*),
          task_attachments(count),
          task_comments(count),
          task_list:task_lists!tasks_list_id_fkey(name, folder_id, space_id),
          task_space:task_spaces!tasks_space_id_fkey(name)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (filters?.status_ids?.length) query = query.in('status_id', filters.status_ids);
      if (filters?.assignee_ids?.length) query = query.in('assignee_id', filters.assignee_ids);
      if (filters?.priority?.length) query = query.in('priority', filters.priority);
      if (filters?.category_ids?.length) query = query.in('category_id', filters.category_ids);
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`);
      if (filters?.due_date_from) query = query.gte('due_date', filters.due_date_from);
      if (filters?.due_date_to) query = query.lte('due_date', filters.due_date_to);

      const { data, error } = await query;
      if (error) throw error;

      const empIds = new Set<string>();
      const folderIds = new Set<string>();
      (data || []).forEach((t: any) => {
        if (t.assignee_id) empIds.add(t.assignee_id);
        if (t.reporter_id) empIds.add(t.reporter_id);
        if (t.task_list?.folder_id) folderIds.add(t.task_list.folder_id);
      });

      let empMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      if (empIds.size > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, full_name, avatar_url')
          .in('id', [...empIds]);
        (emps || []).forEach((e: any) => empMap.set(e.id, e));
      }

      let folderMap = new Map<string, string>();
      if (folderIds.size > 0) {
        const { data: folders } = await supabase
          .from('task_folders')
          .select('id, name')
          .in('id', [...folderIds]);
        (folders || []).forEach((f: any) => folderMap.set(f.id, f.name));
      }

      return (data || []).map((t: any) => ({
        ...t,
        assignee: t.assignee_id ? empMap.get(t.assignee_id) || null : null,
        reporter: t.reporter_id ? empMap.get(t.reporter_id) || null : null,
        attachment_count: t.task_attachments?.[0]?.count ?? 0,
        comment_count: t.task_comments?.[0]?.count ?? 0,
        location: {
          space_name: t.task_space?.name || null,
          list_name: t.task_list?.name || null,
          folder_name: t.task_list?.folder_id ? folderMap.get(t.task_list.folder_id) || null : null,
        },
      })) as TaskWithRelations[];
    },
    enabled: !!currentOrg?.id,
  });
};

// ─── Tasks ───

export const useTasks = (spaceId: string | undefined, filters?: TaskFilters) => {
  return useQuery({
    queryKey: ['tasks', spaceId, filters],
    queryFn: async () => {
      if (!spaceId) return [];
      let query = supabase
        .from('tasks')
        .select(`
          *,
          status:task_statuses(*),
          category:task_categories(*),
          task_attachments(count),
          task_comments(count)
        `)
        .eq('space_id', spaceId)
        .eq('is_archived', false)
        .order('sort_order');

      if (filters?.list_id) query = query.eq('list_id', filters.list_id);
      if (filters?.status_ids?.length) query = query.in('status_id', filters.status_ids);
      if (filters?.assignee_ids?.length) query = query.in('assignee_id', filters.assignee_ids);
      if (filters?.priority?.length) query = query.in('priority', filters.priority);
      if (filters?.category_ids?.length) query = query.in('category_id', filters.category_ids);
      if (filters?.search) query = query.ilike('title', `%${filters.search}%`);
      if (filters?.due_date_from) query = query.gte('due_date', filters.due_date_from);
      if (filters?.due_date_to) query = query.lte('due_date', filters.due_date_to);

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with assignee/reporter from employee_directory
      const empIds = new Set<string>();
      (data || []).forEach((t: any) => {
        if (t.assignee_id) empIds.add(t.assignee_id);
        if (t.reporter_id) empIds.add(t.reporter_id);
      });
      
      let empMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      if (empIds.size > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, full_name, avatar_url')
          .in('id', [...empIds]);
        (emps || []).forEach((e: any) => empMap.set(e.id, e));
      }

      return (data || []).map((t: any) => ({
        ...t,
        assignee: t.assignee_id ? empMap.get(t.assignee_id) || null : null,
        reporter: t.reporter_id ? empMap.get(t.reporter_id) || null : null,
        attachment_count: t.task_attachments?.[0]?.count ?? 0,
        comment_count: t.task_comments?.[0]?.count ?? 0,
      })) as TaskWithRelations[];
    },
    enabled: !!spaceId,
  });
};

export const useTask = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          status:task_statuses(*),
          category:task_categories(*)
        `)
        .eq('id', taskId!)
        .single();
      if (error) throw error;

      // Enrich with assignee/reporter from employee_directory
      const empIds = new Set<string>();
      if (data.assignee_id) empIds.add(data.assignee_id);
      if (data.reporter_id) empIds.add(data.reporter_id);

      let empMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      if (empIds.size > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, full_name, avatar_url')
          .in('id', [...empIds]);
        (emps || []).forEach((e: any) => empMap.set(e.id, e));
      }

      return {
        ...data,
        assignee: data.assignee_id ? empMap.get(data.assignee_id) || null : null,
        reporter: data.reporter_id ? empMap.get(data.reporter_id) || null : null,
      } as TaskWithRelations;
    },
    enabled: !!taskId,
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();
  return useMutation({
    mutationFn: async (input: Omit<TaskInsert, 'organization_id' | 'reporter_id'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          organization_id: currentOrg!.id,
          reporter_id: employee?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Log creation
      await supabase.from('task_activity_logs').insert({
        organization_id: currentOrg!.id,
        task_id: data.id,
        actor_id: employee?.id,
        action_type: 'created',
        new_value: { title: data.title },
      });

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', data.space_id] });
      qc.invalidateQueries({ queryKey: ['crm-linked-tasks'] });
    },
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  const { data: employee } = useCurrentEmployee();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      // Fetch old values for changed fields before updating
      const changedKeys = Object.keys(updates);
      let oldData: Record<string, unknown> = {};
      if (changedKeys.length > 0 && currentOrg?.id) {
        const { data: existing } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', id)
          .single();
        if (existing) {
          changedKeys.forEach(k => { oldData[k] = (existing as any)[k]; });
        }
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Log activity for each changed field
      if (currentOrg?.id && employee?.id) {
        const fieldActionMap: Record<string, string> = {
          status_id: 'status_changed',
          priority: 'priority_changed',
          assignee_id: 'assignee_changed',
          due_date: 'due_date_changed',
          tags: 'tags_updated',
          description: 'description_updated',
          title: 'title_updated',
          category_id: 'category_changed',
          list_id: 'list_changed',
          start_date: 'start_date_changed',
          time_estimate: 'time_estimate_changed',
        };

        const logs = changedKeys
          .filter(k => JSON.stringify(oldData[k]) !== JSON.stringify((updates as any)[k]))
          .map(k => ({
            organization_id: currentOrg.id,
            task_id: id,
            actor_id: employee.id,
            action_type: fieldActionMap[k] || 'field_updated',
            old_value: (oldData[k] != null ? { [k]: oldData[k] } : null) as import('@/integrations/supabase/types').Json,
            new_value: ((updates as any)[k] != null ? { [k]: (updates as any)[k] } : null) as import('@/integrations/supabase/types').Json,
          }));

        if (logs.length > 0) {
          await supabase.from('task_activity_logs').insert(logs);
        }
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks', data.space_id] });
      qc.invalidateQueries({ queryKey: ['task', data.id] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', data.id] });
    },
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, spaceId }: { id: string; spaceId: string }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return spaceId;
    },
    onSuccess: (spaceId) => qc.invalidateQueries({ queryKey: ['tasks', spaceId] }),
  });
};

export const useBulkDeleteTasks = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, spaceId }: { ids: string[]; spaceId: string }) => {
      const { error } = await supabase.from('tasks').delete().in('id', ids);
      if (error) throw error;
      return spaceId;
    },
    onSuccess: (spaceId) => {
      qc.invalidateQueries({ queryKey: ['tasks', spaceId] });
      qc.invalidateQueries({ queryKey: ['all-tasks'] });
    },
  });
};

// ─── Checklists ───

export const useTaskChecklists = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-checklists', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_checklists')
        .select('*')
        .eq('task_id', taskId!)
        .order('sort_order');
      if (error) throw error;
      return data as TaskChecklistRow[];
    },
    enabled: !!taskId,
  });
};

export const useCreateTaskChecklist = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();
  return useMutation({
    mutationFn: async (input: Omit<TaskChecklistInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('task_checklists')
        .insert({ ...input, organization_id: currentOrg!.id })
        .select()
        .single();
      if (error) throw error;

      if (employee?.id) {
        await supabase.from('task_activity_logs').insert({
          organization_id: currentOrg!.id,
          task_id: input.task_id!,
          actor_id: employee.id,
          action_type: 'checklist_item_added',
          new_value: { title: data.title },
        });
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['task-checklists', data.task_id] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', data.task_id] });
    },
  });
};

export const useUpdateTaskChecklist = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskChecklistUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('task_checklists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      if (employee?.id && currentOrg?.id && 'is_done' in updates) {
        await supabase.from('task_activity_logs').insert({
          organization_id: currentOrg.id,
          task_id: data.task_id,
          actor_id: employee.id,
          action_type: 'checklist_item_toggled',
          new_value: { title: data.title, is_done: data.is_done },
        });
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['task-checklists', data.task_id] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', data.task_id] });
    },
  });
};

export const useDeleteTaskChecklist = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();
  return useMutation({
    mutationFn: async ({ id, taskId, title }: { id: string; taskId: string; title?: string }) => {
      const { error } = await supabase.from('task_checklists').delete().eq('id', id);
      if (error) throw error;

      if (employee?.id && currentOrg?.id) {
        await supabase.from('task_activity_logs').insert({
          organization_id: currentOrg.id,
          task_id: taskId,
          actor_id: employee.id,
          action_type: 'checklist_item_removed',
          old_value: title ? { title } : null,
        });
      }

      return taskId;
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ['task-checklists', taskId] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', taskId] });
    },
  });
};

// ─── Comments ───

export const useTaskComments = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: true });
      if (error) throw error;

      const empIds = [...new Set((data || []).map((c: any) => c.employee_id).filter(Boolean))];
      let empMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      if (empIds.length > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, full_name, avatar_url')
          .in('id', empIds);
        (emps || []).forEach((e: any) => empMap.set(e.id, e));
      }

      return (data || []).map((c: any) => ({
        ...c,
        employee: c.employee_id ? empMap.get(c.employee_id) || null : null,
      })) as TaskCommentWithAuthor[];
    },
    enabled: !!taskId,
  });
};

export const useCreateTaskComment = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();
  return useMutation({
    mutationFn: async (input: { task_id: string; content: string }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          ...input,
          organization_id: currentOrg!.id,
          employee_id: employee!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Log comment activity
      await supabase.from('task_activity_logs').insert({
        organization_id: currentOrg!.id,
        task_id: input.task_id,
        actor_id: employee!.id,
        action_type: 'commented',
        new_value: { comment_id: data.id },
      });

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['task-comments', data.task_id] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', data.task_id] });
    },
  });
};

// ─── Activity Logs ───

export const useTaskActivityLogs = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-activity-logs', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_activity_logs')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const actorIds = [...new Set((data || []).map((l: any) => l.actor_id).filter(Boolean))];
      let actorMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      if (actorIds.length > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, full_name, avatar_url')
          .in('id', actorIds);
        (emps || []).forEach((e: any) => actorMap.set(e.id, e));
      }

      return (data || []).map((l: any) => ({
        ...l,
        actor: l.actor_id ? actorMap.get(l.actor_id) || null : null,
      })) as TaskActivityLogWithActor[];
    },
    enabled: !!taskId,
  });
};

// ─── Followers ───

export const useTaskFollowers = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-followers', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_followers')
        .select('*')
        .eq('task_id', taskId!);
      if (error) throw error;

      const empIds = [...new Set((data || []).map((f: any) => f.employee_id).filter(Boolean))];
      let empMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      if (empIds.length > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, full_name, avatar_url')
          .in('id', empIds);
        (emps || []).forEach((e: any) => empMap.set(e.id, e));
      }

      return (data || []).map((f: any) => ({
        ...f,
        full_name: empMap.get(f.employee_id)?.full_name,
        avatar_url: empMap.get(f.employee_id)?.avatar_url,
      }));
    },
    enabled: !!taskId,
  });
};

export const useToggleTaskFollower = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();
  return useMutation({
    mutationFn: async ({ taskId, isFollowing }: { taskId: string; isFollowing: boolean }) => {
      if (isFollowing) {
        const { error } = await supabase
          .from('task_followers')
          .delete()
          .eq('task_id', taskId)
          .eq('employee_id', employee!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('task_followers')
          .insert({
            task_id: taskId,
            employee_id: employee!.id,
            organization_id: currentOrg!.id,
          });
        if (error) throw error;
      }

      // Log follower activity
      if (currentOrg?.id && employee?.id) {
        await supabase.from('task_activity_logs').insert({
          organization_id: currentOrg.id,
          task_id: taskId,
          actor_id: employee.id,
          action_type: isFollowing ? 'follower_removed' : 'follower_added',
        });
      }

      return taskId;
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ['task-followers', taskId] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', taskId] });
    },
  });
};

// ─── Folders ───

export const useTaskFolders = (spaceId: string | undefined) => {
  return useQuery({
    queryKey: ['task-folders', spaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_folders')
        .select('*')
        .eq('space_id', spaceId!)
        .eq('is_archived', false)
        .order('sort_order');
      if (error) throw error;
      return data as TaskFolderRow[];
    },
    enabled: !!spaceId,
  });
};

export const useCreateTaskFolder = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Omit<TaskFolderInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('task_folders')
        .insert({ ...input, organization_id: currentOrg!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['task-folders', data.space_id] }),
  });
};

export const useUpdateTaskFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskFolderUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('task_folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['task-folders', data.space_id] }),
  });
};

export const useDeleteTaskFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, spaceId }: { id: string; spaceId: string }) => {
      const { error } = await supabase.from('task_folders').delete().eq('id', id);
      if (error) throw error;
      return spaceId;
    },
    onSuccess: (spaceId) => qc.invalidateQueries({ queryKey: ['task-folders', spaceId] }),
  });
};

// ─── Sharing Permissions ───

export const useTaskSharingPermissions = (entityType: string, entityId: string | undefined) => {
  return useQuery({
    queryKey: ['task-sharing', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_sharing_permissions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!);
      if (error) throw error;

      const empIds = [...new Set((data || []).map((p: any) => p.employee_id).filter(Boolean))];
      let empMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
      if (empIds.length > 0) {
        const { data: emps } = await supabase
          .from('employee_directory')
          .select('id, full_name, avatar_url')
          .in('id', empIds);
        (emps || []).forEach((e: any) => empMap.set(e.id, e));
      }

      return (data || []).map((p: any) => ({
        ...p,
        employee: p.employee_id ? empMap.get(p.employee_id) || null : null,
      }));
    },
    enabled: !!entityId,
  });
};

export const useAddTaskSharingPermission = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  return useMutation({
    mutationFn: async (input: Omit<TaskSharingPermissionInsert, 'organization_id'>) => {
      const { data, error } = await supabase
        .from('task_sharing_permissions')
        .insert({ ...input, organization_id: currentOrg!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['task-sharing', vars.entity_type, vars.entity_id] }),
  });
};

export const useRemoveTaskSharingPermission = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, entityType, entityId }: { id: string; entityType: string; entityId: string }) => {
      const { error } = await supabase.from('task_sharing_permissions').delete().eq('id', id);
      if (error) throw error;
      return { entityType, entityId };
    },
    onSuccess: ({ entityType, entityId }) => qc.invalidateQueries({ queryKey: ['task-sharing', entityType, entityId] }),
  });
};
