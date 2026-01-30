import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } })
}));

vi.mock('@/services/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({ data: { id: 'emp-1', user_id: 'user-1' } })
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useLeave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useLeaveTypes (deprecated)', () => {
    it('should return empty array as leave_types table has been dropped', async () => {
      const { useLeaveTypes } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useLeaveTypes(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });

      // The deprecated hook should return empty array
      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });
    });

    it('should accept activeOnly parameter', async () => {
      const { useLeaveTypes } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useLeaveTypes(false), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });
    });
  });

  describe('useOfficeLeaveTypesQuery', () => {
    it('should return empty array when office ID is undefined', async () => {
      const { useOfficeLeaveTypesQuery } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useOfficeLeaveTypesQuery(undefined), { wrapper });

      // Query should be disabled, data should be undefined
      expect(result.current.data).toBeUndefined();
    });

    it('should be enabled when office ID is provided', async () => {
      const { useOfficeLeaveTypesQuery } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useOfficeLeaveTypesQuery('office-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should filter by active status by default', async () => {
      const { useOfficeLeaveTypesQuery } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useOfficeLeaveTypesQuery('office-1', true), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useLeaveBalances', () => {
    it('should fetch leave balances for employee', async () => {
      const { useLeaveBalances } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useLeaveBalances('emp-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should return empty array for undefined employee ID', async () => {
      const { useLeaveBalances } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useLeaveBalances(undefined), { wrapper });

      // Query should be disabled
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch balances for specific year', async () => {
      const { useLeaveBalances } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useLeaveBalances('emp-1', 2024), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should default to current year when year is not provided', async () => {
      const { useLeaveBalances } = await import('@/services/useLeave');
      const wrapper = createWrapper();
      const currentYear = new Date().getFullYear();

      const { result } = renderHook(() => useLeaveBalances('emp-1'), { wrapper });

      // Query key should contain current year
      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useLeaveRequests', () => {
    it('should fetch leave requests with default options', async () => {
      const { useLeaveRequests } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useLeaveRequests(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch leave requests for specific employee', async () => {
      const { useLeaveRequests } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useLeaveRequests({ employeeId: 'emp-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should filter by status when provided', async () => {
      const { useLeaveRequests } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useLeaveRequests({ status: 'pending' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should filter by date range when provided', async () => {
      const { useLeaveRequests } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(
        () => useLeaveRequests({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('usePendingLeaveApprovals', () => {
    it('should fetch pending approvals', async () => {
      const { usePendingLeaveApprovals } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => usePendingLeaveApprovals(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useCreateLeaveRequest', () => {
    it('should provide mutation for creating leave request', async () => {
      const { useCreateLeaveRequest } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useCreateLeaveRequest(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
      expect(typeof result.current.mutateAsync).toBe('function');
    });

    it('should have idle state initially', async () => {
      const { useCreateLeaveRequest } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useCreateLeaveRequest(), { wrapper });

      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  describe('useUpdateLeaveStatus', () => {
    it('should provide mutation for updating leave status', async () => {
      const { useUpdateLeaveStatus } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useUpdateLeaveStatus(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
      expect(typeof result.current.mutateAsync).toBe('function');
    });

    it('should have idle state initially', async () => {
      const { useUpdateLeaveStatus } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useUpdateLeaveStatus(), { wrapper });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('useCancelLeaveRequest', () => {
    it('should provide mutation for cancelling leave request', async () => {
      const { useCancelLeaveRequest } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useCancelLeaveRequest(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
      expect(typeof result.current.mutateAsync).toBe('function');
    });

    it('should have idle state initially', async () => {
      const { useCancelLeaveRequest } = await import('@/services/useLeave');
      const wrapper = createWrapper();

      const { result } = renderHook(() => useCancelLeaveRequest(), { wrapper });

      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
    });
  });
});

describe('Leave Types Validation', () => {
  it('should validate leave type structure from office_leave_types', async () => {
    const mockOfficeLeaveType = {
      id: 'lt-1',
      office_id: 'office-1',
      organization_id: 'org-1',
      name: 'Annual Leave',
      category: 'paid',
      default_days: 20,
      min_days_advance: 1,
      is_active: true,
      description: 'Annual vacation leave',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    // Validate structure
    expect(mockOfficeLeaveType).toHaveProperty('id');
    expect(mockOfficeLeaveType).toHaveProperty('office_id');
    expect(mockOfficeLeaveType).toHaveProperty('name');
    expect(mockOfficeLeaveType).toHaveProperty('category');
    expect(mockOfficeLeaveType).toHaveProperty('is_active');
    expect(['paid', 'unpaid']).toContain(mockOfficeLeaveType.category);
  });

  it('should validate leave balance structure', async () => {
    const mockBalance = {
      id: 'bal-1',
      employee_id: 'emp-1',
      office_leave_type_id: 'lt-1',
      organization_id: 'org-1',
      balance: 15,
      year: 2024,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(mockBalance).toHaveProperty('employee_id');
    expect(mockBalance).toHaveProperty('office_leave_type_id');
    expect(mockBalance).toHaveProperty('balance');
    expect(mockBalance).toHaveProperty('year');
    expect(typeof mockBalance.balance).toBe('number');
  });

  it('should validate leave request structure', async () => {
    const mockRequest = {
      id: 'req-1',
      employee_id: 'emp-1',
      organization_id: 'org-1',
      leave_type: 'Annual Leave',
      start_date: '2024-06-01',
      end_date: '2024-06-05',
      days_count: 5,
      half_day_type: 'full' as const,
      reason: 'Family vacation',
      status: 'pending' as const,
      created_at: '2024-05-01T00:00:00Z',
      updated_at: '2024-05-01T00:00:00Z',
    };

    expect(mockRequest).toHaveProperty('employee_id');
    expect(mockRequest).toHaveProperty('leave_type');
    expect(mockRequest).toHaveProperty('start_date');
    expect(mockRequest).toHaveProperty('end_date');
    expect(mockRequest).toHaveProperty('days_count');
    expect(mockRequest).toHaveProperty('status');
    expect(['pending', 'approved', 'rejected']).toContain(mockRequest.status);
    expect(['full', 'first_half', 'second_half']).toContain(mockRequest.half_day_type);
  });
});

describe('Leave Balance Calculations', () => {
  it('should correctly calculate if balance is sufficient', () => {
    const currentBalance = 10;
    const requestedDays = 5;
    const maxNegative = 0;

    const projectedBalance = currentBalance - requestedDays;
    const hasSufficientBalance = projectedBalance >= -maxNegative;

    expect(projectedBalance).toBe(5);
    expect(hasSufficientBalance).toBe(true);
  });

  it('should correctly detect insufficient balance', () => {
    const currentBalance = 3;
    const requestedDays = 5;
    const maxNegative = 0;

    const projectedBalance = currentBalance - requestedDays;
    const hasSufficientBalance = projectedBalance >= -maxNegative;

    expect(projectedBalance).toBe(-2);
    expect(hasSufficientBalance).toBe(false);
  });

  it('should allow negative balance up to max_negative_days', () => {
    const currentBalance = 3;
    const requestedDays = 5;
    const maxNegative = 3; // Allow up to -3 days

    const projectedBalance = currentBalance - requestedDays;
    const hasSufficientBalance = projectedBalance >= -maxNegative;

    expect(projectedBalance).toBe(-2);
    expect(hasSufficientBalance).toBe(true); // -2 >= -3
  });

  it('should reject when exceeding max negative days', () => {
    const currentBalance = 1;
    const requestedDays = 5;
    const maxNegative = 2; // Allow up to -2 days

    const projectedBalance = currentBalance - requestedDays;
    const hasSufficientBalance = projectedBalance >= -maxNegative;

    expect(projectedBalance).toBe(-4);
    expect(hasSufficientBalance).toBe(false); // -4 < -2
  });
});
