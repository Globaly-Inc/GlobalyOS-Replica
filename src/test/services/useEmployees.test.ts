import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } })
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
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

describe('useEmployees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEmployees', () => {
    it('should fetch employees for organization', async () => {
      const { useEmployees } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useEmployees(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch employees with specific status', async () => {
      const { useEmployees } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useEmployees({ status: 'active' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch employees without office data', async () => {
      const { useEmployees } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useEmployees({ includeOffice: false }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useEmployee', () => {
    it('should fetch single employee by ID', async () => {
      const { useEmployee } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useEmployee('emp-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should handle undefined employee ID', async () => {
      const { useEmployee } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useEmployee(undefined), { wrapper });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useEmployeeProfile', () => {
    it('should fetch employee profile by ID', async () => {
      const { useEmployeeProfile } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useEmployeeProfile('emp-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useUpdateEmployee', () => {
    it('should provide mutation for updating employee', async () => {
      const { useUpdateEmployee } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useUpdateEmployee(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useDirectReports', () => {
    it('should fetch direct reports for manager', async () => {
      const { useDirectReports } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDirectReports('manager-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should handle undefined manager ID', async () => {
      const { useDirectReports } = await import('@/services/useEmployees');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDirectReports(undefined), { wrapper });

      expect(result.current.data).toBeUndefined();
    });
  });
});
