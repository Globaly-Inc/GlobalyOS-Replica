import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase client module
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn()
    }))
  }))
}));

describe('Supabase Client', () => {
  describe('Client Initialization', () => {
    it('should initialize Supabase client with provided environment variables', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      expect(supabase).toBeDefined();
    });
  });

  describe('Client Retrieval', () => {
    it('should return a valid Supabase client instance', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      expect(supabase).toBeDefined();
      expect(typeof supabase.from).toBe('function');
      expect(typeof supabase.rpc).toBe('function');
    });

    it('should have auth methods available', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      expect(supabase.auth).toBeDefined();
      expect(typeof supabase.auth.getSession).toBe('function');
      expect(typeof supabase.auth.signOut).toBe('function');
      expect(typeof supabase.auth.onAuthStateChange).toBe('function');
    });

    it('should have realtime channel method available', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      expect(typeof supabase.channel).toBe('function');
    });
  });

  describe('Environment Variables', () => {
    it('should use VITE_SUPABASE_URL environment variable', () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
    });

    it('should use VITE_SUPABASE_PUBLISHABLE_KEY environment variable', () => {
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
    });
  });
});
