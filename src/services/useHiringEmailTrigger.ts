/**
 * Hiring Email Trigger Helper
 * Sends automated hiring notification emails via the edge function
 */

import { supabase } from '@/integrations/supabase/client';

interface TriggerEmailParams {
  organizationId: string;
  triggerType: string;
  candidateId?: string;
  applicationId?: string;
  jobId?: string;
  interviewId?: string;
  assignmentId?: string;
  offerId?: string;
}

/**
 * Fire-and-forget email trigger. Logs errors but never throws,
 * so it won't break the primary mutation flow.
 */
export async function triggerHiringEmail(params: TriggerEmailParams): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('send-hiring-notification', {
      body: {
        organization_id: params.organizationId,
        trigger_type: params.triggerType,
        candidate_id: params.candidateId,
        application_id: params.applicationId,
        job_id: params.jobId,
        interview_id: params.interviewId,
        assignment_id: params.assignmentId,
        offer_id: params.offerId,
      },
    });

    if (error) {
      console.warn(`[HiringEmail] Failed to send ${params.triggerType} email:`, error);
    } else {
      console.log(`[HiringEmail] ${params.triggerType} email triggered:`, data);
    }
  } catch (err) {
    console.warn(`[HiringEmail] Error triggering ${params.triggerType} email:`, err);
  }
}
