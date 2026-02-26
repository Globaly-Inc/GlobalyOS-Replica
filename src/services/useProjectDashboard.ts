/**
 * Project Dashboard data hook
 * Fetches and computes dashboard metrics for a depth-0 project space
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, subWeeks, format } from 'date-fns';
import type { TaskSpaceRow } from '@/types/task';

interface SubProjectData {
  id: string;
  name: string;
  icon: string | null;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

interface VelocityPoint {
  week: string;
  completed: number;
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
  velocity: VelocityPoint[];
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
        return { totalTasks: 0, completedTasks: 0, completionRate: 0, subProjects: [], velocity: [], tasksByAssignee: [] };
      }

      // Fetch all non-archived tasks across the project hierarchy
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('id, space_id, status_id, assignee_id, completed_at, created_at, task_statuses(name)')
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

      // Velocity — last 6 weeks
      const now = new Date();
      const velocityMap = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        velocityMap.set(format(weekStart, 'MMM d'), 0);
      }
      for (const t of completedTasks) {
        if (t.completed_at) {
          const weekStart = startOfWeek(new Date(t.completed_at), { weekStartsOn: 1 });
          const key = format(weekStart, 'MMM d');
          if (velocityMap.has(key)) {
            velocityMap.set(key, (velocityMap.get(key) || 0) + 1);
          }
        }
      }
      const velocity: VelocityPoint[] = Array.from(velocityMap.entries()).map(([week, completed]) => ({ week, completed }));

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
        velocity,
        tasksByAssignee,
      };
    },
    enabled: !!projectSpaceId && allDescendantIds.length > 0,
    staleTime: 60_000,
  });
};
