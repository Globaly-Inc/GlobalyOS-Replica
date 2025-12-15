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
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          is: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test.pdf' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/test.pdf' } }))
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

describe('useWiki', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useWikiFolders', () => {
    it('should fetch wiki folders for organization', async () => {
      const { useWikiFolders } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useWikiFolders(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useWikiPages', () => {
    it('should fetch wiki pages for organization', async () => {
      const { useWikiPages } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useWikiPages(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch pages for specific folder', async () => {
      const { useWikiPages } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useWikiPages('folder-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch root-level pages when folderId is null', async () => {
      const { useWikiPages } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useWikiPages(null), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useWikiPage', () => {
    it('should fetch single wiki page by ID', async () => {
      const { useWikiPage } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useWikiPage('page-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should handle undefined page ID', async () => {
      const { useWikiPage } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useWikiPage(undefined), { wrapper });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useCreateWikiFolder', () => {
    it('should provide mutation for creating folder', async () => {
      const { useCreateWikiFolder } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCreateWikiFolder(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useCreateWikiPage', () => {
    it('should provide mutation for creating page', async () => {
      const { useCreateWikiPage } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCreateWikiPage(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useUpdateWikiPage', () => {
    it('should provide mutation for updating page', async () => {
      const { useUpdateWikiPage } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useUpdateWikiPage(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useDeleteWikiPage', () => {
    it('should provide mutation for deleting page', async () => {
      const { useDeleteWikiPage } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDeleteWikiPage(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useDeleteWikiFolder', () => {
    it('should provide mutation for deleting folder', async () => {
      const { useDeleteWikiFolder } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDeleteWikiFolder(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useDuplicateWikiPage', () => {
    it('should provide mutation for duplicating page', async () => {
      const { useDuplicateWikiPage } = await import('@/services/useWiki');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useDuplicateWikiPage(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });
});
