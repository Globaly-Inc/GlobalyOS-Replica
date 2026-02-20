import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface CallRecording {
  id: string;
  organization_id: string;
  phone_number_id: string | null;
  call_sid: string;
  recording_sid: string | null;
  recording_url: string | null;
  duration_seconds: number;
  status: string;
  direction: string;
  from_number: string | null;
  to_number: string | null;
  transcription_text: string | null;
  transcription_status: string;
  ai_summary: string | null;
  ai_summary_generated_at: string | null;
  ai_topics: string[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CallRecordingSettings {
  id: string;
  organization_id: string;
  auto_record_all: boolean;
  auto_record_inbound: boolean;
  auto_record_outbound: boolean;
  auto_transcribe: boolean;
  auto_summarize: boolean;
  retention_days: number;
}

export function useCallRecordings(phoneNumberId?: string) {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['call-recordings', currentOrg?.id, phoneNumberId],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      let query = supabase
        .from('call_recordings')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (phoneNumberId) query = query.eq('phone_number_id', phoneNumberId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CallRecording[];
    },
  });
}

export function useCallRecordingSettings() {
  const { currentOrg } = useOrganization();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['call-recording-settings', currentOrg?.id],
    enabled: !!currentOrg?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_recording_settings')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .maybeSingle();
      if (error) throw error;
      return data as CallRecordingSettings | null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (settings: Partial<CallRecordingSettings>) => {
      const orgId = currentOrg!.id;
      const { data: existing } = await supabase
        .from('call_recording_settings')
        .select('id')
        .eq('organization_id', orgId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('call_recording_settings')
          .update(settings as any)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('call_recording_settings')
          .insert({ organization_id: orgId, ...settings } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-recording-settings'] });
      toast.success('Recording settings saved');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return { settings: query.data, isLoading: query.isLoading, updateSettings: updateMutation };
}

export function useGenerateCallSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (recordingId: string) => {
      const { data, error } = await supabase.functions.invoke('call-ai-summary', {
        body: { recording_id: recordingId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['call-recordings'] });
      toast.success('AI summary generated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate summary'),
  });
}
