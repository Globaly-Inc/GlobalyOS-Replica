/**
 * Hiring & Recruitment Service Hooks
 * Core query hooks for the ATS system
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type {
  Job,
  JobWithRelations,
  JobStage,
  Candidate,
  CandidateWithRelations,
  CandidateApplication,
  CandidateApplicationWithRelations,
  AssignmentTemplate,
  AssignmentInstance,
  AssignmentInstanceWithRelations,
  HiringInterview,
  HiringInterviewWithRelations,
  InterviewScorecard,
  HiringOffer,
  HiringActivityLog,
  HiringEmailTemplate,
  JobFilters,
  CandidateFilters,
  ApplicationFilters,
  HiringMetrics,
} from '@/types/hiring';

// ============================================
// JOBS
// ============================================

export function useJobs(filters?: JobFilters) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'jobs', currentOrg?.id, filters],
    queryFn: async (): Promise<JobWithRelations[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('jobs')
        .select(`
          *,
          department:departments(id, name),
          office:offices(id, name, city),
          hiring_manager:employees!jobs_hiring_manager_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          recruiter:employees!jobs_recruiter_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.department_id) {
        query = query.eq('department_id', filters.department_id);
      }

      if (filters?.office_id) {
        query = query.eq('office_id', filters.office_id);
      }

      if (filters?.hiring_manager_id) {
        query = query.eq('hiring_manager_id', filters.hiring_manager_id);
      }

      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as JobWithRelations[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function useJob(jobIdOrSlug: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'job', currentOrg?.id, jobIdOrSlug],
    queryFn: async (): Promise<JobWithRelations | null> => {
      if (!currentOrg?.id || !jobIdOrSlug) return null;

      // Determine if it's a UUID or slug
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobIdOrSlug);

      let query = supabase
        .from('jobs')
        .select(`
          *,
          department:departments(id, name),
          office:offices(id, name, city),
          hiring_manager:employees!jobs_hiring_manager_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          recruiter:employees!jobs_recruiter_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          )
        `)
        .eq('organization_id', currentOrg.id);

      if (isUuid) {
        query = query.eq('id', jobIdOrSlug);
      } else {
        query = query.eq('slug', jobIdOrSlug);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as JobWithRelations;
    },
    enabled: !!currentOrg?.id && !!jobIdOrSlug,
  });
}

export function useJobStages(jobId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'job-stages', currentOrg?.id, jobId],
    queryFn: async (): Promise<JobStage[]> => {
      if (!currentOrg?.id || !jobId) return [];

      const { data, error } = await supabase
        .from('job_stages')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('job_id', jobId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as JobStage[];
    },
    enabled: !!currentOrg?.id && !!jobId,
  });
}

// ============================================
// CANDIDATES
// ============================================

export function useCandidates(filters?: CandidateFilters) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'candidates', currentOrg?.id, filters],
    queryFn: async (): Promise<CandidateWithRelations[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('candidates')
        .select(`
          *,
          employee:employees(
            id, position, department, user_id,
            profiles:profiles(full_name, avatar_url)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (filters?.source) {
        if (Array.isArray(filters.source)) {
          query = query.in('source', filters.source);
        } else {
          query = query.eq('source', filters.source);
        }
      }

      if (filters?.tags?.length) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as CandidateWithRelations[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function useCandidate(candidateId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'candidate', currentOrg?.id, candidateId],
    queryFn: async (): Promise<CandidateWithRelations | null> => {
      if (!currentOrg?.id || !candidateId) return null;

      const { data, error } = await supabase
        .from('candidates')
        .select(`
          *,
          employee:employees(
            id, position, department, user_id,
            profiles:profiles(full_name, avatar_url)
          ),
          candidate_applications(
            *,
            job:jobs(id, title, slug, status)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('id', candidateId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as CandidateWithRelations;
    },
    enabled: !!currentOrg?.id && !!candidateId,
  });
}

// ============================================
// APPLICATIONS
// ============================================

export function useApplications(filters?: ApplicationFilters) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'applications', currentOrg?.id, filters],
    queryFn: async (): Promise<CandidateApplicationWithRelations[]> => {
      if (!currentOrg?.id) return [];

      let query = supabase
        .from('candidate_applications')
        .select(`
          *,
          candidate:candidates(id, name, email, phone, location, avatar_url, source, employee_id),
          job:jobs(id, title, slug, status)
        `)
        .eq('organization_id', currentOrg.id)
        .order('created_at', { ascending: false });

      if (filters?.job_id) {
        query = query.eq('job_id', filters.job_id);
      }

      if (filters?.stage) {
        if (Array.isArray(filters.stage)) {
          query = query.in('stage', filters.stage);
        } else {
          query = query.eq('stage', filters.stage);
        }
      }

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters?.is_internal !== undefined) {
        query = query.eq('is_internal', filters.is_internal);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as CandidateApplicationWithRelations[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function useApplication(applicationId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'application', currentOrg?.id, applicationId],
    queryFn: async (): Promise<CandidateApplicationWithRelations | null> => {
      if (!currentOrg?.id || !applicationId) return null;

      const { data, error } = await supabase
        .from('candidate_applications')
        .select(`
          *,
          candidate:candidates(*),
          job:jobs(*),
          assignment_instances(*),
          hiring_interviews(*),
          hiring_offers(*)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('id', applicationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as CandidateApplicationWithRelations;
    },
    enabled: !!currentOrg?.id && !!applicationId,
  });
}

// ============================================
// ASSIGNMENTS
// ============================================

export function useAssignmentTemplates() {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'assignment-templates', currentOrg?.id],
    queryFn: async (): Promise<AssignmentTemplate[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('assignment_templates')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as AssignmentTemplate[];
    },
    enabled: !!currentOrg?.id,
  });
}

export function useAssignmentInstances(applicationId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'assignment-instances', currentOrg?.id, applicationId],
    queryFn: async (): Promise<AssignmentInstanceWithRelations[]> => {
      if (!currentOrg?.id || !applicationId) return [];

      const { data, error } = await supabase
        .from('assignment_instances')
        .select(`
          *,
          template:assignment_templates(id, name, type),
          reviewer:employees!assignment_instances_reviewed_by_fkey(
            id,
            profiles:profiles(full_name, avatar_url)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('candidate_application_id', applicationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as AssignmentInstanceWithRelations[];
    },
    enabled: !!currentOrg?.id && !!applicationId,
  });
}

// ============================================
// INTERVIEWS
// ============================================

export function useInterviews(applicationId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'interviews', currentOrg?.id, applicationId],
    queryFn: async (): Promise<HiringInterviewWithRelations[]> => {
      if (!currentOrg?.id || !applicationId) return [];

      const { data, error } = await supabase
        .from('hiring_interviews')
        .select(`
          *,
          interview_scorecards(*)
        `)
        .eq('organization_id', currentOrg.id)
        .eq('application_id', applicationId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as HiringInterviewWithRelations[];
    },
    enabled: !!currentOrg?.id && !!applicationId,
  });
}

export function useUpcomingInterviews(limit: number = 10) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'upcoming-interviews', currentOrg?.id, limit],
    queryFn: async (): Promise<HiringInterviewWithRelations[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('hiring_interviews')
        .select(`
          *,
          candidate_application:candidate_applications(
            id,
            candidate:candidates(id, name, email, avatar_url),
            job:jobs(id, title, slug)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as HiringInterviewWithRelations[];
    },
    enabled: !!currentOrg?.id,
  });
}

// ============================================
// OFFERS
// ============================================

export function useOffer(applicationId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'offer', currentOrg?.id, applicationId],
    queryFn: async (): Promise<HiringOffer | null> => {
      if (!currentOrg?.id || !applicationId) return null;

      const { data, error } = await supabase
        .from('hiring_offers')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as HiringOffer | null;
    },
    enabled: !!currentOrg?.id && !!applicationId,
  });
}

// ============================================
// ACTIVITY LOGS
// ============================================

export function useHiringActivityLog(entityType: string, entityId: string | undefined) {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'activity-log', currentOrg?.id, entityType, entityId],
    queryFn: async (): Promise<HiringActivityLog[]> => {
      if (!currentOrg?.id || !entityId) return [];

      const { data, error } = await supabase
        .from('hiring_activity_logs')
        .select(`
          *,
          actor:employees!hiring_activity_logs_actor_id_fkey(
            id, user_id,
            profiles:profiles(full_name, avatar_url)
          )
        `)
        .eq('organization_id', currentOrg.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as HiringActivityLog[];
    },
    enabled: !!currentOrg?.id && !!entityId,
  });
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export function useHiringEmailTemplates() {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'email-templates', currentOrg?.id],
    queryFn: async (): Promise<HiringEmailTemplate[]> => {
      if (!currentOrg?.id) return [];

      const { data, error } = await supabase
        .from('hiring_email_templates')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as HiringEmailTemplate[];
    },
    enabled: !!currentOrg?.id,
  });
}

// ============================================
// ANALYTICS
// ============================================

export function useHiringMetrics() {
  const { currentOrg } = useOrganization();

  return useQuery({
    queryKey: ['hiring', 'metrics', currentOrg?.id],
    queryFn: async (): Promise<HiringMetrics> => {
      if (!currentOrg?.id) {
        return {
          open_jobs: 0,
          total_candidates: 0,
          candidates_by_stage: {} as Record<string, number>,
          hires_last_30_days: 0,
          hires_last_90_days: 0,
          avg_time_to_fill_days: null,
          source_of_hire: {} as Record<string, number>,
          assignment_completion_rate: 0,
          avg_assignment_rating: null,
        };
      }

      // Parallel queries for metrics
      const [
        jobsResult,
        candidatesResult,
        applicationsResult,
        hires30Result,
        hires90Result,
        assignmentsResult,
      ] = await Promise.all([
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrg.id)
          .eq('status', 'open'),
        supabase
          .from('candidates')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrg.id),
        supabase
          .from('candidate_applications')
          .select('stage, status')
          .eq('organization_id', currentOrg.id)
          .eq('status', 'active'),
        supabase
          .from('candidate_applications')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrg.id)
          .eq('status', 'hired')
          .gte('hired_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('candidate_applications')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', currentOrg.id)
          .eq('status', 'hired')
          .gte('hired_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('assignment_instances')
          .select('status, rating')
          .eq('organization_id', currentOrg.id),
      ]);

      // Calculate candidates by stage
      const candidatesByStage: Record<string, number> = {};
      if (applicationsResult.data) {
        for (const app of applicationsResult.data) {
          candidatesByStage[app.stage] = (candidatesByStage[app.stage] || 0) + 1;
        }
      }

      // Calculate assignment metrics
      let assignmentCompletionRate = 0;
      let avgAssignmentRating: number | null = null;
      if (assignmentsResult.data?.length) {
        const submitted = assignmentsResult.data.filter(
          (a) => a.status === 'submitted' || a.status === 'reviewed'
        ).length;
        assignmentCompletionRate = (submitted / assignmentsResult.data.length) * 100;

        const ratings = assignmentsResult.data
          .filter((a) => a.rating != null)
          .map((a) => a.rating as number);
        if (ratings.length > 0) {
          avgAssignmentRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        }
      }

      return {
        open_jobs: jobsResult.count || 0,
        total_candidates: candidatesResult.count || 0,
        candidates_by_stage: candidatesByStage as any,
        hires_last_30_days: hires30Result.count || 0,
        hires_last_90_days: hires90Result.count || 0,
        avg_time_to_fill_days: null,
        source_of_hire: {} as any,
        assignment_completion_rate: assignmentCompletionRate,
        avg_assignment_rating: avgAssignmentRating,
      };
    },
    enabled: !!currentOrg?.id,
  });
}

// ============================================
// PUBLIC QUERIES (for careers site)
// ============================================

export function usePublicJobs(orgSlug: string | undefined) {
  return useQuery({
    queryKey: ['public', 'jobs', orgSlug],
    queryFn: async (): Promise<Job[]> => {
      if (!orgSlug) return [];

      // First get org by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single();

      if (orgError || !org) return [];

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, slug, title, location, work_model, employment_type,
          salary_min, salary_max, salary_currency, salary_visible,
          description, requirements, benefits, published_at,
          department:departments(id, name),
          office:offices(id, name, city)
        `)
        .eq('organization_id', org.id)
        .eq('status', 'open')
        .eq('is_public_visible', true)
        .order('published_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Job[];
    },
    enabled: !!orgSlug,
  });
}

export function usePublicJob(orgSlug: string | undefined, jobSlug: string | undefined) {
  return useQuery({
    queryKey: ['public', 'job', orgSlug, jobSlug],
    queryFn: async (): Promise<Job | null> => {
      if (!orgSlug || !jobSlug) return null;

      // First get org by slug
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', orgSlug)
        .single();

      if (orgError || !org) return null;

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          department:departments(id, name),
          office:offices(id, name, city)
        `)
        .eq('organization_id', org.id)
        .eq('slug', jobSlug)
        .eq('status', 'open')
        .eq('is_public_visible', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as Job;
    },
    enabled: !!orgSlug && !!jobSlug,
  });
}

// Assignment submission by secure token (public, no auth)
export function useAssignmentByToken(token: string | undefined) {
  return useQuery({
    queryKey: ['public', 'assignment', token],
    queryFn: async (): Promise<AssignmentInstanceWithRelations | null> => {
      if (!token) return null;

      const { data, error } = await supabase
        .from('assignment_instances')
        .select(`
          id, title, instructions, expected_deliverables, deadline, status, submitted_at,
          candidate_application:candidate_applications(
            id,
            candidate:candidates(name, email),
            job:jobs(
              title,
              organization:organizations(name, code)
            )
          )
        `)
        .eq('secure_token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as AssignmentInstanceWithRelations;
    },
    enabled: !!token,
  });
}
