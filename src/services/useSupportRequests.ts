import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { 
  SupportRequest, 
  CreateSupportRequestInput, 
  UpdateSupportRequestInput,
  SupportRequestStatus,
  SupportRequestPriority
} from '@/types/support';
import { toast } from 'sonner';

// Fetch all support requests (for super admin)
export const useAllSupportRequests = () => {
  return useQuery({
    queryKey: ['support-requests', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_requests')
        .select(`
          *,
          organizations (name, slug)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately for each unique user_id
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(request => ({
        ...request,
        profiles: profileMap.get(request.user_id) || null,
      })) as SupportRequest[];
      return data as SupportRequest[];
    },
  });
};

// Fetch user's own support requests
export const useUserSupportRequests = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['support-requests', 'user', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('support_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SupportRequest[];
    },
    enabled: !!user?.id,
  });
};

// Create support request
export const useCreateSupportRequest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (input: CreateSupportRequestInput) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          user_id: user.id,
          organization_id: currentOrg?.id || null,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      toast.success('Request submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit request: ${error.message}`);
    },
  });
};

// Update support request (for super admin)
export const useUpdateSupportRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateSupportRequestInput & { id: string }) => {
      const updateData: Record<string, unknown> = { ...input };
      
      // If status is being set to resolved, set resolved_at
      if (input.status === 'resolved' && !input.resolved_at) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('support_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      toast.success('Request updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
};

// Delete support request (for super admin)
export const useDeleteSupportRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('support_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-requests'] });
      toast.success('Request deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
};

// AI improve content
export const useImproveContent = () => {
  return useMutation({
    mutationFn: async (input: { type: string; title: string; description: string; page_url: string }) => {
      const { data, error } = await supabase.functions.invoke('improve-support-content', {
        body: input,
      });

      if (error) throw error;
      return data as { improved_description: string; suggested_priority: SupportRequestPriority };
    },
  });
};

// Get browser info
export const getBrowserInfo = (): string => {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let version = '';

  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    version = ua.split('Firefox/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    version = ua.split('Edg/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Chrome/')) {
    browser = 'Chrome';
    version = ua.split('Chrome/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browser = 'Safari';
    version = ua.split('Version/')[1]?.split(' ')[0] || '';
  }

  return `${browser} ${version}`.trim();
};

// Get device type
export const getDeviceType = (): string => {
  const ua = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  
  let os = 'Unknown OS';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  const deviceType = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop';
  
  return `${deviceType} / ${os}`;
};

// Upload screenshot
export const uploadScreenshot = async (file: File): Promise<string | null> => {
  const fileName = `${Date.now()}-${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('support-screenshots')
    .upload(fileName, file);

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('support-screenshots')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
};
