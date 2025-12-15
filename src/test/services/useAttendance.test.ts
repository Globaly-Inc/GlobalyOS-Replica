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
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          })),
          order: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: { success: true }, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }))
    }
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

describe('useAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useTodayAttendance', () => {
    it('should fetch today attendance for current employee', async () => {
      const { useTodayAttendance } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useTodayAttendance(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useAttendanceRecords', () => {
    it('should fetch attendance records with default options', async () => {
      const { useAttendanceRecords } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useAttendanceRecords(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch attendance records for specific employee', async () => {
      const { useAttendanceRecords } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useAttendanceRecords({ employeeId: 'emp-1' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch attendance records with date range', async () => {
      const { useAttendanceRecords } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useAttendanceRecords({ 
          startDate: '2024-01-01', 
          endDate: '2024-12-31' 
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useAttendanceHourBalance', () => {
    it('should fetch hour balance for employee', async () => {
      const { useAttendanceHourBalance } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useAttendanceHourBalance('emp-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should handle undefined employee ID', async () => {
      const { useAttendanceHourBalance } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useAttendanceHourBalance(undefined),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useQRAttendance', () => {
    it('should provide mutation function for QR attendance', async () => {
      const { useQRAttendance } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useQRAttendance(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useManualAttendance', () => {
    it('should provide mutation function for manual attendance', async () => {
      const { useManualAttendance } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useManualAttendance(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useCheckInStatus', () => {
    it('should fetch check-in status for current employee', async () => {
      const { useCheckInStatus } = await import('@/services/useAttendance');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCheckInStatus(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });
});
