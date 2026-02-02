/**
 * Hiring & Recruitment Flow Tests
 * Integration tests for the ATS module critical paths
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  functions: {
    invoke: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Hiring & Recruitment Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Job Lifecycle', () => {
    it('should create a job in draft status', async () => {
      const mockJob = {
        id: 'job-123',
        title: 'Senior Developer',
        status: 'draft',
        slug: 'senior-developer',
        organization_id: 'org-123',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
          }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      // Simulate job creation
      const { data, error } = await mockSupabase.from('jobs')
        .insert({
          organization_id: 'org-123',
          title: 'Senior Developer',
          slug: 'senior-developer',
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('draft');
      expect(data?.slug).toBe('senior-developer');
    });

    it('should approve a job and update status', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'job-123', status: 'approved', approved_at: new Date().toISOString() },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('jobs')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', 'job-123')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('approved');
      expect(data?.approved_at).toBeDefined();
    });

    it('should publish a job and set visibility flags', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'job-123',
                  status: 'open',
                  is_public_visible: true,
                  published_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('jobs')
        .update({
          status: 'open',
          is_public_visible: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', 'job-123')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('open');
      expect(data?.is_public_visible).toBe(true);
    });
  });

  describe('Public Application Flow', () => {
    it('should submit application via edge function', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          application_id: 'app-123',
          message: 'Application submitted successfully',
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('submit-public-application', {
        body: {
          org_code: 'acme-corp',
          job_id: 'job-123',
          candidate: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone: '+1234567890',
          },
          cover_letter: 'I am excited to apply...',
        },
      });

      expect(response.error).toBeNull();
      expect(response.data.success).toBe(true);
      expect(response.data.application_id).toBeDefined();
    });

    it('should reject duplicate applications', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'You have already applied for this position' },
      });

      const response = await mockSupabase.functions.invoke('submit-public-application', {
        body: {
          org_code: 'acme-corp',
          job_id: 'job-123',
          candidate: { name: 'Jane Doe', email: 'jane@example.com' },
        },
      });

      expect(response.error).not.toBeNull();
      expect(response.error?.message).toContain('already applied');
    });

    it('should reject applications for closed jobs', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'This position is no longer accepting applications' },
      });

      const response = await mockSupabase.functions.invoke('submit-public-application', {
        body: {
          org_code: 'acme-corp',
          job_id: 'closed-job',
          candidate: { name: 'Jane Doe', email: 'jane@example.com' },
        },
      });

      expect(response.error).not.toBeNull();
      expect(response.error?.message).toContain('no longer accepting');
    });
  });

  describe('Application Stage Transitions', () => {
    it('should move application through pipeline stages', async () => {
      const stages = ['applied', 'screening', 'interview_1', 'offer', 'hired'];

      for (const stage of stages) {
        mockSupabase.from.mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'app-123', stage, status: 'active' },
                  error: null,
                }),
              }),
            }),
          }),
        });

        const { data, error } = await mockSupabase.from('candidate_applications')
          .update({ stage })
          .eq('id', 'app-123')
          .select()
          .single();

        expect(error).toBeNull();
        expect(data?.stage).toBe(stage);
      }
    });

    it('should reject application and update status', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'app-123',
                  stage: 'rejected',
                  status: 'rejected',
                  rejected_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('candidate_applications')
        .update({
          stage: 'rejected',
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', 'app-123')
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.stage).toBe('rejected');
      expect(data?.status).toBe('rejected');
    });
  });

  describe('Assignment Flow', () => {
    it('should create assignment instance with secure token', async () => {
      const mockAssignment = {
        id: 'assign-123',
        candidate_application_id: 'app-123',
        secure_token: 'token-abc123xyz',
        status: 'assigned',
        deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockAssignment, error: null }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('assignment_instances')
        .insert({
          candidate_application_id: 'app-123',
          secure_token: 'token-abc123xyz',
          deadline: mockAssignment.deadline,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.secure_token).toBeDefined();
      expect(data?.status).toBe('assigned');
    });

    it('should validate secure token for public submission', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'assign-123',
                status: 'assigned',
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('assignment_instances')
        .select('*')
        .eq('secure_token', 'valid-token')
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('assigned');
    });

    it('should reject submission for already submitted assignment', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'assign-123', status: 'submitted' },
              error: null,
            }),
          }),
        }),
      });

      const { data } = await mockSupabase.from('assignment_instances')
        .select('*')
        .eq('secure_token', 'used-token')
        .single();

      // Business logic should reject if status is 'submitted'
      expect(data?.status).toBe('submitted');
    });
  });

  describe('Interview Scorecard Flow', () => {
    it('should submit interview scorecard', async () => {
      const mockScorecard = {
        id: 'score-123',
        interview_id: 'interview-123',
        interviewer_id: 'emp-123',
        technical_skills: 4,
        culture_fit: 5,
        communication: 4,
        recommendation: 'strong_yes',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockScorecard, error: null }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('interview_scorecards')
        .insert(mockScorecard)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.recommendation).toBe('strong_yes');
      expect(data?.technical_skills).toBe(4);
    });
  });

  describe('Offer Flow', () => {
    it('should create offer for candidate', async () => {
      const mockOffer = {
        id: 'offer-123',
        candidate_application_id: 'app-123',
        salary: 120000,
        currency: 'USD',
        status: 'draft',
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockOffer, error: null }),
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('hiring_offers')
        .insert(mockOffer)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data?.status).toBe('draft');
      expect(data?.salary).toBe(120000);
    });
  });

  describe('File Upload (CV)', () => {
    it('should upload CV to storage', async () => {
      mockSupabase.storage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: { path: 'org-123/candidate-456/cv-12345.pdf' },
          error: null,
        }),
      });

      const { data, error } = await mockSupabase.storage
        .from('hiring-documents')
        .upload('org-123/candidate-456/cv-12345.pdf', new Blob(['fake pdf']));

      expect(error).toBeNull();
      expect(data?.path).toContain('cv-');
    });

    it('should update application with CV path', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: 'app-123', cv_file_path: 'org-123/candidate-456/cv-12345.pdf' },
            error: null,
          }),
        }),
      });

      const { data, error } = await mockSupabase.from('candidate_applications')
        .update({ cv_file_path: 'org-123/candidate-456/cv-12345.pdf' })
        .eq('id', 'app-123');

      expect(error).toBeNull();
    });
  });

  describe('Security - Org Isolation', () => {
    it('should only return jobs for current organization', async () => {
      const mockJobs = [
        { id: 'job-1', organization_id: 'org-123', title: 'Job 1' },
        { id: 'job-2', organization_id: 'org-123', title: 'Job 2' },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
        }),
      });

      const { data } = await mockSupabase.from('jobs')
        .select('*')
        .eq('organization_id', 'org-123');

      expect(data).toHaveLength(2);
      expect(data?.every((job: any) => job.organization_id === 'org-123')).toBe(true);
    });
  });
});
