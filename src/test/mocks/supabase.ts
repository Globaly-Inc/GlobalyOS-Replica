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

// Result type
interface MockResult {
  data: unknown[] | null;
  error: null;
}

// Thenable mock type that allows chaining
interface ChainableMock extends PromiseLike<MockResult> {
  eq: (col: string, val: unknown) => ChainableMock;
  neq: (col: string, val: unknown) => ChainableMock;
  single: () => Promise<{ data: null; error: null }>;
  maybeSingle: () => Promise<{ data: null; error: null }>;
  order: (col: string, opts?: unknown) => ChainableMock;
  limit: (n: number) => ChainableMock;
  range: (start: number, end: number) => ChainableMock;
  ilike: (col: string, pattern: string) => ChainableMock;
  select: (cols?: string) => ChainableMock;
}

// Create a chainable mock that is also thenable (like Supabase queries)
const createChainable = (): ChainableMock => {
  const result: MockResult = { data: [], error: null };
  
  const chainable: ChainableMock = {
    eq: (_col: string, _val: unknown) => chainable,
    neq: (_col: string, _val: unknown) => chainable,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    order: (_col: string, _opts?: unknown) => chainable,
    limit: (_n: number) => chainable,
    range: (_start: number, _end: number) => chainable,
    ilike: (_col: string, _pattern: string) => chainable,
    select: (_cols?: string) => chainable,
    then: <TResult1 = MockResult, TResult2 = never>(
      onfulfilled?: ((value: MockResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> => {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }
  };
  
  return chainable;
};

// Create mock Supabase client
export const createMockSupabaseClient = () => {
  const mockFrom = (_table: string) => {
    const chainable = createChainable();
    return {
      select: (_columns?: string) => chainable,
      insert: (_data: unknown) => chainable,
      update: (_data: unknown) => chainable,
      delete: () => chainable,
    };
  };

  const mockAuth = {
    getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: { user: mockUser } }, error: null })),
    signInWithOtp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  };

  // Mock rpc that accepts function name and optional params
  const mockRpc = (_funcName: string, _params?: Record<string, unknown>) => {
    return Promise.resolve({ data: null, error: null });
  };

  const mockChannel = vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
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
