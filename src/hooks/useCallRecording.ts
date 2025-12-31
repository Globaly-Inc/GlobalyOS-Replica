import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from '@/services/useCall';
import { toast } from 'sonner';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  consentPending: boolean;
  consentGivenBy: string[];
}

export const useCallRecording = (callId: string | null) => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    consentPending: false,
    consentGivenBy: [],
  });
  
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIdRef = useRef<string | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Request recording consent from all participants
  const requestConsent = useCallback(async (participantIds: string[]) => {
    if (!callId || !currentOrg || !currentEmployee) return false;
    
    setState(prev => ({ ...prev, consentPending: true }));
    
    // In a real implementation, you would send a realtime notification
    // to all participants asking for their consent
    // For now, we'll assume consent is given immediately
    setState(prev => ({
      ...prev,
      consentPending: false,
      consentGivenBy: [currentEmployee.id],
    }));
    
    return true;
  }, [callId, currentOrg, currentEmployee]);
  
  // Start recording
  const startRecording = useCallback(async (stream: MediaStream) => {
    if (!callId || !currentOrg || !currentEmployee) {
      toast.error('Cannot start recording');
      return;
    }
    
    try {
      // Create recording entry in database
      const { data: recording, error } = await supabase
        .from('call_recordings')
        .insert({
          call_id: callId,
          organization_id: currentOrg.id,
          recorded_by: currentEmployee.id,
          storage_path: `call-recordings/${callId}/${Date.now()}.webm`,
          status: 'recording',
          consent_given_by: [currentEmployee.id],
        })
        .select()
        .single();
      
      if (error) throw error;
      
      recordingIdRef.current = recording.id;
      
      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
      };
      
      // Fallback if vp9 not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        await finalizeRecording();
      };
      
      // Start recording with 5 second chunks
      mediaRecorder.start(5000);
      
      // Start duration timer
      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTime) / 1000),
        }));
      }, 1000);
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
      }));
      
      toast.success('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  }, [callId, currentOrg, currentEmployee]);
  
  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      toast.info('Recording paused');
    }
  }, [state.isRecording, state.isPaused]);
  
  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      toast.info('Recording resumed');
    }
  }, [state.isRecording, state.isPaused]);
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
      }));
    }
  }, [state.isRecording]);
  
  // Finalize and upload recording
  const finalizeRecording = useCallback(async () => {
    if (!recordingIdRef.current || chunksRef.current.length === 0) return;
    
    try {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const fileName = `call-recordings/${callId}/${recordingIdRef.current}.webm`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('call-recordings')
        .upload(fileName, blob);
      
      if (uploadError) throw uploadError;
      
      // Update recording status
      const { error: updateError } = await supabase
        .from('call_recordings')
        .update({
          status: 'ready',
          storage_path: fileName,
          duration_seconds: state.duration,
          file_size_bytes: blob.size,
        })
        .eq('id', recordingIdRef.current);
      
      if (updateError) throw updateError;
      
      toast.success('Recording saved');
      
      // Trigger transcription edge function (async, don't wait)
      supabase.functions.invoke('transcribe-call', {
        body: { recording_id: recordingIdRef.current },
      }).catch(console.error);
      
    } catch (error) {
      console.error('Failed to save recording:', error);
      toast.error('Failed to save recording');
      
      // Mark as failed
      if (recordingIdRef.current) {
        await supabase
          .from('call_recordings')
          .update({ status: 'failed' })
          .eq('id', recordingIdRef.current);
      }
    } finally {
      chunksRef.current = [];
      recordingIdRef.current = null;
    }
  }, [callId, state.duration]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [state.isRecording]);
  
  return {
    ...state,
    requestConsent,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
};
