import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock all dependencies
vi.mock('@/services/useWfh', () => ({
  useEmployeeWorkLocation: vi.fn(),
  useHasApprovedWfhToday: vi.fn(),
}));

vi.mock('@/hooks/useMyOfficeAttendanceSettings', () => ({
  useMyOfficeAttendanceSettings: vi.fn(),
}));

import { useCheckInMethod } from '@/hooks/useCheckInMethod';
import { useEmployeeWorkLocation, useHasApprovedWfhToday } from '@/services/useWfh';
import { useMyOfficeAttendanceSettings } from '@/hooks/useMyOfficeAttendanceSettings';

const mockWorkLocation = useEmployeeWorkLocation as ReturnType<typeof vi.fn>;
const mockWfh = useHasApprovedWfhToday as ReturnType<typeof vi.fn>;
const mockSettings = useMyOfficeAttendanceSettings as ReturnType<typeof vi.fn>;

describe('useCheckInMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkLocation.mockReturnValue({ data: 'office' });
    mockWfh.mockReturnValue({ data: false });
    mockSettings.mockReturnValue({
      data: {
        office_checkin_methods: ['qr'],
        hybrid_checkin_methods: ['qr', 'remote'],
        remote_checkin_methods: ['remote'],
      },
    });
  });

  it('returns qr when no employeeId', () => {
    const { result } = renderHook(() => useCheckInMethod(null));
    expect(result.current).toBe('qr');
  });

  it('returns qr for office workers', () => {
    const { result } = renderHook(() => useCheckInMethod('emp-1'));
    expect(result.current).toBe('qr');
  });

  it('returns remote for remote workers', () => {
    mockWorkLocation.mockReturnValue({ data: 'remote' });
    const { result } = renderHook(() => useCheckInMethod('emp-1'));
    expect(result.current).toBe('remote');
  });

  it('returns remote for office workers with approved WFH', () => {
    mockWorkLocation.mockReturnValue({ data: 'office' });
    mockWfh.mockReturnValue({ data: true });
    const { result } = renderHook(() => useCheckInMethod('emp-1'));
    expect(result.current).toBe('remote');
  });

  it('returns choose for hybrid workers with both methods', () => {
    mockWorkLocation.mockReturnValue({ data: 'hybrid' });
    const { result } = renderHook(() => useCheckInMethod('emp-1'));
    expect(result.current).toBe('choose');
  });

  it('returns remote for hybrid workers with only remote methods', () => {
    mockWorkLocation.mockReturnValue({ data: 'hybrid' });
    mockSettings.mockReturnValue({
      data: {
        hybrid_checkin_methods: ['remote', 'remote_location'],
        office_checkin_methods: ['qr'],
        remote_checkin_methods: ['remote'],
      },
    });
    const { result } = renderHook(() => useCheckInMethod('emp-1'));
    expect(result.current).toBe('remote');
  });

  it('returns qr for hybrid workers with only office methods', () => {
    mockWorkLocation.mockReturnValue({ data: 'hybrid' });
    mockSettings.mockReturnValue({
      data: {
        hybrid_checkin_methods: ['qr', 'location'],
        office_checkin_methods: ['qr'],
        remote_checkin_methods: ['remote'],
      },
    });
    const { result } = renderHook(() => useCheckInMethod('emp-1'));
    expect(result.current).toBe('qr');
  });

  it('defaults hybrid to choose when settings not loaded', () => {
    mockWorkLocation.mockReturnValue({ data: 'hybrid' });
    mockSettings.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useCheckInMethod('emp-1'));
    // Falls back to default ['qr', 'remote'] which has both -> choose
    expect(result.current).toBe('choose');
  });
});
