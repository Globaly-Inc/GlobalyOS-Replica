import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ErrorSupportLink {
  id: string;
  error_log_id: string;
  support_request_id: string;
  linked_by: string | null;
  notes: string | null;
  created_at: string;
  // Joined fields
  support_requests?: {
    id: string;
    title: string;
    type: string;
    status: string;
    priority: string;
    created_at: string;
    resolved_at: string | null;
  };
  user_error_logs?: {
    id: string;
    error_message: string;
    severity: string;
    error_type: string;
    status: string;
    created_at: string;
  };
}

/**
 * Get support tickets linked to an error log
 */
export const useErrorLinkedTickets = (errorLogId: string | undefined) => {
  return useQuery({
    queryKey: ['error-linked-tickets', errorLogId],
    queryFn: async () => {
      if (!errorLogId) return [];
      
      const { data, error } = await supabase
        .from('error_support_links')
        .select(`
          *,
          support_requests(id, title, type, status, priority, created_at, resolved_at)
        `)
        .eq('error_log_id', errorLogId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ErrorSupportLink[];
    },
    enabled: !!errorLogId,
  });
};

/**
 * Get error logs linked to a support ticket
 */
export const useTicketLinkedErrors = (supportRequestId: string | undefined) => {
  return useQuery({
    queryKey: ['ticket-linked-errors', supportRequestId],
    queryFn: async () => {
      if (!supportRequestId) return [];
      
      const { data, error } = await supabase
        .from('error_support_links')
        .select(`
          *,
          user_error_logs(id, error_message, severity, error_type, status, created_at)
        `)
        .eq('support_request_id', supportRequestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as ErrorSupportLink[];
    },
    enabled: !!supportRequestId,
  });
};

/**
 * Link an error log to a support ticket
 */
export const useLinkErrorToTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      errorLogId, 
      supportRequestId,
      notes 
    }: { 
      errorLogId: string; 
      supportRequestId: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('error_support_links')
        .insert({
          error_log_id: errorLogId,
          support_request_id: supportRequestId,
          linked_by: user?.id,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also update the direct link on error log for quick access
      await supabase
        .from('user_error_logs')
        .update({ linked_support_request_id: supportRequestId })
        .eq('id', errorLogId);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['error-linked-tickets', variables.errorLogId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-linked-errors', variables.supportRequestId] });
      queryClient.invalidateQueries({ queryKey: ['error-log', variables.errorLogId] });
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
    },
  });
};

/**
 * Unlink an error log from a support ticket
 */
export const useUnlinkErrorFromTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      errorLogId, 
      supportRequestId 
    }: { 
      errorLogId: string; 
      supportRequestId: string;
    }) => {
      const { error } = await supabase
        .from('error_support_links')
        .delete()
        .eq('error_log_id', errorLogId)
        .eq('support_request_id', supportRequestId);

      if (error) throw error;
      
      // Check if there are other links, if not clear the direct link
      const { data: remainingLinks } = await supabase
        .from('error_support_links')
        .select('id')
        .eq('error_log_id', errorLogId)
        .limit(1);
      
      if (!remainingLinks?.length) {
        await supabase
          .from('user_error_logs')
          .update({ linked_support_request_id: null })
          .eq('id', errorLogId);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['error-linked-tickets', variables.errorLogId] });
      queryClient.invalidateQueries({ queryKey: ['ticket-linked-errors', variables.supportRequestId] });
      queryClient.invalidateQueries({ queryKey: ['error-log', variables.errorLogId] });
      queryClient.invalidateQueries({ queryKey: ['error-logs'] });
    },
  });
};

/**
 * Create a support ticket from an error log
 */
export const useCreateTicketFromError = () => {
  const queryClient = useQueryClient();
  const linkMutation = useLinkErrorToTicket();
  
  return useMutation({
    mutationFn: async ({ 
      errorLogId,
      title,
      description,
      priority = 'high'
    }: { 
      errorLogId: string;
      title: string;
      description: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Get the error log for context
      const { data: errorLog } = await supabase
        .from('user_error_logs')
        .select('page_url, organization_id')
        .eq('id', errorLogId)
        .single();
      
      // Create the support ticket using type assertion
      const insertData = {
        user_id: user.id,
        organization_id: errorLog?.organization_id || null,
        type: 'bug',
        status: 'open',
        priority,
        title,
        description,
        page_url: errorLog?.page_url || window.location.href,
        browser_info: navigator.userAgent,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      };

      const { data: ticket, error } = await supabase
        .from('support_requests')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      
      // Link the error to the new ticket
      await linkMutation.mutateAsync({
        errorLogId,
        supportRequestId: ticket.id,
        notes: 'Auto-linked from error log'
      });
      
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
    },
  });
};
