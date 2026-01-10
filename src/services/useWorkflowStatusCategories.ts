import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ParentTaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold';

export interface WorkflowTaskStatusCustom {
  id: string;
  template_id: string;
  organization_id: string;
  name: string;
  parent_status: ParentTaskStatus;
  color: string | null;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTaskCategoryCustom {
  id: string;
  template_id: string;
  organization_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ===================== Task Statuses =====================

export const useWorkflowTaskStatuses = (templateId: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-task-statuses", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("workflow_task_statuses")
        .select("*")
        .eq("template_id", templateId)
        .order("parent_status")
        .order("sort_order");
      
      if (error) throw error;
      return data as WorkflowTaskStatusCustom[];
    },
    enabled: !!templateId,
  });
};

export const useAddWorkflowTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      organizationId: string;
      name: string;
      parentStatus: ParentTaskStatus;
      color?: string;
    }) => {
      const { data, error } = await supabase
        .from("workflow_task_statuses")
        .insert({
          template_id: params.templateId,
          organization_id: params.organizationId,
          name: params.name,
          parent_status: params.parentStatus,
          color: params.color || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-statuses", variables.templateId] });
      toast.success("Status added");
    },
    onError: (error) => {
      toast.error("Failed to add status: " + error.message);
    },
  });
};

export const useUpdateWorkflowTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      statusId: string;
      templateId: string;
      updates: Partial<{ name: string; parent_status: ParentTaskStatus; color: string }>;
    }) => {
      const { data, error } = await supabase
        .from("workflow_task_statuses")
        .update(params.updates)
        .eq("id", params.statusId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-statuses", variables.templateId] });
      toast.success("Status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });
};

export const useDeleteWorkflowTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { statusId: string; templateId: string }) => {
      const { error } = await supabase
        .from("workflow_task_statuses")
        .delete()
        .eq("id", params.statusId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-statuses", variables.templateId] });
      toast.success("Status deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete status: " + error.message);
    },
  });
};

// ===================== Task Categories =====================

export const useWorkflowTaskCategories = (templateId: string | undefined) => {
  return useQuery({
    queryKey: ["workflow-task-categories", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("workflow_task_categories")
        .select("*")
        .eq("template_id", templateId)
        .order("sort_order");
      
      if (error) throw error;
      return data as WorkflowTaskCategoryCustom[];
    },
    enabled: !!templateId,
  });
};

export const useAddWorkflowTaskCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      organizationId: string;
      name: string;
      emoji: string;
    }) => {
      const { data, error } = await supabase
        .from("workflow_task_categories")
        .insert({
          template_id: params.templateId,
          organization_id: params.organizationId,
          name: params.name,
          emoji: params.emoji,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-categories", variables.templateId] });
      toast.success("Category added");
    },
    onError: (error) => {
      toast.error("Failed to add category: " + error.message);
    },
  });
};

export const useUpdateWorkflowTaskCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      categoryId: string;
      templateId: string;
      updates: Partial<{ name: string; emoji: string }>;
    }) => {
      const { data, error } = await supabase
        .from("workflow_task_categories")
        .update(params.updates)
        .eq("id", params.categoryId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-categories", variables.templateId] });
      toast.success("Category updated");
    },
    onError: (error) => {
      toast.error("Failed to update category: " + error.message);
    },
  });
};

export const useDeleteWorkflowTaskCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { categoryId: string; templateId: string }) => {
      const { error } = await supabase
        .from("workflow_task_categories")
        .delete()
        .eq("id", params.categoryId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-categories", variables.templateId] });
      toast.success("Category deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete category: " + error.message);
    },
  });
};

// ===================== Seed Defaults =====================

export const useSeedWorkflowTaskDefaults = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { templateId: string; organizationId: string }) => {
      const { error } = await supabase.rpc("seed_workflow_task_defaults", {
        p_template_id: params.templateId,
        p_organization_id: params.organizationId,
      });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-statuses", variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-task-categories", variables.templateId] });
      toast.success("Default statuses and categories seeded");
    },
    onError: (error) => {
      toast.error("Failed to seed defaults: " + error.message);
    },
  });
};
