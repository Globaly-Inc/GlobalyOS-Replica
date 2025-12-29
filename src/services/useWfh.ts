/**
 * WFH (Work From Home) request service hooks
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "./useCurrentEmployee";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errorUtils";
import { WfhRequest, WfhRequestWithEmployee, WorkLocation } from "@/types/wfh";

// Fetch employee's work location
export const useEmployeeWorkLocation = (employeeId?: string) => {
  return useQuery({
    queryKey: ["employee-work-location", employeeId],
    queryFn: async () => {
      if (!employeeId) return 'office' as WorkLocation;
      
      const { data, error } = await supabase
        .from("employee_schedules")
        .select("work_location")
        .eq("employee_id", employeeId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return (data?.work_location as WorkLocation) || 'office';
    },
    enabled: !!employeeId,
  });
};

// Fetch pending WFH requests for approval (manager/HR)
export const usePendingWfhRequests = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ["pending-wfh-requests", currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      // Get all pending WFH requests
      const { data, error } = await supabase
        .from("wfh_requests")
        .select(`
          *,
          employee:employees!wfh_requests_employee_id_fkey(
            id,
            manager_id,
            profiles!inner(
              full_name,
              avatar_url
            )
          )
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as WfhRequestWithEmployee[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

// Fetch own pending WFH requests
export const useOwnPendingWfhRequests = () => {
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useQuery({
    queryKey: ["own-pending-wfh-requests", currentOrg?.id, currentEmployee?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !currentEmployee?.id) return [];

      const { data, error } = await supabase
        .from("wfh_requests")
        .select("*")
        .eq("employee_id", currentEmployee.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as WfhRequest[];
    },
    enabled: !!currentOrg?.id && !!currentEmployee?.id,
  });
};

// Check if employee has approved WFH for today
export const useHasApprovedWfhToday = (employeeId?: string) => {
  return useQuery({
    queryKey: ["has-approved-wfh-today", employeeId],
    queryFn: async () => {
      if (!employeeId) return false;
      
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from("wfh_requests")
        .select("id")
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .limit(1);

      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
    enabled: !!employeeId,
  });
};

// Fetch approved WFH days for a period
export const useWfhDays = (employeeId?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["wfh-days", employeeId, startDate, endDate],
    queryFn: async () => {
      if (!employeeId) return 0;

      let query = supabase
        .from("wfh_requests")
        .select("days_count")
        .eq("employee_id", employeeId)
        .eq("status", "approved");

      if (startDate) query = query.gte("start_date", startDate);
      if (endDate) query = query.lte("end_date", endDate);

      const { data, error } = await query;
      if (error) throw error;

      return data?.reduce((sum, r) => sum + (r.days_count || 0), 0) || 0;
    },
    enabled: !!employeeId,
  });
};

// Create WFH request
export const useCreateWfhRequest = () => {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (data: {
      start_date: string;
      end_date: string;
      days_count: number;
      reason?: string;
    }) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error("Missing organization or employee");
      }

      const { error } = await supabase.from("wfh_requests").insert({
        employee_id: currentEmployee.id,
        organization_id: currentOrg.id,
        ...data,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WFH request submitted");
      queryClient.invalidateQueries({ queryKey: ["pending-wfh-requests"] });
      queryClient.invalidateQueries({ queryKey: ["own-pending-wfh-requests"] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to submit WFH request');
      toast.error(message);
    },
  });
};

// Approve/Reject WFH request
export const useUpdateWfhRequest = () => {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      status 
    }: { 
      requestId: string; 
      status: 'approved' | 'rejected' 
    }) => {
      if (!currentEmployee?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("wfh_requests")
        .update({
          status,
          reviewed_by: currentEmployee.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`WFH request ${status}`);
      queryClient.invalidateQueries({ queryKey: ["pending-wfh-requests"] });
      queryClient.invalidateQueries({ queryKey: ["own-pending-wfh-requests"] });
      queryClient.invalidateQueries({ queryKey: ["wfh-days"] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update WFH request');
      toast.error(message);
    },
  });
};

// Cancel own WFH request
export const useCancelWfhRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("wfh_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("WFH request cancelled");
      queryClient.invalidateQueries({ queryKey: ["pending-wfh-requests"] });
      queryClient.invalidateQueries({ queryKey: ["own-pending-wfh-requests"] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to cancel WFH request');
      toast.error(message);
    },
  });
};

// Record remote attendance
export const useRemoteAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      latitude,
      longitude,
      locationName,
      earlyCheckoutReason,
    }: {
      action: 'check_in' | 'check_out';
      latitude: number;
      longitude: number;
      locationName?: string;
      earlyCheckoutReason?: string;
    }) => {
      const { data, error } = await supabase.rpc("record_remote_attendance", {
        _action: action,
        _user_latitude: latitude,
        _user_longitude: longitude,
        _location_name: locationName,
        _early_checkout_reason: earlyCheckoutReason || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to record attendance");
      }

      return result;
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'check_in' ? "Checked in successfully!" : "Checked out successfully!");
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-week"] });
      queryClient.invalidateQueries({ queryKey: ["check-in-status"] });
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to record attendance');
      toast.error(message);
    },
  });
};
