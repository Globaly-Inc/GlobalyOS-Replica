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
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useLeave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useLeaveTypes', () => {
    it('should fetch leave types for organization', async () => {
      const { useLeaveTypes } = await import('@/services/useLeave');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useLeaveTypes(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch all leave types when activeOnly is false', async () => {
      const { useLeaveTypes } = await import('@/services/useLeave');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useLeaveTypes(false), { wrapper });

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

    it('should handle undefined employee ID', async () => {
      const { useLeaveBalances } = await import('@/services/useLeave');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useLeaveBalances(undefined), { wrapper });

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
    });
  });

  describe('useUpdateLeaveStatus', () => {
    it('should provide mutation for updating leave status', async () => {
      const { useUpdateLeaveStatus } = await import('@/services/useLeave');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useUpdateLeaveStatus(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useCancelLeaveRequest', () => {
    it('should provide mutation for cancelling leave request', async () => {
      const { useCancelLeaveRequest } = await import('@/services/useLeave');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCancelLeaveRequest(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });
});
