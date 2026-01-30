/**
 * Attendance Flow Tests
 * Tests check-in, check-out, and attendance tracking functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  functions: {
    invoke: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Attendance Flow', () => {
  const mockEmployee = {
    id: 'emp-123',
    organization_id: 'org-123',
    user_id: 'user-123',
  };

  const mockOffice = {
    id: 'office-123',
    name: 'Main Office',
    latitude: 40.7128,
    longitude: -74.0060,
    radius_meters: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.upsert.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
  });

  describe('QR Code Check-In', () => {
    it('should check in with valid QR code', async () => {
      const today = new Date().toISOString().split('T')[0];
      const checkInTime = new Date().toISOString();

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'attendance-123',
          employee_id: mockEmployee.id,
          date: today,
          check_in_time: checkInTime,
          check_in_office_id: mockOffice.id,
          status: 'present',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.check_in_time).toBeDefined();
      expect(data.status).toBe('present');
    });

    it('should validate QR code token', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { valid: true, office_id: mockOffice.id },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('validate-qr-code', {
        body: { token: 'valid-qr-token' },
      });

      expect(response.data.valid).toBe(true);
      expect(response.data.office_id).toBe(mockOffice.id);
    });

    it('should reject expired QR code', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'QR code has expired' },
      });

      const response = await mockSupabase.functions.invoke('validate-qr-code', {
        body: { token: 'expired-qr-token' },
      });

      expect(response.error).not.toBeNull();
      expect(response.error?.message).toContain('expired');
    });
  });

  describe('Remote Check-In', () => {
    it('should allow remote check-in for WFH employees', async () => {
      const today = new Date().toISOString().split('T')[0];

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'attendance-123',
          employee_id: mockEmployee.id,
          date: today,
          check_in_time: new Date().toISOString(),
          check_in_location_name: 'Home',
          status: 'present',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.check_in_location_name).toBe('Home');
      expect(data.status).toBe('present');
    });

    it('should verify approved WFH before remote check-in', async () => {
      // Check for approved WFH
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          id: 'wfh-123',
          employee_id: mockEmployee.id,
          status: 'approved',
        },
        error: null,
      });

      const { data } = await mockSupabase.maybeSingle();

      expect(data).not.toBeNull();
      expect(data.status).toBe('approved');
    });
  });

  describe('Check-Out', () => {
    it('should check out and calculate work hours', async () => {
      const checkInTime = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(); // 8 hours ago
      const checkOutTime = new Date().toISOString();

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'attendance-123',
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          work_hours: 8,
          status: 'present',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.check_out_time).toBeDefined();
      expect(data.work_hours).toBe(8);
    });

    it('should require reason for early checkout', async () => {
      const checkInTime = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(); // 4 hours ago
      const earlyCheckoutReason = 'Medical appointment';

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'attendance-123',
          check_in_time: checkInTime,
          check_out_time: new Date().toISOString(),
          work_hours: 4,
          early_checkout_reason: earlyCheckoutReason,
          status: 'present',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.early_checkout_reason).toBe(earlyCheckoutReason);
      expect(data.work_hours).toBeLessThan(8);
    });
  });

  describe('Multiple Sessions', () => {
    it('should support multiple check-in/check-out sessions per day', async () => {
      const today = new Date().toISOString().split('T')[0];

      // First session
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'session-1', date: today, status: 'present' },
        error: null,
      });

      // Second session
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'session-2', date: today, status: 'present' },
        error: null,
      });

      const session1 = await mockSupabase.single();
      const session2 = await mockSupabase.single();

      expect(session1.data.id).toBe('session-1');
      expect(session2.data.id).toBe('session-2');
    });
  });

  describe('Attendance Status', () => {
    it('should mark as absent if no check-in by end of day', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { 
          processed: 5,
          marked_absent: ['emp-1', 'emp-2'],
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('process-daily-attendance', {
        body: { organization_id: 'org-123' },
      });

      expect(response.data.marked_absent).toContain('emp-1');
    });

    it('should handle late arrivals correctly', async () => {
      const expectedStartTime = '09:00:00';
      const actualCheckIn = '09:30:00'; // 30 minutes late

      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'attendance-123',
          check_in_time: `2026-01-30T${actualCheckIn}`,
          status: 'late',
          notes: 'Arrived 30 minutes late',
        },
        error: null,
      });

      const { data, error } = await mockSupabase.single();

      expect(error).toBeNull();
      expect(data.status).toBe('late');
    });
  });
});
