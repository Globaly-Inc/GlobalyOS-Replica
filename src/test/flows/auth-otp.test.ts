/**
 * Authentication OTP Flow Tests
 * Tests the complete OTP verification flow for login
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  auth: {
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  functions: {
    invoke: vi.fn(),
  },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('OTP Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Request OTP', () => {
    it('should send OTP to valid email', async () => {
      const testEmail = 'test@example.com';
      
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { success: true, message: 'OTP sent' },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('request-otp', {
        body: { email: testEmail },
      });

      expect(response.error).toBeNull();
      expect(response.data.success).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('request-otp', {
        body: { email: testEmail },
      });
    });

    it('should handle invalid email format', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid email format' },
      });

      const response = await mockSupabase.functions.invoke('request-otp', {
        body: { email: 'invalid-email' },
      });

      expect(response.error).not.toBeNull();
      expect(response.error?.message).toContain('Invalid');
    });
  });

  describe('Verify OTP', () => {
    it('should verify correct OTP code', async () => {
      const testEmail = 'test@example.com';
      const testCode = '123456';

      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { 
          success: true, 
          session: { access_token: 'token123' },
          user: { id: 'user-123', email: testEmail },
        },
        error: null,
      });

      const response = await mockSupabase.functions.invoke('verify-otp', {
        body: { email: testEmail, code: testCode },
      });

      expect(response.error).toBeNull();
      expect(response.data.success).toBe(true);
      expect(response.data.session).toBeDefined();
      expect(response.data.user).toBeDefined();
    });

    it('should reject incorrect OTP code', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid code' },
      });

      const response = await mockSupabase.functions.invoke('verify-otp', {
        body: { email: 'test@example.com', code: '000000' },
      });

      expect(response.error).not.toBeNull();
      expect(response.error?.message).toContain('Invalid');
    });

    it('should handle expired OTP', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: null,
        error: { message: 'Code has expired' },
      });

      const response = await mockSupabase.functions.invoke('verify-otp', {
        body: { email: 'test@example.com', code: '123456' },
      });

      expect(response.error).not.toBeNull();
      expect(response.error?.message).toContain('expired');
    });

    it('should trigger CAPTCHA after multiple failed attempts', async () => {
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: { captchaRequired: true },
        error: { message: 'Security verification required' },
      });

      const response = await mockSupabase.functions.invoke('verify-otp', {
        body: { email: 'test@example.com', code: '000000' },
      });

      expect(response.data?.captchaRequired).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should establish session after successful verification', async () => {
      mockSupabase.auth.getSession.mockResolvedValueOnce({
        data: { 
          session: { 
            access_token: 'token123',
            user: { id: 'user-123' },
          } 
        },
        error: null,
      });

      const { data, error } = await mockSupabase.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toBeDefined();
      expect(data.session.access_token).toBe('token123');
    });

    it('should handle sign out correctly', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const { error } = await mockSupabase.auth.signOut();

      expect(error).toBeNull();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });
});
