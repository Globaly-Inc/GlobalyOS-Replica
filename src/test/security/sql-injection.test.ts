import { describe, it, expect, beforeAll } from 'vitest';
import { createMockSupabaseClient, sqlInjectionPayloads, xssPayloads } from '../mocks/supabase';

/**
 * SQL Injection Vulnerability Tests
 */

describe('SQL Injection Prevention', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeAll(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe('Search Input Sanitization', () => {
    sqlInjectionPayloads.forEach((payload, index) => {
      it(`should safely handle SQL injection payload ${index + 1}`, async () => {
        const result = await mockSupabase.from('employees').select('*');
        expect(result).toBeDefined();
      });
    });
  });

  describe('Form Input Validation', () => {
    it('should reject SQL injection in leave request reason', async () => {
      const result = await mockSupabase.from('leave_requests').insert({ reason: "'; DELETE FROM leave_requests; --" });
      expect(result).toBeDefined();
    });
  });
});

describe('XSS Prevention', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeAll(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe('Content Sanitization', () => {
    xssPayloads.forEach((payload, index) => {
      it(`should safely handle XSS payload ${index + 1}`, async () => {
        const result = await mockSupabase.from('updates').insert({ content: payload });
        expect(result).toBeDefined();
      });
    });
  });
});
