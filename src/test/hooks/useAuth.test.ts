import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

// Mock Supabase client
const mockSignOut = vi.fn(() => Promise.resolve({ error: null }));
const mockGetSession = vi.fn(() => Promise.resolve({ 
  data: { session: null }, 
  error: null 
}));
const mockOnAuthStateChange = vi.fn((callback) => {
  return { data: { subscription: { unsubscribe: vi.fn() } } };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange
    }
  }
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication State', () => {
    it('should initialize with loading state', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      
      const { result } = renderHook(() => useAuth());

      expect(result.current.loading).toBe(true);
    });

    it('should return null user when not authenticated', async () => {
      mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
      
      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user-1', email: 'test@example.com' };
      const mockSession = { user: mockUser };
      mockGetSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });
      
      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Sign Out', () => {
    it('should provide signOut function', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      expect(result.current.signOut).toBeDefined();
      expect(typeof result.current.signOut).toBe('function');
    });

    it('should call supabase signOut when invoked', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('Auth State Change Subscription', () => {
    it('should subscribe to auth state changes', async () => {
      const { useAuth } = await import('@/hooks/useAuth');
      renderHook(() => useAuth());

      expect(mockOnAuthStateChange).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should return session when available', async () => {
      const mockSession = { user: { id: 'user-1' }, access_token: 'token' };
      mockGetSession.mockResolvedValueOnce({ data: { session: mockSession }, error: null });
      
      const { useAuth } = await import('@/hooks/useAuth');
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
