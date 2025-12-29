import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface EmploymentType {
  id: string;
  organization_id: string;
  name: string;
  label: string;
  description: string | null;
  is_active: boolean;
  is_system: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const useEmploymentTypes = (activeOnly = true) => {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ["employment-types", currentOrg?.id, activeOnly],
    queryFn: async () => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from("employment_types")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("display_order");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EmploymentType[];
    },
    enabled: !!currentOrg?.id,
  });
};

export const useCreateEmploymentType = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (data: { name: string; label: string; description?: string }) => {
      if (!currentOrg?.id) throw new Error("No organization selected");

      // Get the max display_order
      const { data: existing } = await supabase
        .from("employment_types")
        .select("display_order")
        .eq("organization_id", currentOrg.id)
        .order("display_order", { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.display_order || 0) + 1;

      const { data: result, error } = await supabase
        .from("employment_types")
        .insert({
          organization_id: currentOrg.id,
          name: data.name.toLowerCase().replace(/\s+/g, '_'),
          label: data.label,
          description: data.description || null,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employment-types"] });
      toast.success("Employment type created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create employment type");
    },
  });
};

export const useUpdateEmploymentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; label?: string; description?: string; is_active?: boolean; display_order?: number }) => {
      const updateData: any = { ...data };
      if (data.name) {
        updateData.name = data.name.toLowerCase().replace(/\s+/g, '_');
      }

      const { data: result, error } = await supabase
        .from("employment_types")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employment-types"] });
      toast.success("Employment type updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update employment type");
    },
  });
};

export const useDeleteEmploymentType = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employment_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employment-types"] });
      toast.success("Employment type deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete employment type");
    },
  });
};
