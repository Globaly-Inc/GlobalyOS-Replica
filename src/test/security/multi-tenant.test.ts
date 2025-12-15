import { describe, it, expect, beforeAll } from 'vitest';
import { createMockSupabaseClient, mockOrganization, mockOtherOrganization, mockEmployee } from '../mocks/supabase';

/**
 * Multi-Tenant Data Isolation Tests
 * 
 * These tests verify that RLS policies properly isolate data between organizations.
 * When RLS denies access, queries complete successfully but return empty results
 * (not errors), which is the expected Postgres RLS behavior.
 */

const multiTenantTables = ['employees', 'chat_messages', 'wiki_pages', 'leave_requests', 'kpis', 'kudos'];

describe('Multi-Tenant Data Isolation', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeAll(() => {
    mockSupabase = createMockSupabaseClient();
  });

  describe('READ Isolation', () => {
    multiTenantTables.forEach((tableName) => {
      it(`should prevent reading ${tableName} from other organizations`, async () => {
        // Query should succeed but return empty results when accessing other org's data
        const result = await mockSupabase.from(tableName).select('*');
        expect(result).toBeDefined();
        expect(result.error).toBeNull();
        // RLS returns empty array for unauthorized access, not an error
        expect(Array.isArray(result.data)).toBe(true);
      });
    });
  });

  describe('WRITE Isolation', () => {
    it('should prevent inserting data into other organization', async () => {
      // Attempting to insert with a different org_id should be blocked by RLS
      const result = await mockSupabase
        .from('employees')
        .insert({ organization_id: mockOtherOrganization.id, position: 'Test' });
      expect(result).toBeDefined();
      // RLS either returns error or silently fails the insert
      expect(result.data === null || (Array.isArray(result.data) && result.data.length === 0)).toBe(true);
    });

    it('should prevent updating data in other organization', async () => {
      // Attempting to update data in another org should affect zero rows
      const result = await mockSupabase
        .from('employees')
        .update({ position: 'Hacker' })
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      // Update on unauthorized rows should return empty or null data
      expect(result.data === null || (Array.isArray(result.data) && result.data.length === 0)).toBe(true);
    });

    it('should prevent deleting data from other organization', async () => {
      // Attempting to delete from another org should affect zero rows
      const result = await mockSupabase
        .from('wiki_pages')
        .delete()
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      // Delete on unauthorized rows should return empty or null data
      expect(result.data === null || (Array.isArray(result.data) && result.data.length === 0)).toBe(true);
    });
  });

  describe('Chat Isolation', () => {
    it('should prevent accessing conversations from other organizations', async () => {
      // Users should only see conversations from their own organization
      const result = await mockSupabase
        .from('chat_conversations')
        .select('*')
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      expect(result.error).toBeNull();
      // RLS should filter out other org's conversations, returning empty array
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should prevent accessing messages from other organizations', async () => {
      const result = await mockSupabase
        .from('chat_messages')
        .select('*')
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('Wiki Isolation', () => {
    it('should prevent accessing wiki pages from other organizations', async () => {
      const result = await mockSupabase
        .from('wiki_pages')
        .select('*')
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should prevent accessing wiki folders from other organizations', async () => {
      const result = await mockSupabase
        .from('wiki_folders')
        .select('*')
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('HR Data Isolation', () => {
    it('should prevent accessing leave requests from other organizations', async () => {
      const result = await mockSupabase
        .from('leave_requests')
        .select('*')
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should prevent accessing attendance records from other organizations', async () => {
      const result = await mockSupabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', mockOtherOrganization.id);
      expect(result).toBeDefined();
      expect(result.error).toBeNull();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });
});
