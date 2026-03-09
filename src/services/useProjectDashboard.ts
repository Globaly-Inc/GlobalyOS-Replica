/**
 * Project Dashboard data hook
 * Fetches and computes dashboard metrics for a depth-0 project space
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SubProjectData {
  id: string;
  name: string;
  icon: string | null;
  type: 'folder' | 'list';
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

interface AttachmentData {
  id: string;
  fileName: string;
  fileSize: number | null;
  filePath: string;
  fileType: string | null;
  taskTitle: string;
  createdAt: string;
}

interface AssigneeData {
  name: string;
  count: number;
}

export interface ProjectDashboardData {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  subProjects: SubProjectData[];
  attachments: AttachmentData[];
  tasksByAssignee: AssigneeData[];
}

export const useProjectDashboardData = (
  projectSpaceId: string | null,
  _spaces: unknown[],
) => {
  return useQuery({
    queryKey: ['project-dashboard', projectSpaceId],
    queryFn: async (): Promise<ProjectDashboardData> => {
      if (!projectSpaceId) {
        return { totalTasks: 0, completedTasks: 0, completionRate: 0, subProjects: [], attachments: [], tasksByAssignee: [] };
      }

      // Fetch folders, lists, and tasks in parallel
      const [foldersRes, listsRes, tasksRes] = await Promise.all([
        supabase
          .from('task_folders')
          .select('id, name')
          .eq('space_id', projectSpaceId)
          .order('sort_order', { ascending: true }),
        supabase
          .from('task_lists')
          .select('id, name, folder_id')
          .eq('space_id', projectSpaceId),
        supabase
          .from('tasks')
          .select('id, title, list_id, status_id, assignee_id, completed_at, created_at, task_statuses(name)')
          .eq('space_id', projectSpaceId)
          .eq('is_archived', false),
      ]);

      if (foldersRes.error) throw foldersRes.error;
      if (listsRes.error) throw listsRes.error;
      if (tasksRes.error) throw tasksRes.error;

      const folders = foldersRes.data || [];
      const lists = listsRes.data || [];
      const allTasks = tasksRes.data || [];

      // Build list_id → folder_id map
      const listFolderMap = new Map<string, string | null>();
      for (const l of lists) {
        listFolderMap.set(l.id, l.folder_id);
      }

      // Completion helpers
      const isCompleted = (t: typeof allTasks[0]) => {
        const status = t.task_statuses as any;
        return status?.name?.toLowerCase() === 'completed';
      };

      const completedTasks = allTasks.filter(isCompleted);
      const totalCount = allTasks.length;
      const completedCount = completedTasks.length;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Group tasks by list_id
      const tasksByList = new Map<string, typeof allTasks>();
      for (const t of allTasks) {
        if (!t.list_id) continue;
        const arr = tasksByList.get(t.list_id) || [];
        arr.push(t);
        tasksByList.set(t.list_id, arr);
      }

      // Build sub-project entries
      const subProjects: SubProjectData[] = [];

      // Folders: aggregate tasks from all child lists
      const folderIds = new Set(folders.map(f => f.id));
      for (const folder of folders) {
        const childListIds = lists.filter(l => l.folder_id === folder.id).map(l => l.id);
        let folderTotal = 0;
        let folderCompleted = 0;
        for (const lid of childListIds) {
          const lt = tasksByList.get(lid) || [];
          folderTotal += lt.length;
          folderCompleted += lt.filter(isCompleted).length;
        }
        subProjects.push({
          id: folder.id,
          name: folder.name,
          icon: null,
          type: 'folder',
          totalTasks: folderTotal,
          completedTasks: folderCompleted,
          completionRate: folderTotal > 0 ? Math.round((folderCompleted / folderTotal) * 100) : 0,
        });
      }

      // Unfiled lists (no folder)
      const unfiledLists = lists.filter(l => !l.folder_id || !folderIds.has(l.folder_id));
      for (const list of unfiledLists) {
        const lt = tasksByList.get(list.id) || [];
        const listCompleted = lt.filter(isCompleted).length;
        subProjects.push({
          id: list.id,
          name: list.name,
          icon: null,
          type: 'list',
          totalTasks: lt.length,
          completedTasks: listCompleted,
          completionRate: lt.length > 0 ? Math.round((listCompleted / lt.length) * 100) : 0,
        });
      }

      // Fetch attachments
      const taskIds = allTasks.map(t => t.id);
      const taskTitleMap = new Map(allTasks.map(t => [t.id, t.title || 'Untitled']));
      let attachments: AttachmentData[] = [];
      if (taskIds.length > 0) {
        for (let i = 0; i < taskIds.length; i += 50) {
          const chunk = taskIds.slice(i, i + 50);
          const { data: atts } = await supabase
            .from('task_attachments')
            .select('id, file_name, file_size, file_path, file_type, task_id, created_at')
            .in('task_id', chunk)
            .order('created_at', { ascending: false });
          if (atts) {
            attachments.push(...atts.map(a => ({
              id: a.id,
              fileName: a.file_name,
              fileSize: a.file_size,
              filePath: a.file_path,
              fileType: a.file_type,
              taskTitle: taskTitleMap.get(a.task_id) || 'Untitled',
              createdAt: a.created_at,
            })));
          }
        }
      }

      // Tasks by assignee
      const assigneeCounts = new Map<string, number>();
      for (const t of allTasks) {
        const id = t.assignee_id || '__unassigned';
        assigneeCounts.set(id, (assigneeCounts.get(id) || 0) + 1);
      }

      const realIds = Array.from(assigneeCounts.keys()).filter(id => id !== '__unassigned');
      let nameMap = new Map<string, string>();
      if (realIds.length > 0) {
        const { data: employees } = await supabase
          .from('employees')
          .select('id, profiles!inner(full_name)')
          .in('id', realIds);
        if (employees) {
          for (const emp of employees) {
            const profile = emp.profiles as any;
            nameMap.set(emp.id, profile?.full_name || 'Unknown');
          }
        }
      }

      const tasksByAssignee: AssigneeData[] = Array.from(assigneeCounts.entries())
        .map(([id, count]) => ({
          name: id === '__unassigned' ? 'Unassigned' : (nameMap.get(id) || 'Unknown'),
          count,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        totalTasks: totalCount,
        completedTasks: completedCount,
        completionRate,
        subProjects,
        attachments,
        tasksByAssignee,
      };
    },
    enabled: !!projectSpaceId,
    staleTime: 60_000,
  });
};
