import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';

export const useTaskAttachments = (taskId: string | undefined) => {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!taskId,
  });
};

export const useUploadTaskAttachment = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ taskId, organizationId, file }: { taskId: string; organizationId: string; file: File }) => {
      const filePath = `${organizationId}/${taskId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          organization_id: currentOrg!.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: employee?.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Log attachment upload activity
      if (employee?.id && currentOrg?.id) {
        await supabase.from('task_activity_logs').insert({
          organization_id: currentOrg.id,
          task_id: taskId,
          actor_id: employee.id,
          action_type: 'attachment_added',
          new_value: { file_name: file.name } as import('@/integrations/supabase/types').Json,
        });
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['task-attachments', data.task_id] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', data.task_id] });
    },
  });
};

export const useDeleteTaskAttachment = () => {
  const qc = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ id, taskId, filePath, fileName }: { id: string; taskId: string; filePath: string; fileName?: string }) => {
      await supabase.storage.from('task-attachments').remove([filePath]);
      const { error } = await supabase.from('task_attachments').delete().eq('id', id);
      if (error) throw error;

      // Log attachment removal activity
      if (employee?.id && currentOrg?.id) {
        await supabase.from('task_activity_logs').insert({
          organization_id: currentOrg.id,
          task_id: taskId,
          actor_id: employee.id,
          action_type: 'attachment_removed',
          old_value: fileName ? { file_name: fileName } as import('@/integrations/supabase/types').Json : null,
        });
      }

      return taskId;
    },
    onSuccess: (taskId) => {
      qc.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      qc.invalidateQueries({ queryKey: ['task-activity-logs', taskId] });
    },
  });
};
