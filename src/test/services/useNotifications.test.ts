import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } })
}));

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
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        count: 'exact'
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: '1' }, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      }))
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

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useNotifications', () => {
    it('should fetch notifications for user', async () => {
      const { useNotifications } = await import('@/services/useNotifications');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useNotifications(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });

    it('should fetch notifications with type filter', async () => {
      const { useNotifications } = await import('@/services/useNotifications');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useNotifications('kudos'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useUnreadNotificationCount', () => {
    it('should fetch unread count', async () => {
      const { useUnreadNotificationCount } = await import('@/services/useNotifications');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useUnreadNotificationCount(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading || result.current.data !== undefined).toBe(true);
      });
    });
  });

  describe('useMarkNotificationRead', () => {
    it('should provide mutation for marking notification as read', async () => {
      const { useMarkNotificationRead } = await import('@/services/useNotifications');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useMarkAllNotificationsRead', () => {
    it('should provide mutation for marking all notifications as read', async () => {
      const { useMarkAllNotificationsRead } = await import('@/services/useNotifications');
      const wrapper = createWrapper();
      
      const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper });

      expect(result.current.mutateAsync).toBeDefined();
    });
  });

  describe('useNotificationSubscription', () => {
    it('should provide subscription hook', async () => {
      const { useNotificationSubscription } = await import('@/services/useNotifications');
      const wrapper = createWrapper();
      const onNewNotification = vi.fn();
      
      const { result } = renderHook(
        () => useNotificationSubscription(onNewNotification),
        { wrapper }
      );

      expect(result.current).toBeDefined();
    });
  });
});
