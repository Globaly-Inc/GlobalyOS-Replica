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
  const mockSelect = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  });
  
  const mockInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  
  const mockUpdate = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data: null, error: null }),
  });
  
  const mockDelete = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));

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
    _mocks: {
      mockFrom,
      mockSelect,
      mockInsert,
      mockUpdate,
      mockDelete,
      mockRpc,
    },
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
