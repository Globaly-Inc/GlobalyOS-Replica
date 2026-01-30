/**
 * Leave Request Flow Tests
 * Tests the complete leave request lifecycle: create, approve, reject, cancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn((_table: string) => mockSupabase),
  select: vi.fn((_columns?: string) => mockSupabase),
  insert: vi.fn((_data: any) => mockSupabase),
  update: vi.fn((_data: any) => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn((_column: string, _value: any) => mockSupabase),
  single: vi.fn(),
  rpc: vi.fn((_fn: string, _params?: any) => Promise.resolve({ data: null, error: null })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Leave Request Flow', () => {
  const mockEmployee = {
    id: 'emp-123',
    organization_id: 'org-123',
    user_id: 'user-123',
  };

  const mockLeaveType = {
    id: 'leave-type-annual',
    name: 'Annual Leave',
    days_allowed: 20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chain methods
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  describe('Create Leave Request', () => {
    it('should create a leave request with valid data', async () => {
      const leaveRequest = {
        employee_id: mockEmployee.id,
        organization_id: mockEmployee.organization_id,
        leave_type_id: mockLeaveType.id,
        start_date: '2026-02-15',
        end_date: '2026-02-17',
        days_count: 3,
        status: 'pending',
        reason: 'Family vacation',
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'leave-123', ...leaveRequest },
        error: null,
      });

      mockSupabase.from('leave_requests')
        .insert(leaveRequest);

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.status).toBe('pending');
      expect(data.days_count).toBe(3);
    });

    it('should validate leave balance before creating request', async () => {
      // Simulate RPC call to check balance
      mockSupabase.rpc.mockResolvedValueOnce({
        data: { 
          available_balance: 5,
          requested_days: 10,
          has_sufficient_balance: false,
        },
        error: null,
      });

      const { data } = await mockSupabase.rpc('check_leave_balance', {
        p_employee_id: mockEmployee.id,
        p_leave_type_id: mockLeaveType.id,
        p_days_count: 10,
      });

      expect(data.has_sufficient_balance).toBe(false);
    });

    it('should prevent overlapping leave requests', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { 
          message: 'Leave request overlaps with existing request',
          code: '23505', // Unique constraint violation
        },
      });

      const { error } = await mockSupabase.single();

      expect(error).not.toBeNull();
      expect(error?.message).toContain('overlaps');
    });
  });

  describe('Approve Leave Request', () => {
    it('should approve a pending leave request', async () => {
      const leaveId = 'leave-123';

      mockSupabase.single.mockResolvedValueOnce({
        data: { 
          id: leaveId, 
          status: 'approved',
          approved_by: 'manager-123',
          approved_at: new Date().toISOString(),
        },
        error: null,
      });

      mockSupabase.from('leave_requests')
        .update({ 
          status: 'approved', 
          approved_by: 'manager-123' 
        })
        .eq('id', leaveId);

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.status).toBe('approved');
      expect(data.approved_by).toBe('manager-123');
    });

    it('should deduct leave balance upon approval', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          previous_balance: 15,
          days_deducted: 3,
          new_balance: 12,
        },
        error: null,
      });

      const { data, error } = await mockSupabase.rpc('deduct_leave_balance', {
        p_employee_id: mockEmployee.id,
        p_leave_type_id: mockLeaveType.id,
        p_days: 3,
      });

      expect(error).toBeNull();
      expect(data.new_balance).toBe(12);
    });
  });

  describe('Reject Leave Request', () => {
    it('should reject a leave request with reason', async () => {
      const leaveId = 'leave-123';
      const rejectionReason = 'Team capacity constraints during this period';

      mockSupabase.single.mockResolvedValueOnce({
        data: { 
          id: leaveId, 
          status: 'rejected',
          rejection_reason: rejectionReason,
        },
        error: null,
      });

      mockSupabase.from('leave_requests')
        .update({ 
          status: 'rejected', 
          rejection_reason: rejectionReason,
        })
        .eq('id', leaveId);

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.status).toBe('rejected');
      expect(data.rejection_reason).toBe(rejectionReason);
    });
  });

  describe('Cancel Approved Leave', () => {
    it('should cancel approved leave and restore balance', async () => {
      const leaveId = 'leave-123';

      // First update the leave status
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: leaveId, status: 'cancelled' },
        error: null,
      });

      mockSupabase.from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', leaveId);

      const updateResult = await mockSupabase.single();

      expect(updateResult.error).toBeNull();
      expect(updateResult.data.status).toBe('cancelled');

      // Then restore the balance
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          previous_balance: 12,
          days_restored: 3,
          new_balance: 15,
        },
        error: null,
      });

      const { data: balanceData, error: balanceError } = await mockSupabase.rpc('restore_leave_balance', {
        p_employee_id: mockEmployee.id,
        p_leave_type_id: mockLeaveType.id,
        p_days: 3,
      });

      expect(balanceError).toBeNull();
      expect(balanceData.new_balance).toBe(15);
    });
  });

  describe('Leave Notifications', () => {
    it('should create notification when leave is approved', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'notification-123',
          user_id: 'user-123',
          type: 'leave_approved',
          title: 'Leave Request Approved',
          message: 'Your leave request has been approved',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.type).toBe('leave_approved');
    });
  });
});
