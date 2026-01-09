import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import type { WorkflowType, TriggerCondition } from "@/types/workflow";

// ============ Start Workflow Mutation ============

export function useStartWorkflow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      employeeId: string;
      templateId: string;
      targetDate: string;
      workflowType: "onboarding" | "offboarding";
    }) => {
      if (!currentOrg?.id) throw new Error("No organization found");

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: employee } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .single();

      // Call the RPC function to create workflow from template
      const { data: workflowId, error } = await supabase.rpc(
        "create_workflow_from_template",
        {
          p_employee_id: data.employeeId,
          p_organization_id: currentOrg.id,
          p_target_date: data.targetDate,
          p_workflow_type: data.workflowType,
          p_created_by: employee?.id || undefined,
        }
      );

      if (error) throw error;
      return workflowId;
    },
    onSuccess: () => {
      toast({ title: "Workflow started successfully" });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      queryClient.invalidateQueries({ queryKey: ["employee-workflows"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ============ Template Mutations ============

export function useAddWorkflowTemplate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organizationId: string;
      name: string;
      type: WorkflowType;
      description?: string;
    }) => {
      const { data: template, error } = await supabase
        .from("workflow_templates")
        .insert({
          organization_id: data.organizationId,
          name: data.name,
          type: data.type,
          description: data.description || null,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      return template;
    },
    onSuccess: () => {
      toast({ title: "Template created" });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateWorkflowTemplate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      updates: { name?: string; description?: string; is_default?: boolean };
    }) => {
      const { error } = await supabase
        .from("workflow_templates")
        .update(data.updates)
        .eq("id", data.templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template updated" });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteWorkflowTemplate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("workflow_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ============ Stage Mutations ============

export function useAddWorkflowStage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      templateId: string;
      organizationId: string;
      name: string;
      description?: string;
      color?: string;
      sortOrder: number;
    }) => {
      const { data: stage, error } = await supabase
        .from("workflow_stages")
        .insert({
          template_id: data.templateId,
          organization_id: data.organizationId,
          name: data.name,
          description: data.description || null,
          color: data.color || "#6366F1",
          sort_order: data.sortOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return stage;
    },
    onSuccess: () => {
      toast({ title: "Stage added" });
      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateWorkflowStage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      stageId: string;
      updates: { name?: string; description?: string; color?: string; sort_order?: number };
    }) => {
      const { error } = await supabase
        .from("workflow_stages")
        .update(data.updates)
        .eq("id", data.stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Stage updated" });
      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteWorkflowStage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stageId: string) => {
      // First, unassign all tasks from this stage
      await supabase
        .from("workflow_template_tasks")
        .update({ stage_id: null })
        .eq("stage_id", stageId);

      const { error } = await supabase
        .from("workflow_stages")
        .delete()
        .eq("id", stageId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Stage deleted" });
      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-template-tasks"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useReorderWorkflowStages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stages: { id: string; sort_order: number }[]) => {
      const updates = stages.map(stage => 
        supabase
          .from("workflow_stages")
          .update({ sort_order: stage.sort_order })
          .eq("id", stage.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
    },
  });
}

// ============ Trigger Mutations ============

export function useAddWorkflowTrigger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      organizationId: string;
      workflowType: string;
      triggerEvent: string;
      triggerField: string;
      triggerCondition: TriggerCondition;
      triggerValue?: string | null;
    }) => {
      const { data: trigger, error } = await supabase
        .from("workflow_triggers")
        .insert({
          organization_id: data.organizationId,
          workflow_type: data.workflowType,
          trigger_event: data.triggerEvent,
          trigger_field: data.triggerField,
          trigger_condition: data.triggerCondition,
          trigger_value: data.triggerValue || null,
          is_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      return trigger;
    },
    onSuccess: () => {
      toast({ title: "Trigger created" });
      queryClient.invalidateQueries({ queryKey: ["workflow-triggers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateWorkflowTrigger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      triggerId: string;
      updates: {
        trigger_field?: string;
        trigger_condition?: TriggerCondition;
        trigger_value?: string | null;
        is_enabled?: boolean;
      };
    }) => {
      const { error } = await supabase
        .from("workflow_triggers")
        .update(data.updates)
        .eq("id", data.triggerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Trigger updated" });
      queryClient.invalidateQueries({ queryKey: ["workflow-triggers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useToggleWorkflowTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { triggerId: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from("workflow_triggers")
        .update({ is_enabled: data.isEnabled })
        .eq("id", data.triggerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-triggers"] });
    },
  });
}

export function useDeleteWorkflowTrigger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (triggerId: string) => {
      const { error } = await supabase
        .from("workflow_triggers")
        .delete()
        .eq("id", triggerId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Trigger deleted" });
      queryClient.invalidateQueries({ queryKey: ["workflow-triggers"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ============ Seed Default Data ============

export function useSeedWorkflowData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await supabase.rpc("seed_default_workflow_data", {
        org_id: organizationId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-stages"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-triggers"] });
    },
  });
}
