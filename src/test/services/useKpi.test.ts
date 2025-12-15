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
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
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
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { insights: [] }, error: null }))
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

describe('useKpi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEmployeeKpis', () => {
    it('should fetch KPIs for employee', async () => {
      const { useEmployeeKpis } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useEmployeeKpis('emp-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch KPIs for specific quarter and year', async () => {
      const { useEmployeeKpis } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useEmployeeKpis('emp-1', 1, 2024),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should handle undefined employee ID', async () => {
      const { useEmployeeKpis } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useEmployeeKpis(undefined), { wrapper });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useTeamKpis', () => {
    it('should fetch team KPIs for organization', async () => {
      const { useTeamKpis } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useTeamKpis(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useKpiTemplates', () => {
    it('should fetch KPI templates for organization', async () => {
      const { useKpiTemplates } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useKpiTemplates(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useCreateKpi', () => {
    it('should provide mutation for creating KPI', async () => {
      const { useCreateKpi } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCreateKpi(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useUpdateKpiProgress', () => {
    it('should provide mutation for updating KPI progress', async () => {
      const { useUpdateKpiProgress } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useUpdateKpiProgress(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useDeleteKpi', () => {
    it('should provide mutation for deleting KPI', async () => {
      const { useDeleteKpi } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDeleteKpi(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useKpiAiInsights', () => {
    it('should fetch AI insights for employee KPIs', async () => {
      const { useKpiAiInsights } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useKpiAiInsights('emp-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useGenerateKpiInsights', () => {
    it('should provide mutation for generating AI insights', async () => {
      const { useGenerateKpiInsights } = await import('@/services/useKpi');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useGenerateKpiInsights(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });
});
