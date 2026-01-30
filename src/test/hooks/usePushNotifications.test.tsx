import React, { ReactNode } from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock supabase
const mockSupabase = {
  functions: {
    invoke: vi.fn(),
  },
  from: vi.fn(() => ({
    upsert: vi.fn(() => ({ error: null })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    })),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock useAuth
const mockUser = { id: 'test-user-id' };
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock service worker and push manager
const mockSubscription = {
  endpoint: 'https://push.example.com/test-endpoint',
  toJSON: () => ({
    endpoint: 'https://push.example.com/test-endpoint',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  }),
  unsubscribe: vi.fn(() => Promise.resolve(true)),
};

const mockPushManager = {
  getSubscription: vi.fn(() => Promise.resolve(null)),
  subscribe: vi.fn(() => Promise.resolve(mockSubscription)),
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
};

describe('usePushNotifications', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
    
    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(mockServiceWorkerRegistration),
      },
      writable: true,
      configurable: true,
    });
    
    // Mock PushManager
    Object.defineProperty(window, 'PushManager', {
      value: class {},
      writable: true,
      configurable: true,
    });
    
    // Mock Notification
    Object.defineProperty(window, 'Notification', {
      value: class {
        static permission = 'default';
        static requestPermission = vi.fn(() => Promise.resolve('granted'));
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Feature Detection', () => {
    it('should detect when push notifications are supported', async () => {
      // Import after mocks are set up
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.isSupported).toBe(true);
    });

    it('should detect when push notifications are not supported', async () => {
      // Remove PushManager
      Object.defineProperty(window, 'PushManager', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      
      // Clear module cache to re-evaluate
      vi.resetModules();
      
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('Subscription State', () => {
    it('should check for existing subscription on mount', async () => {
      mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.isSubscribed).toBe(true);
    });

    it('should report not subscribed when no subscription exists', async () => {
      mockPushManager.getSubscription.mockResolvedValueOnce(null);
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  describe('Permission State', () => {
    it('should reflect granted permission', async () => {
      (window.Notification as any).permission = 'granted';
      mockPushManager.getSubscription.mockResolvedValueOnce(mockSubscription);
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.permission).toBe('granted');
    });

    it('should reflect denied permission', async () => {
      (window.Notification as any).permission = 'denied';
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.permission).toBe('denied');
    });
  });

  describe('Subscribe Function', () => {
    it('should successfully subscribe to push notifications', async () => {
      (window.Notification as any).permission = 'default';
      (window.Notification as any).requestPermission = vi.fn(() => Promise.resolve('granted'));
      
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { vapidPublicKey: 'test-vapid-key' },
        error: null,
      });
      
      mockSupabase.from.mockReturnValueOnce({
        upsert: vi.fn(() => ({ error: null })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        })),
      });
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let subscribeResult: boolean = false;
      await act(async () => {
        subscribeResult = await result.current.subscribe();
      });
      
      expect(subscribeResult).toBe(true);
      expect(result.current.isSubscribed).toBe(true);
    });

    it('should handle permission denial', async () => {
      (window.Notification as any).requestPermission = vi.fn(() => Promise.resolve('denied'));
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let subscribeResult: boolean = false;
      await act(async () => {
        subscribeResult = await result.current.subscribe();
      });
      
      expect(subscribeResult).toBe(false);
    });
  });

  describe('Unsubscribe Function', () => {
    it('should successfully unsubscribe from push notifications', async () => {
      mockPushManager.getSubscription.mockResolvedValue(mockSubscription);
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let unsubscribeResult: boolean = false;
      await act(async () => {
        unsubscribeResult = await result.current.unsubscribe();
      });
      
      expect(unsubscribeResult).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
    });
  });

  describe('VAPID Key Handling', () => {
    it('should fetch VAPID public key from edge function', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { vapidPublicKey: 'test-vapid-key' },
        error: null,
      });
      
      (window.Notification as any).requestPermission = vi.fn(() => Promise.resolve('granted'));
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('get-vapid-public-key');
    });

    it('should handle VAPID key fetch failure', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch VAPID key' },
      });
      
      (window.Notification as any).requestPermission = vi.fn(() => Promise.resolve('granted'));
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      let subscribeResult: boolean = false;
      await act(async () => {
        subscribeResult = await result.current.subscribe();
      });
      
      expect(subscribeResult).toBe(false);
    });
  });

  describe('Base64 URL Conversion', () => {
    it('should correctly convert base64 URL to Uint8Array', async () => {
      // This is indirectly tested through the subscribe function
      // The conversion happens when calling pushManager.subscribe with applicationServerKey
      
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { vapidPublicKey: 'BNvCT2lDd3WHEQDAKQw1ceyHJc-vDH9Toa7awF01Lk-kZUQxxCnWJXPBbtKVTX-C6VYWMlzN3GHwIFCl67VCjnk' },
        error: null,
      });
      
      (window.Notification as any).requestPermission = vi.fn(() => Promise.resolve('granted'));
      
      mockSupabase.from.mockReturnValueOnce({
        upsert: vi.fn(() => ({ error: null })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        })),
      });
      
      vi.resetModules();
      const { usePushNotifications } = await import('@/hooks/usePushNotifications');
      
      const { result } = renderHook(() => usePushNotifications(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      await act(async () => {
        await result.current.subscribe();
      });
      
      // Verify pushManager.subscribe was called with applicationServerKey
      expect(mockPushManager.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          userVisibleOnly: true,
          applicationServerKey: expect.any(Uint8Array),
        })
      );
    });
  });
});
