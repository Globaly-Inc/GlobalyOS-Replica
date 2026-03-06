/**
 * Project Dashboard data hook
 * Fetches and computes dashboard metrics for a depth-0 project space
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TaskSpaceRow } from '@/types/task';
import type { TaskSpaceRow } from '@/types/task';

interface SubProjectData {
  id: string;
  name: string;
  icon: string | null;
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

function collectDescendantIds(spaceId: string, spaces: TaskSpaceRow[]): string[] {
  const ids: string[] = [spaceId];
  const children = spaces.filter(s => s.parent_id === spaceId);
  for (const child of children) {
    ids.push(...collectDescendantIds(child.id, spaces));
  }
  return ids;
}

export const useProjectDashboardData = (
  projectSpaceId: string | null,
  spaces: TaskSpaceRow[],
) => {
  const directChildren = spaces.filter(s => s.parent_id === projectSpaceId);
  const allDescendantIds = projectSpaceId ? collectDescendantIds(projectSpaceId, spaces) : [];

  return useQuery({
    queryKey: ['project-dashboard', projectSpaceId, allDescendantIds.length],
    queryFn: async (): Promise<ProjectDashboardData> => {
      if (!projectSpaceId || allDescendantIds.length === 0) {
        return { totalTasks: 0, completedTasks: 0, completionRate: 0, subProjects: [], attachments: [], tasksByAssignee: [] };
      }

      // Fetch all non-archived tasks across the project hierarchy
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, title, space_id, status_id, assignee_id, completed_at, created_at, task_statuses(name)')
        .in('space_id', allDescendantIds)
        .eq('is_archived', false);

      if (error) throw error;

      const allTasks = tasks || [];
      const completedTasks = allTasks.filter(t => {
        const status = t.task_statuses as any;
        return status?.name?.toLowerCase() === 'completed';
      });

      // Completion rate
      const totalCount = allTasks.length;
      const completedCount = completedTasks.length;
      const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      // Sub-projects
      const subProjects: SubProjectData[] = directChildren.map(child => {
        const childIds = collectDescendantIds(child.id, spaces);
        const childTasks = allTasks.filter(t => childIds.includes(t.space_id));
        const childCompleted = childTasks.filter(t => {
          const status = t.task_statuses as any;
          return status?.name?.toLowerCase() === 'completed';
        });
        return {
          id: child.id,
          name: child.name,
          icon: child.icon,
          totalTasks: childTasks.length,
          completedTasks: childCompleted.length,
          completionRate: childTasks.length > 0 ? Math.round((childCompleted.length / childTasks.length) * 100) : 0,
        };
      });

      // Fetch attachments for all tasks in the project
      const taskIds = allTasks.map(t => t.id);
      const taskTitleMap = new Map(allTasks.map(t => [t.id, t.title || 'Untitled']));
      let attachments: AttachmentData[] = [];
      if (taskIds.length > 0) {
        // Batch fetch in chunks of 50
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
      const assigneeIds = new Set<string>();
      const assigneeCounts = new Map<string, number>();
      for (const t of allTasks) {
        const id = t.assignee_id || '__unassigned';
        assigneeIds.add(id);
        assigneeCounts.set(id, (assigneeCounts.get(id) || 0) + 1);
      }

      // Fetch assignee names
      const realIds = Array.from(assigneeIds).filter(id => id !== '__unassigned');
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
    enabled: !!projectSpaceId && allDescendantIds.length > 0,
    staleTime: 60_000,
  });
};
