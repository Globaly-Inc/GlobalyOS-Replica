/**
 * Employee Activity Timeline Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { 
  useEmployeeActivityTimeline, 
  useInfiniteEmployeeActivityTimeline,
  logEmployeeActivity 
} from '@/services/useEmployeeActivityTimeline';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Wrapper component for React Query
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => 
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

describe('useEmployeeActivityTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch when employeeId is empty', () => {
    renderHook(
      () => useEmployeeActivityTimeline({ employeeId: '' }),
      { wrapper: createWrapper() }
    );

    // Query is disabled when employeeId is empty, RPC should never be called
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('should fetch timeline events for valid employeeId', async () => {
    const mockEvents = [
      {
        event_id: '1',
        event_type: 'leave_approved',
        event_category: 'leave',
        title: 'Leave Approved',
        description: '2 days of annual leave',
        actor_id: 'user-1',
        actor_name: 'John Doe',
        actor_avatar: null,
        event_timestamp: '2026-01-15T10:00:00Z',
        metadata: {},
        access_level: 'manager',
      },
    ];

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: mockEvents,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useEmployeeActivityTimeline({ 
        employeeId: 'emp-123',
        limit: 50,
        offset: 0,
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEvents);
    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_employee_activity_timeline',
      expect.objectContaining({
        target_employee_id: 'emp-123',
        p_limit: 50,
        p_offset: 0,
      })
    );
  });

  it('should apply filters when provided', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [],
      error: null,
    } as any);

    const { result } = renderHook(
      () => useEmployeeActivityTimeline({
        employeeId: 'emp-123',
        filters: {
          eventTypes: ['leave_approved', 'leave_rejected'],
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        },
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'get_employee_activity_timeline',
      expect.objectContaining({
        p_event_types: ['leave_approved', 'leave_rejected'],
        p_start_date: '2026-01-01',
        p_end_date: '2026-01-31',
      })
    );
  });

  it('should handle RPC errors gracefully', async () => {
    const mockError = { message: 'Database error', code: 'PGRST001' };
    
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: mockError,
    } as any);

    const { result } = renderHook(
      () => useEmployeeActivityTimeline({ employeeId: 'emp-123' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe('useInfiniteEmployeeActivityTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle pagination correctly', async () => {
    const firstPageEvents = Array.from({ length: 50 }, (_, i) => ({
      event_id: `event-${i}`,
      event_type: 'attendance_checked_in',
      event_category: 'attendance',
      title: `Event ${i}`,
      description: null,
      actor_id: null,
      actor_name: null,
      actor_avatar: null,
      event_timestamp: new Date().toISOString(),
      metadata: null,
      access_level: 'manager',
    }));

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: firstPageEvents,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useInfiniteEmployeeActivityTimeline('emp-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // First page should have events
    expect(result.current.data?.pages[0].events).toHaveLength(50);
    
    // Should have next page since we got exactly 50 items
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should not have next page when fewer than 50 events returned', async () => {
    const partialPageEvents = Array.from({ length: 25 }, (_, i) => ({
      event_id: `event-${i}`,
      event_type: 'kudos_received',
      event_category: 'recognition',
      title: `Kudos ${i}`,
      description: null,
      actor_id: null,
      actor_name: null,
      actor_avatar: null,
      event_timestamp: new Date().toISOString(),
      metadata: null,
      access_level: 'public',
    }));

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: partialPageEvents,
      error: null,
    } as any);

    const { result } = renderHook(
      () => useInfiniteEmployeeActivityTimeline('emp-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should NOT have next page since we got fewer than 50 items
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('logEmployeeActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should insert activity log record', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    await logEmployeeActivity({
      userId: 'user-123',
      organizationId: 'org-456',
      activityType: 'document_uploaded',
      entityType: 'document',
      entityId: 'doc-789',
      metadata: { filename: 'test.pdf' },
    });

    expect(supabase.from).toHaveBeenCalledWith('user_activity_logs');
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-123',
        organization_id: 'org-456',
        activity_type: 'document_uploaded',
        entity_type: 'document',
        entity_id: 'doc-789',
        metadata: { filename: 'test.pdf' },
      }),
    ]);
  });

  it('should not throw on insert error (non-fatal)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockRejectedValue(new Error('Insert failed')),
    } as any);

    // Should not throw
    await expect(
      logEmployeeActivity({
        userId: 'user-123',
        organizationId: 'org-456',
        activityType: 'test_event',
      })
    ).resolves.not.toThrow();

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
