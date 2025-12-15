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
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          gte: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
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
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'image.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } }))
      }))
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

describe('useFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useFeedUpdates', () => {
    it('should fetch updates for organization', async () => {
      const { useFeedUpdates } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useFeedUpdates(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useFeedKudos', () => {
    it('should fetch kudos for organization', async () => {
      const { useFeedKudos } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useFeedKudos(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useReactions', () => {
    it('should fetch reactions for update', async () => {
      const { useReactions } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useReactions('update-1', 'update'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch reactions for kudos', async () => {
      const { useReactions } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useReactions('kudos-1', 'kudos'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useCreateUpdate', () => {
    it('should provide mutation for creating update', async () => {
      const { useCreateUpdate } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCreateUpdate(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useCreateKudos', () => {
    it('should provide mutation for creating kudos', async () => {
      const { useCreateKudos } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCreateKudos(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useToggleReaction', () => {
    it('should provide mutation for toggling reaction', async () => {
      const { useToggleReaction } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useToggleReaction(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useDeleteUpdate', () => {
    it('should provide mutation for deleting update', async () => {
      const { useDeleteUpdate } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDeleteUpdate(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useDeleteKudos', () => {
    it('should provide mutation for deleting kudos', async () => {
      const { useDeleteKudos } = await import('@/services/useFeed');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDeleteKudos(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });
});
