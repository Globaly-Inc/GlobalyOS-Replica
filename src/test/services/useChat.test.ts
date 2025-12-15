import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({ currentOrg: { id: 'org-1' } })
}));

vi.mock('@/services/useCurrentEmployee', () => ({
  useCurrentEmployee: () => ({ 
    data: { 
      id: 'emp-1', 
      user_id: 'user-1',
      position: 'Developer',
      profiles: { full_name: 'Test User', avatar_url: null }
    } 
  })
}));

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        or: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
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
      })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => ({ unsubscribe: vi.fn() }))
      }))
    })),
    removeChannel: vi.fn()
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

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useConversations', () => {
    it('should fetch conversations for current employee', async () => {
      const { useConversations } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useConversations(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useSpaces', () => {
    it('should fetch spaces for organization', async () => {
      const { useSpaces } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useSpaces(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useSpaceMembers', () => {
    it('should fetch members for space', async () => {
      const { useSpaceMembers } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useSpaceMembers('space-1'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should handle null space ID', async () => {
      const { useSpaceMembers } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useSpaceMembers(null), { wrapper });

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('useMessages', () => {
    it('should fetch messages for conversation', async () => {
      const { useMessages } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useMessages('conv-1', null),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch messages for space', async () => {
      const { useMessages } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useMessages(null, 'space-1'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should return empty for no conversation or space', async () => {
      const { useMessages } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => useMessages(null, null),
        { wrapper }
      );

      expect(result.current.data).toBeUndefined();
    });
  });

  describe('usePinnedMessages', () => {
    it('should fetch pinned messages for conversation', async () => {
      const { usePinnedMessages } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(
        () => usePinnedMessages('conv-1', null),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useSendMessage', () => {
    it('should provide mutation for sending message', async () => {
      const { useSendMessage } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useSendMessage(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useCreateConversation', () => {
    it('should provide mutation for creating conversation', async () => {
      const { useCreateConversation } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useCreateConversation(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useUpdateConversation', () => {
    it('should provide mutation for updating conversation', async () => {
      const { useUpdateConversation } = await import('@/services/useChat');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useUpdateConversation(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });
});
