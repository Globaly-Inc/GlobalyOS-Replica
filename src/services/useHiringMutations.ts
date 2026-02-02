/**
 * Hiring & Recruitment Mutation Hooks
 * All write operations for the ATS system
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCurrentEmployee } from './useCurrentEmployee';
import { toast } from 'sonner';
import type {
  CreateJobInput,
  UpdateJobInput,
  CreateCandidateInput,
  CreateApplicationInput,
  CreateAssignmentTemplateInput,
  AssignAssignmentInput,
  SubmitAssignmentInput,
  ScheduleInterviewInput,
  SubmitScorecardInput,
  CreateOfferInput,
  ApplicationStage,
  JobStatus,
  OfferStatus,
  HiringActivityAction,
} from '@/types/hiring';
import { generateJobSlug, generateSecureToken } from '@/types/hiring';

// ============================================
// HELPER FUNCTIONS
// ============================================

async function logHiringActivity(
  organizationId: string,
  entityType: string,
  entityId: string,
  action: HiringActivityAction,
  actorId: string | null,
  details: Record<string, unknown> = {}
) {
  await (supabase.from('hiring_activity_logs') as any).insert({
    organization_id: organizationId,
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actorId,
    details,
  });
}

// ============================================
// JOB MUTATIONS
// ============================================

export function useCreateJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      // Generate unique slug
      let slug = generateJobSlug(input.title);
      let counter = 0;
      let uniqueSlug = slug;

      // Check for existing slugs and make unique
      while (true) {
        const { data: existing } = await supabase
          .from('jobs')
          .select('id')
          .eq('organization_id', currentOrg.id)
          .eq('slug', uniqueSlug)
          .maybeSingle();

        if (!existing) break;
        counter++;
        uniqueSlug = `${slug}-${counter}`;
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert({
          organization_id: currentOrg.id,
          slug: uniqueSlug,
          created_by: currentEmployee?.id || null,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logHiringActivity(
        currentOrg.id,
        'job',
        data.id,
        'job_created',
        currentEmployee?.id || null,
        { title: input.title }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'jobs'] });
      toast.success('Job created successfully');
    },
    onError: (error) => {
      console.error('Error creating job:', error);
      toast.error('Failed to create job');
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ jobId, input }: { jobId: string; input: UpdateJobInput }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('jobs')
        .update(input)
        .eq('id', jobId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'jobs'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'job', currentOrg?.id, data.id] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'job', currentOrg?.id, data.slug] });
      toast.success('Job updated successfully');
    },
    onError: (error) => {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    },
  });
}

export function useApproveJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'approved' as JobStatus,
          approved_by: currentEmployee?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'submitted')
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'job',
        data.id,
        'job_approved',
        currentEmployee?.id || null,
        { title: data.title }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'jobs'] });
      toast.success('Job approved successfully');
    },
    onError: (error) => {
      console.error('Error approving job:', error);
      toast.error('Failed to approve job');
    },
  });
}

export function usePublishJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      jobId,
      isInternal,
      isPublic,
    }: {
      jobId: string;
      isInternal: boolean;
      isPublic: boolean;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'open' as JobStatus,
          is_internal_visible: isInternal,
          is_public_visible: isPublic,
          published_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'job',
        data.id,
        'job_published',
        currentEmployee?.id || null,
        { is_internal: isInternal, is_public: isPublic }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'jobs'] });
      toast.success('Job published successfully');
    },
    onError: (error) => {
      console.error('Error publishing job:', error);
      toast.error('Failed to publish job');
    },
  });
}

export function useCloseJob() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({ jobId, reason }: { jobId: string; reason?: string }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('jobs')
        .update({
          status: 'closed' as JobStatus,
          closed_at: new Date().toISOString(),
          closed_reason: reason || null,
        })
        .eq('id', jobId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'job',
        data.id,
        'job_closed',
        currentEmployee?.id || null,
        { reason }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'jobs'] });
      toast.success('Job closed successfully');
    },
    onError: (error) => {
      console.error('Error closing job:', error);
      toast.error('Failed to close job');
    },
  });
}

// ============================================
// CANDIDATE MUTATIONS
// ============================================

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateCandidateInput) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('candidates')
        .insert({
          organization_id: currentOrg.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'candidate',
        data.id,
        'candidate_created',
        currentEmployee?.id || null,
        { name: input.name, email: input.email }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'candidates'] });
      toast.success('Candidate created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating candidate:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('A candidate with this email already exists');
      } else {
        toast.error('Failed to create candidate');
      }
    },
  });
}

// ============================================
// APPLICATION MUTATIONS
// ============================================

export function useCreateApplication() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateApplicationInput) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await (supabase
        .from('candidate_applications') as any)
        .insert({
          organization_id: currentOrg.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'application',
        data.id,
        'application_created',
        currentEmployee?.id || null,
        { job_id: input.job_id }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'candidates'] });
      toast.success('Application submitted successfully');
    },
    onError: (error) => {
      console.error('Error creating application:', error);
      toast.error('Failed to submit application');
    },
  });
}

export function useUpdateApplicationStage() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      applicationId,
      stage,
    }: {
      applicationId: string;
      stage: ApplicationStage;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      // Get current stage for logging
      const { data: current } = await supabase
        .from('candidate_applications')
        .select('stage')
        .eq('id', applicationId)
        .single();

      const { data, error } = await supabase
        .from('candidate_applications')
        .update({
          stage,
          // If moving to hired or rejected, update status too
          ...(stage === 'hired' && { status: 'hired', hired_at: new Date().toISOString() }),
          ...(stage === 'rejected' && { status: 'rejected', rejected_at: new Date().toISOString(), rejected_by: currentEmployee?.id }),
        })
        .eq('id', applicationId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'application',
        data.id,
        'stage_changed',
        currentEmployee?.id || null,
        { from_stage: current?.stage, to_stage: stage }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'applications'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'candidates'] });
    },
    onError: (error) => {
      console.error('Error updating application stage:', error);
      toast.error('Failed to update stage');
    },
  });
}

// ============================================
// ASSIGNMENT MUTATIONS
// ============================================

export function useCreateAssignmentTemplate() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateAssignmentTemplateInput) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await (supabase
        .from('assignment_templates') as any)
        .insert({
          organization_id: currentOrg.id,
          created_by: currentEmployee?.id || null,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'assignment-templates'] });
      toast.success('Assignment template created successfully');
    },
    onError: (error) => {
      console.error('Error creating assignment template:', error);
      toast.error('Failed to create assignment template');
    },
  });
}

export function useAssignAssignment() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: AssignAssignmentInput) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const secureToken = generateSecureToken();

      const { data, error } = await (supabase
        .from('assignment_instances') as any)
        .insert({
          organization_id: currentOrg.id,
          secure_token: secureToken,
          assigned_by: currentEmployee?.id || null,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'assignment',
        data.id,
        'assignment_assigned',
        currentEmployee?.id || null,
        { title: input.title, deadline: input.deadline }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'assignment-instances'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'applications'] });
      toast.success('Assignment sent to candidate');
    },
    onError: (error) => {
      console.error('Error assigning assignment:', error);
      toast.error('Failed to assign assignment');
    },
  });
}

export function useSubmitAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      input,
    }: {
      token: string;
      input: SubmitAssignmentInput;
    }) => {
      // This is a public mutation - no org check needed
      const { data, error } = await (supabase
        .from('assignment_instances') as any)
        .update({
          submission_data: input.submission_data,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('secure_token', token)
        .in('status', ['assigned', 'in_progress'])
        .select()
        .single();

      if (error) throw error;

      // Log activity (we need org_id from the data)
      if (data) {
        await logHiringActivity(
          data.organization_id,
          'assignment',
          data.id,
          'assignment_submitted',
          null,
          { submitted_at: data.submitted_at }
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public', 'assignment'] });
      toast.success('Assignment submitted successfully!');
    },
    onError: (error) => {
      console.error('Error submitting assignment:', error);
      toast.error('Failed to submit assignment');
    },
  });
}

export function useReviewAssignment() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      assignmentId,
      rating,
      comments,
    }: {
      assignmentId: string;
      rating: number;
      comments?: string;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('assignment_instances')
        .update({
          rating,
          reviewer_comments: comments || null,
          reviewed_by: currentEmployee?.id,
          reviewed_at: new Date().toISOString(),
          status: 'reviewed',
        })
        .eq('id', assignmentId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'assignment',
        data.id,
        'assignment_reviewed',
        currentEmployee?.id || null,
        { rating, has_comments: !!comments }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'assignment-instances'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'applications'] });
      toast.success('Assignment reviewed successfully');
    },
    onError: (error) => {
      console.error('Error reviewing assignment:', error);
      toast.error('Failed to review assignment');
    },
  });
}

// ============================================
// INTERVIEW MUTATIONS
// ============================================

export function useScheduleInterview() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: ScheduleInterviewInput) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('hiring_interviews')
        .insert({
          organization_id: currentOrg.id,
          created_by: currentEmployee?.id || null,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'interview',
        data.id,
        'interview_scheduled',
        currentEmployee?.id || null,
        { scheduled_at: input.scheduled_at, type: input.interview_type }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'interviews'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'upcoming-interviews'] });
      toast.success('Interview scheduled successfully');
    },
    onError: (error) => {
      console.error('Error scheduling interview:', error);
      toast.error('Failed to schedule interview');
    },
  });
}

export function useSubmitScorecard() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: SubmitScorecardInput) => {
      if (!currentOrg?.id || !currentEmployee?.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await (supabase
        .from('interview_scorecards') as any)
        .upsert({
          organization_id: currentOrg.id,
          interview_id: input.interview_id,
          interviewer_id: currentEmployee.id,
          ratings: input.ratings,
          overall_rating: input.overall_rating,
          recommendation: input.recommendation,
          strengths: input.strengths,
          concerns: input.concerns,
          notes: input.notes,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'interview',
        input.interview_id,
        'scorecard_submitted',
        currentEmployee.id,
        { overall_rating: input.overall_rating, recommendation: input.recommendation }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'interviews'] });
      toast.success('Scorecard submitted successfully');
    },
    onError: (error) => {
      console.error('Error submitting scorecard:', error);
      toast.error('Failed to submit scorecard');
    },
  });
}

// ============================================
// OFFER MUTATIONS
// ============================================

export function useCreateOffer() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (input: CreateOfferInput) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('hiring_offers')
        .insert({
          organization_id: currentOrg.id,
          created_by: currentEmployee?.id || null,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'offer',
        data.id,
        'offer_created',
        currentEmployee?.id || null,
        { title: input.title, base_salary: input.base_salary }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'offer'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'applications'] });
      toast.success('Offer created successfully');
    },
    onError: (error) => {
      console.error('Error creating offer:', error);
      toast.error('Failed to create offer');
    },
  });
}

export function useApproveOffer() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async (offerId: string) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('hiring_offers')
        .update({
          status: 'approved' as OfferStatus,
          approved_by: currentEmployee?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'offer',
        data.id,
        'offer_approved',
        currentEmployee?.id || null,
        {}
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'offer'] });
      toast.success('Offer approved successfully');
    },
    onError: (error) => {
      console.error('Error approving offer:', error);
      toast.error('Failed to approve offer');
    },
  });
}

export function useRespondToOffer() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      offerId,
      accepted,
    }: {
      offerId: string;
      accepted: boolean;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('hiring_offers')
        .update({
          status: (accepted ? 'accepted' : 'declined') as OfferStatus,
          responded_at: new Date().toISOString(),
        })
        .eq('id', offerId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'offer',
        data.id,
        accepted ? 'offer_accepted' : 'offer_declined',
        currentEmployee?.id || null,
        {}
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hiring', 'offer'] });
      queryClient.invalidateQueries({ queryKey: ['hiring', 'applications'] });
      toast.success(data.status === 'accepted' ? 'Offer accepted!' : 'Offer declined');
    },
    onError: (error) => {
      console.error('Error responding to offer:', error);
      toast.error('Failed to respond to offer');
    },
  });
}

// ============================================
// PUBLIC APPLICATION (No auth required)
// ============================================

export function usePublicApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orgCode,
      jobId,
      candidate,
      cover_letter,
    }: {
      orgCode: string;
      jobId: string;
      candidate: {
        name: string;
        email: string;
        phone?: string;
        linkedin_url?: string;
      };
      cover_letter?: string;
    }) => {
      // First, get the organization by code
      const { data: org, error: orgError } = await (supabase
        .from('organizations') as any)
        .select('id')
        .eq('code', orgCode)
        .single();

      if (orgError || !org) throw new Error('Organization not found');

      // Check if candidate exists
      let candidateId: string;
      const { data: existingCandidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('organization_id', org.id)
        .eq('email', candidate.email)
        .maybeSingle();

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        // Create new candidate
        const { data: newCandidate, error: candError } = await supabase
          .from('candidates')
          .insert({
            organization_id: org.id,
            email: candidate.email,
            name: candidate.name,
            phone: candidate.phone || null,
            linkedin_url: candidate.linkedin_url || null,
            source: 'careers_site',
          })
          .select()
          .single();

        if (candError) throw candError;
        candidateId = newCandidate.id;
      }

      // Create the application
      const { data: application, error: appError } = await (supabase
        .from('candidate_applications') as any)
        .insert({
          organization_id: org.id,
          candidate_id: candidateId,
          job_id: jobId,
          stage: 'applied',
          status: 'active',
          cover_letter: cover_letter || null,
          source_of_application: 'careers_site',
        })
        .select()
        .single();

      if (appError) throw appError;

      return application;
    },
    onSuccess: () => {
      toast.success('Application submitted successfully!');
    },
    onError: (error: Error) => {
      console.error('Error submitting application:', error);
      if (error.message?.includes('duplicate')) {
        toast.error('You have already applied for this position');
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    },
  });
}

// ============================================
// HIRE CONVERSION
// ============================================

export function useConvertToEmployee() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();

  return useMutation({
    mutationFn: async ({
      applicationId,
      employeeData,
    }: {
      applicationId: string;
      employeeData: {
        position?: string;
        department?: string;
        office_id?: string;
        manager_id?: string;
        join_date?: string;
        salary?: number;
      };
    }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      // Get the application with candidate info
      const { data: application, error: appError } = await supabase
        .from('candidate_applications')
        .select(`
          *,
          candidate:candidates(*),
          job:jobs(title)
        `)
        .eq('id', applicationId)
        .eq('organization_id', currentOrg.id)
        .single();

      if (appError || !application) throw new Error('Application not found');

      // This would typically call an edge function to:
      // 1. Create a user account
      // 2. Create an employee record
      // 3. Link candidate to employee
      // 4. Trigger boarding workflow
      // For now, we'll just update the application status

      const { data, error } = await supabase
        .from('candidate_applications')
        .update({
          status: 'hired',
          stage: 'hired',
          hired_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      await logHiringActivity(
        currentOrg.id,
        'application',
        data.id,
        'hired',
        currentEmployee?.id || null,
        { job_title: (application as any).job?.title }
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hiring'] });
      toast.success('Candidate converted to employee successfully');
    },
    onError: (error) => {
      console.error('Error converting to employee:', error);
      toast.error('Failed to convert candidate to employee');
    },
  });
}
