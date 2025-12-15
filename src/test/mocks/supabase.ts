import { vi } from 'vitest';

// Mock user for authentication tests
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
  },
};

// Mock organization for multi-tenant tests
export const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  org_code: 'test-org',
  status: 'active',
};

// Different org for isolation tests
export const mockOtherOrganization = {
  id: 'org-2',
  name: 'Other Organization',
  org_code: 'other-org',
  status: 'active',
};

// Mock employee
export const mockEmployee = {
  id: 'emp-1',
  user_id: mockUser.id,
  organization_id: mockOrganization.id,
  department: 'Engineering',
  position: 'Developer',
  status: 'active',
};

// Create mock Supabase client
export const createMockSupabaseClient = () => {
  const createChainable = (): Record<string, ReturnType<typeof vi.fn>> => {
    const chainable: Record<string, ReturnType<typeof vi.fn>> = {};
    chainable.eq = vi.fn().mockReturnValue(chainable);
    chainable.neq = vi.fn().mockReturnValue(chainable);
    chainable.single = vi.fn().mockResolvedValue({ data: null, error: null });
    chainable.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    chainable.order = vi.fn().mockReturnValue(chainable);
    chainable.limit = vi.fn().mockReturnValue(chainable);
    chainable.range = vi.fn().mockReturnValue(chainable);
    chainable.then = vi.fn((resolve) => resolve({ data: [], error: null }));
    chainable.select = vi.fn().mockReturnValue(chainable);
    return chainable;
  };

  const mockFrom = vi.fn((_table: string) => {
    const chainable = createChainable();
    return {
      select: vi.fn((_columns?: string) => chainable),
      insert: vi.fn((_data: unknown) => chainable),
      update: vi.fn((_data: unknown) => chainable),
      delete: vi.fn(() => chainable),
    };
  });

  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: mockUser } }, error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  };

  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
  }));

  return {
    from: mockFrom,
    auth: mockAuth,
    rpc: mockRpc,
    channel: mockChannel,
    removeChannel: vi.fn(),
  };
};

// SQL injection test payloads
export const sqlInjectionPayloads = [
  "'; DROP TABLE employees; --",
  "1' OR '1'='1",
  "1; SELECT * FROM auth.users; --",
  "admin'--",
  "' UNION SELECT * FROM user_roles WHERE '1'='1",
];

// XSS test payloads
export const xssPayloads = [
  "<script>alert('xss')</script>",
  "<img src=x onerror=alert('xss')>",
  "javascript:alert('xss')",
];
