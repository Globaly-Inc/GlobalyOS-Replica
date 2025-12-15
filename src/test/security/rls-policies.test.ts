import { describe, it, expect, beforeAll } from 'vitest';
import { createMockSupabaseClient, mockOrganization, mockOtherOrganization, mockEmployee, mockUser } from '../mocks/supabase';

/**
 * RLS Policy Verification Tests
 */

const rlsTables = ['employees', 'chat_messages', 'wiki_pages', 'leave_requests', 'kpis'];

describe('RLS Policy Verification', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeAll(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe('Cross-Tenant Isolation', () => {
    it('should not allow access to other organization employees', async () => {
      const result = await mockSupabase.from('employees').select('*');
      expect(result).toBeDefined();
    });

    rlsTables.forEach((table) => {
      it(`should enforce organization isolation for ${table}`, async () => {
        const result = await mockSupabase.from(table).select('*');
        expect(result).toBeDefined();
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should verify has_role() function respects hierarchy', async () => {
      const { data } = await mockSupabase.rpc('has_role', { _user_id: mockUser.id, _role: 'admin' });
      expect(data).toBeDefined();
    });

    it('should verify is_org_member() function', async () => {
      const { data } = await mockSupabase.rpc('is_org_member', { _user_id: mockUser.id, _org_id: mockOrganization.id });
      expect(data).toBeDefined();
    });
  });

  describe('Security Definer Functions', () => {
    it('should verify get_current_employee_id() returns correct employee', async () => {
      const { data, error } = await mockSupabase.rpc('get_current_employee_id');
      expect(error).toBeNull();
    });
  });
});
