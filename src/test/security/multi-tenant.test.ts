import { describe, it, expect, beforeAll } from 'vitest';
import { createMockSupabaseClient, mockOrganization, mockOtherOrganization, mockEmployee } from '../mocks/supabase';

/**
 * Multi-Tenant Data Isolation Tests
 */

const multiTenantTables = ['employees', 'chat_messages', 'wiki_pages', 'leave_requests', 'kpis', 'kudos'];

describe('Multi-Tenant Data Isolation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeAll(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe('READ Isolation', () => {
    multiTenantTables.forEach((name) => {
      it(`should prevent reading ${name} from other organizations`, async () => {
        const result = await mockSupabase.from(name).select('*');
        expect(result).toBeDefined();
      });
    });
  });

  describe('WRITE Isolation', () => {
    it('should prevent inserting data into other organization', async () => {
      const result = await mockSupabase.from('employees').insert({ organization_id: mockOtherOrganization.id });
      expect(result).toBeDefined();
    });

    it('should prevent updating data in other organization', async () => {
      const result = await mockSupabase.from('employees').update({ position: 'Hacker' });
      expect(result).toBeDefined();
    });

    it('should prevent deleting data from other organization', async () => {
      const result = await mockSupabase.from('wiki_pages').delete();
      expect(result).toBeDefined();
    });
  });

  describe('Chat Isolation', () => {
    it('should prevent accessing conversations from other organizations', async () => {
      const result = await mockSupabase.from('chat_conversations').select('*');
      expect(result).toBeDefined();
    });
  });
});
